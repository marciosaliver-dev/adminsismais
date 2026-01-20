import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, 
  TrendingUp, 
  Target, 
  History,
  AlertCircle,
  Activity
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissoesRadar } from "@/hooks/usePermissoesRadar";
import { ProgressBar } from "./ProgressBar";
import { KREvolutionChart } from "./KREvolutionChart";
import { KRHistoryTable } from "./KRHistoryTable";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface KRDetailModalProps {
  krId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Ícone auxiliar
function Sparkles(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}

export function KRDetailModal({ krId, isOpen, onClose, onSuccess }: KRDetailModalProps) {
  const { user } = useAuth();
  const { podeGerenciarOKRs, membroAtual } = usePermissoesRadar();
  const queryClient = useQueryClient();
  
  const [mostrarTudo, setMostrarTudo] = useState(false);
  const [dataLancamento, setDataLancamento] = useState(format(new Date(), "yyyy-MM-dd"));
  const [valorLancamento, setValorLancamento] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: kr, isLoading: loadingKR } = useQuery({
    queryKey: ["kr-detail", krId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("key_results")
        .select(`
          *,
          objetivo:objetivos_okr(
            titulo,
            ciclo:ciclos_okr(nome, data_inicio, data_fim)
          ),
          responsavel:membros_radar!key_results_responsavel_id_fkey(id, nome, avatar_url, user_id)
        `)
        .eq("id", krId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!krId,
  });

  const { data: cache } = useQuery({
    queryKey: ["kr-cache", krId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculos_kr_cache")
        .select("*")
        .eq("kr_id", krId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!krId,
  });

  const { data: historico = [], isLoading: loadingHist } = useQuery({
    queryKey: ["kr-history", krId, mostrarTudo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('buscar_historico_kr', { kr_uuid: krId });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!krId,
  });

  const podeLancar = podeGerenciarOKRs || kr?.responsavel_id === membroAtual?.id;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!membroAtual) throw new Error("Usuário não identificado");
      const { error } = await supabase.from("lancamentos_kr").insert({
        kr_id: krId,
        data: dataLancamento,
        valor: parseFloat(valorLancamento),
        observacao: observacao || null,
        lancado_por_id: membroAtual.user_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Lançamento realizado com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["kr-cache", krId] });
      queryClient.invalidateQueries({ queryKey: ["kr-history", krId] });
      queryClient.invalidateQueries({ queryKey: ["radar-dashboard-data"] });
      setValorLancamento("");
      setObservacao("");
      onSuccess?.();
    },
    onError: (error: any) => {
      const msg = error.code === '23505' ? "Já existe um lançamento para esta data." : "Erro ao salvar lançamento.";
      toast({ variant: "destructive", title: "Erro", description: msg });
    }
  });

  const previewProgresso = useMemo(() => {
    if (!kr || !valorLancamento) return null;
    const novoValor = parseFloat(valorLancamento);
    if (isNaN(novoValor)) return null;

    let prog = 0;
    if (kr.tipo_meta === 'Crescer') {
      prog = ((novoValor - kr.baseline) / (kr.meta - kr.baseline)) * 100;
    } else if (kr.tipo_meta === 'Reduzir') {
      prog = ((kr.baseline - novoValor) / (kr.baseline - kr.meta)) * 100;
    } else {
      prog = (novoValor / kr.meta) * 100;
    }
    return Math.max(0, prog);
  }, [kr, valorLancamento]);

  if (loadingKR) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="space-y-1">
            <DialogTitle className="text-2xl font-bold">{kr?.titulo}</DialogTitle>
            <DialogDescription className="font-medium text-primary">
              Objetivo: {kr?.objetivo?.titulo}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-6">
            <Card className="bg-secondary/5 border-secondary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Target className="w-4 h-4" /> Resumo do KR
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Meta</p>
                    <p className="text-lg font-bold">{kr?.meta.toLocaleString()} {kr?.unidade}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Atual</p>
                    <p className="text-lg font-bold text-primary">{cache?.valor_atual?.toLocaleString()} {kr?.unidade}</p>
                  </div>
                </div>
                
                <ProgressBar progresso={cache?.progresso_percentual || 0} status={cache?.status || "Crítico"} showLabel height="lg" />
                
                <div className="flex items-center gap-3 pt-2 border-t border-dashed">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={kr?.responsavel?.avatar_url || ""} />
                    <AvatarFallback>{kr?.responsavel?.nome?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Responsável</p>
                    <p className="text-sm font-medium">{kr?.responsavel?.nome}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Análise de Ritmo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Tempo decorrido ({cache?.dias_decorridos || 0}/{cache?.dias_totais || 0} dias)</span>
                    <span className="font-bold">{((cache?.dias_decorridos || 0) / (cache?.dias_totais || 1) * 100).toFixed(0)}%</span>
                  </div>
                  <ProgressBar progresso={((cache?.dias_decorridos || 0) / (cache?.dias_totais || 1) * 100)} height="sm" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Progresso Esperado</p>
                    <p className="font-bold">{cache?.progresso_esperado?.toFixed(1)}%</p>
                  </div>
                  <div className={cn("p-3 rounded-xl", (cache?.desvio || 0) >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    <p className="text-xs opacity-70 mb-1">Desvio</p>
                    <p className="font-bold">{cache?.desvio ? (cache.desvio > 0 ? `+${cache.desvio.toFixed(1)}` : cache.desvio.toFixed(1)) : 0}%</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground mb-1 font-bold uppercase">Ritmo Necessário</p>
                  <p className="text-base font-bold text-secondary">
                    {cache?.status === "Atingido" ? "Meta já atingida! 🎉" : 
                      `${kr?.tipo_meta === 'Crescer' ? 'Faltam' : 'Reduzir'} ${Math.abs(cache?.ritmo_necessario || 0).toFixed(2)} por dia`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {podeLancar ? (
              <Card className="border-primary/20 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <History className="w-4 h-4" /> Lançar Novo Dado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase">Data</Label>
                      <Input type="date" value={dataLancamento} onChange={e => setDataLancamento(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase">Valor ({kr?.unidade})</Label>
                      <Input type="number" value={valorLancamento} onChange={e => setValorLancamento(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase">Observação</Label>
                    <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional..." rows={2} />
                  </div>

                  {previewProgresso !== null && (
                    <div className="animate-in fade-in slide-in-from-top-1 bg-muted p-3 rounded-lg border border-dashed">
                      <p className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Preview
                      </p>
                      <p className="text-sm">Novo progresso será: <span className="font-bold text-primary">{previewProgresso.toFixed(1)}%</span></p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={() => { setValorLancamento(""); setObservacao(""); }}>Limpar</Button>
                    <Button onClick={() => mutation.mutate()} disabled={!valorLancamento || mutation.isPending}>
                      {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="p-8 text-center bg-muted/20 border-2 border-dashed rounded-3xl">
                <AlertCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Apenas o responsável ou gestores podem realizar lançamentos.</p>
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Evolução
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <KREvolutionChart 
                  data={historico.map((h: any) => ({ data: h.data, valor: h.valor }))} 
                  meta={kr?.meta || 0} 
                  unidade={kr?.unidade || ""} 
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Histórico de Lançamentos
            </h3>
            <div className="flex items-center space-x-2">
              <Switch id="history-filter" checked={mostrarTudo} onCheckedChange={setMostrarTudo} />
              <Label htmlFor="history-filter" className="text-xs cursor-pointer">Mostrar todos os ciclos</Label>
            </div>
          </div>

          {loadingHist ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <KRHistoryTable 
              historico={mostrarTudo ? historico : historico.filter((h: any) => h.kr_id === krId)} 
              tipoMeta={kr?.tipo_meta || "Crescer"}
              baseline={kr?.baseline || 0}
              meta={kr?.meta || 0}
              unidade={kr?.unidade || ""}
              mostrarCiclo={mostrarTudo}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}