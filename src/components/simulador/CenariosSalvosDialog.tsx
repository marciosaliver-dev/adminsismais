import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Loader2,
  Save,
  FolderOpen,
  Trash2,
  CalendarIcon,
  TrendingUp,
  Target,
  DollarSign,
  Clock,
} from "lucide-react";

interface SimulacaoMeta {
  id: string;
  nome: string;
  descricao: string | null;
  mrr_atual: number;
  mrr_meta: number;
  data_meta: string | null;
  ticket_medio: number;
  churn_mensal: number;
  taxa_conversao: number;
  custo_por_lead: number;
  leads_vendedor_mes: number;
  custo_fixo_vendedor: number;
  comissao_venda: number;
  vendedores_atuais: number;
  ltv_meses: number;
  clientes_ativos: number;
  receita_necessaria: number | null;
  novas_vendas: number | null;
  leads_necessarios: number | null;
  vendedores_necessarios: number | null;
  custo_total: number | null;
  roi: number | null;
  payback_meses: number | null;
  ltv_cac_ratio: number | null;
  analise_ia: string | null;
  created_at: string;
  updated_at: string;
}

interface SimuladorInputs {
  mrrAtual: number;
  mrrMeta: number;
  dataMeta: Date | undefined;
  ticketMedio: number;
  churnMensal: number;
  taxaConversao: number;
  custoPorLead: number;
  leadsVendedorMes: number;
  custoFixoVendedor: number;
  comissaoVenda: number;
  vendedoresAtuais: number;
  ltvMeses: number;
  clientesAtivos: number;
}

interface SimuladorOutputs {
  receitaNecessaria: number;
  novasVendas: number;
  leadsNecessarios: number;
  vendedoresNecessarios: number;
  custoTotal: number;
  roi: number;
  paybackMeses: number;
  ltvCacRatio: number;
}

interface CenariosSalvosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "save" | "load";
  inputs: SimuladorInputs;
  outputs: Partial<SimuladorOutputs>;
  aiAnalysis?: string | null;
  onLoad: (simulacao: SimulacaoMeta) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function CenariosSalvosDialog({
  open,
  onOpenChange,
  mode,
  inputs,
  outputs,
  aiAnalysis,
  onLoad,
}: CenariosSalvosDialogProps) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: simulacoes = [], isLoading } = useQuery({
    queryKey: ["simulacoes-meta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulacoes_meta")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SimulacaoMeta[];
    },
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = {
        user_id: user.id,
        nome,
        descricao: descricao || null,
        mrr_atual: inputs.mrrAtual,
        mrr_meta: inputs.mrrMeta,
        data_meta: inputs.dataMeta?.toISOString().split("T")[0] || null,
        ticket_medio: inputs.ticketMedio,
        churn_mensal: inputs.churnMensal,
        taxa_conversao: inputs.taxaConversao,
        custo_por_lead: inputs.custoPorLead,
        leads_vendedor_mes: inputs.leadsVendedorMes,
        custo_fixo_vendedor: inputs.custoFixoVendedor,
        comissao_venda: inputs.comissaoVenda,
        vendedores_atuais: inputs.vendedoresAtuais,
        ltv_meses: inputs.ltvMeses,
        clientes_ativos: inputs.clientesAtivos,
        receita_necessaria: outputs.receitaNecessaria || null,
        novas_vendas: outputs.novasVendas || null,
        leads_necessarios: outputs.leadsNecessarios || null,
        vendedores_necessarios: outputs.vendedoresNecessarios || null,
        custo_total: outputs.custoTotal || null,
        roi: outputs.roi || null,
        payback_meses: outputs.paybackMeses || null,
        ltv_cac_ratio: outputs.ltvCacRatio || null,
        analise_ia: aiAnalysis || null,
      };

      const { error } = await supabase.from("simulacoes_meta").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulacoes-meta"] });
      toast({ title: "✅ Cenário salvo!", description: `"${nome}" foi salvo com sucesso.` });
      setNome("");
      setDescricao("");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Erro ao salvar:", error);
      toast({ title: "Erro ao salvar", description: "Não foi possível salvar o cenário.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("simulacoes_meta").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulacoes-meta"] });
      toast({ title: "Cenário excluído", description: "O cenário foi removido com sucesso." });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir", description: "Não foi possível excluir o cenário.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!nome.trim()) {
      toast({ title: "Nome obrigatório", description: "Dê um nome para o cenário.", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  const handleLoad = (simulacao: SimulacaoMeta) => {
    onLoad(simulacao);
    onOpenChange(false);
    toast({ title: "Cenário carregado", description: `"${simulacao.nome}" foi carregado.` });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === "save" ? (
                <>
                  <Save className="w-5 h-5 text-primary" />
                  Salvar Cenário
                </>
              ) : (
                <>
                  <FolderOpen className="w-5 h-5 text-primary" />
                  Carregar Cenário
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {mode === "save"
                ? "Salve esta simulação para consultar depois"
                : "Selecione um cenário salvo para carregar"}
            </DialogDescription>
          </DialogHeader>

          {mode === "save" ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Cenário *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Meta Q1 2026 - Cenário Conservador"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição (opcional)</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva os principais pontos deste cenário..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                />
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">MRR Meta:</span>
                    <span className="font-medium">{formatCurrency(inputs.mrrMeta)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    <span className="text-muted-foreground">ROI:</span>
                    <span className="font-medium">{(outputs.roi || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-muted-foreground">Novas vendas:</span>
                    <span className="font-medium">{outputs.novasVendas || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-muted-foreground">Payback:</span>
                    <span className="font-medium">{outputs.paybackMeses || 0} meses</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px] pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : simulacoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum cenário salvo ainda</p>
                  <p className="text-sm">Salve sua primeira simulação para visualizar aqui</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {simulacoes.map((sim) => (
                    <Card
                      key={sim.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleLoad(sim)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold truncate">{sim.nome}</h4>
                              {sim.analise_ia && (
                                <Badge variant="secondary" className="text-xs">
                                  IA
                                </Badge>
                              )}
                            </div>
                            {sim.descricao && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {sim.descricao}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                Meta: {formatCurrency(Number(sim.mrr_meta))}
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                ROI: {(Number(sim.roi) || 0).toFixed(0)}%
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {format(new Date(sim.created_at), "dd/MM/yy", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(sim.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {mode === "save" && (
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Salvar Cenário
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cenário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cenário será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
