import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Calendar, Target, Users, TrendingUp, Settings2, ChevronRight, Copy, UserCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type FaixaComissao = Tables<"faixa_comissao">;

interface MetaMensal {
  id: string;
  mes_referencia: string;
  meta_mrr: number;
  meta_quantidade: number;
  observacao: string | null;
  bonus_meta_equipe: number;
  bonus_meta_empresa: number;
  num_colaboradores: number;
  multiplicador_anual: number;
  comissao_venda_unica: number;
  ltv_medio: number;
  assinaturas_inicio_mes: number;
  limite_churn: number;
  limite_cancelamentos: number;
  percentual_bonus_churn: number;
  percentual_bonus_retencao: number;
  colaboradores_bonus_meta: string[] | null;
  created_at: string;
  updated_at: string;
}

interface Colaborador {
  id: string;
  nome: string;
  cargo: string | null;
  ativo: boolean;
  eh_vendedor_direto: boolean | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value}%`;
};

const formatMonthYear = (dateStr: string) => {
  try {
    const date = new Date(dateStr + "T00:00:00");
    return format(date, "MMMM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

export default function ConfiguracoesComissao() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("metas");
  
  // Faixa states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingFaixa, setEditingFaixa] = useState<FaixaComissao | null>(null);
  const [deletingFaixa, setDeletingFaixa] = useState<FaixaComissao | null>(null);
  const [faixaForm, setFaixaForm] = useState({
    nome: "",
    mrr_min: 0,
    mrr_max: null as number | null,
    percentual: 0,
    ordem: 0,
  });

  // Meta mensal state
  const [isMetaDialogOpen, setIsMetaDialogOpen] = useState(false);
  const [isDeleteMetaDialogOpen, setIsDeleteMetaDialogOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaMensal | null>(null);
  const [deletingMeta, setDeletingMeta] = useState<MetaMensal | null>(null);
  const [metaFormStep, setMetaFormStep] = useState<1 | 2 | 3>(1);
  const [metaForm, setMetaForm] = useState({
    mes_referencia: "",
    meta_mrr: 0,
    meta_quantidade: 0,
    observacao: "",
    bonus_meta_equipe: 10,
    bonus_meta_empresa: 10,
    num_colaboradores: 12,
    multiplicador_anual: 2,
    comissao_venda_unica: 10,
    ltv_medio: 6,
    assinaturas_inicio_mes: 0,
    limite_churn: 5,
    limite_cancelamentos: 50,
    percentual_bonus_churn: 3,
    percentual_bonus_retencao: 3,
    colaboradores_bonus_meta: [] as string[],
    todos_colaboradores_participam: true,
  });

  // Fetch faixas
  const { data: faixas = [], isLoading: loadingFaixas } = useQuery({
    queryKey: ["faixas_comissao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faixa_comissao")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as FaixaComissao[];
    },
  });

  // Fetch metas mensais
  const { data: metasMensais = [], isLoading: loadingMetas } = useQuery({
    queryKey: ["metas_mensais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_mensal")
        .select("*")
        .order("mes_referencia", { ascending: false });
      if (error) throw error;
      return data as MetaMensal[];
    },
  });

  // Fetch colaboradores ativos
  const { data: colaboradoresAtivos = [] } = useQuery({
    queryKey: ["colaboradores-ativos-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo, ativo, eh_vendedor_direto")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as Colaborador[];
    },
  });

  // Create/Update faixa mutation
  const faixaMutation = useMutation({
    mutationFn: async () => {
      if (editingFaixa) {
        const { error } = await supabase
          .from("faixa_comissao")
          .update({
            nome: faixaForm.nome,
            mrr_min: faixaForm.mrr_min,
            mrr_max: faixaForm.mrr_max,
            percentual: faixaForm.percentual,
            ordem: faixaForm.ordem,
            ativo: true,
          })
          .eq("id", editingFaixa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faixa_comissao").insert([{
          nome: faixaForm.nome,
          mrr_min: faixaForm.mrr_min,
          mrr_max: faixaForm.mrr_max,
          percentual: faixaForm.percentual,
          ordem: faixaForm.ordem,
          ativo: true,
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faixas_comissao"] });
      setIsDialogOpen(false);
      resetFaixaForm();
      toast({
        title: "Sucesso!",
        description: editingFaixa
          ? "Faixa atualizada com sucesso."
          : "Faixa criada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar a faixa.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Delete faixa mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: usedFaixas } = await supabase
        .from("comissao_calculada")
        .select("id")
        .eq("faixa_nome", deletingFaixa?.nome)
        .limit(1);

      if (usedFaixas && usedFaixas.length > 0) {
        throw new Error("Esta faixa está sendo usada em comissões calculadas.");
      }

      const { error } = await supabase.from("faixa_comissao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faixas_comissao"] });
      setIsDeleteDialogOpen(false);
      setDeletingFaixa(null);
      toast({
        title: "Sucesso!",
        description: "Faixa excluída com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao excluir a faixa.",
        variant: "destructive",
      });
    },
  });

  // Create/Update meta mensal mutation
  const metaMutation = useMutation({
    mutationFn: async () => {
      const metaData = {
        mes_referencia: metaForm.mes_referencia,
        meta_mrr: metaForm.meta_mrr,
        meta_quantidade: metaForm.meta_quantidade,
        observacao: metaForm.observacao || null,
        bonus_meta_equipe: metaForm.bonus_meta_equipe,
        bonus_meta_empresa: metaForm.bonus_meta_empresa,
        num_colaboradores: metaForm.num_colaboradores,
        multiplicador_anual: metaForm.multiplicador_anual,
        comissao_venda_unica: metaForm.comissao_venda_unica,
        ltv_medio: metaForm.ltv_medio,
        assinaturas_inicio_mes: metaForm.assinaturas_inicio_mes,
        limite_churn: metaForm.limite_churn,
        limite_cancelamentos: metaForm.limite_cancelamentos,
        percentual_bonus_churn: metaForm.percentual_bonus_churn,
        percentual_bonus_retencao: metaForm.percentual_bonus_retencao,
        colaboradores_bonus_meta: metaForm.todos_colaboradores_participam ? null : metaForm.colaboradores_bonus_meta,
      };
      if (editingMeta) {
        const { error } = await supabase
          .from("meta_mensal")
          .update(metaData)
          .eq("id", editingMeta.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("meta_mensal").insert([metaData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas_mensais"] });
      setIsMetaDialogOpen(false);
      resetMetaForm();
      toast({
        title: "Sucesso!",
        description: editingMeta
          ? "Meta mensal atualizada com sucesso."
          : "Meta mensal criada com sucesso.",
      });
    },
    onError: (error: any) => {
      const isDuplicate = error?.message?.includes("duplicate") || error?.code === "23505";
      toast({
        title: "Erro",
        description: isDuplicate 
          ? "Já existe uma meta para este mês." 
          : "Ocorreu um erro ao salvar a meta mensal.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Delete meta mensal mutation
  const deleteMetaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meta_mensal").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas_mensais"] });
      setIsDeleteMetaDialogOpen(false);
      setDeletingMeta(null);
      toast({
        title: "Sucesso!",
        description: "Meta mensal excluída com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao excluir a meta mensal.",
        variant: "destructive",
      });
    },
  });

  const resetFaixaForm = () => {
    setFaixaForm({ nome: "", mrr_min: 0, mrr_max: null, percentual: 0, ordem: 0 });
    setEditingFaixa(null);
  };

  const resetMetaForm = () => {
    setMetaForm({ 
      mes_referencia: "", 
      meta_mrr: 0, 
      meta_quantidade: 0, 
      observacao: "",
      bonus_meta_equipe: 10,
      bonus_meta_empresa: 10,
      num_colaboradores: 12,
      multiplicador_anual: 2,
      comissao_venda_unica: 10,
      ltv_medio: 6,
      assinaturas_inicio_mes: 0,
      limite_churn: 5,
      limite_cancelamentos: 50,
      percentual_bonus_churn: 3,
      percentual_bonus_retencao: 3,
      colaboradores_bonus_meta: [],
      todos_colaboradores_participam: true,
    });
    setEditingMeta(null);
    setMetaFormStep(1);
  };

  const openEditDialog = (faixa: FaixaComissao) => {
    setEditingFaixa(faixa);
    setFaixaForm({
      nome: faixa.nome,
      mrr_min: faixa.mrr_min,
      mrr_max: faixa.mrr_max,
      percentual: faixa.percentual,
      ordem: faixa.ordem,
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (faixa: FaixaComissao) => {
    setDeletingFaixa(faixa);
    setIsDeleteDialogOpen(true);
  };

  const openEditMetaDialog = (meta: MetaMensal) => {
    setEditingMeta(meta);
    const hasCustomParticipants = meta.colaboradores_bonus_meta && meta.colaboradores_bonus_meta.length > 0;
    setMetaForm({
      mes_referencia: meta.mes_referencia,
      meta_mrr: meta.meta_mrr,
      meta_quantidade: meta.meta_quantidade,
      observacao: meta.observacao || "",
      bonus_meta_equipe: meta.bonus_meta_equipe,
      bonus_meta_empresa: meta.bonus_meta_empresa,
      num_colaboradores: meta.num_colaboradores,
      multiplicador_anual: meta.multiplicador_anual,
      comissao_venda_unica: meta.comissao_venda_unica,
      ltv_medio: meta.ltv_medio || 6,
      assinaturas_inicio_mes: meta.assinaturas_inicio_mes || 0,
      limite_churn: meta.limite_churn || 5,
      limite_cancelamentos: meta.limite_cancelamentos || 50,
      percentual_bonus_churn: meta.percentual_bonus_churn || 3,
      percentual_bonus_retencao: meta.percentual_bonus_retencao || 3,
      colaboradores_bonus_meta: meta.colaboradores_bonus_meta || [],
      todos_colaboradores_participam: !hasCustomParticipants,
    });
    setMetaFormStep(1);
    setIsMetaDialogOpen(true);
  };

  const openDeleteMetaDialog = (meta: MetaMensal) => {
    setDeletingMeta(meta);
    setIsDeleteMetaDialogOpen(true);
  };

  const duplicateMeta = (meta: MetaMensal) => {
    // Calcula o próximo mês
    const [year, month] = meta.mes_referencia.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMesReferencia = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;

    const hasCustomParticipants = meta.colaboradores_bonus_meta && meta.colaboradores_bonus_meta.length > 0;
    setMetaForm({
      mes_referencia: nextMesReferencia,
      meta_mrr: meta.meta_mrr,
      meta_quantidade: meta.meta_quantidade,
      observacao: "",
      bonus_meta_equipe: meta.bonus_meta_equipe,
      bonus_meta_empresa: meta.bonus_meta_empresa,
      num_colaboradores: meta.num_colaboradores,
      multiplicador_anual: meta.multiplicador_anual,
      comissao_venda_unica: meta.comissao_venda_unica,
      ltv_medio: meta.ltv_medio || 6,
      assinaturas_inicio_mes: meta.assinaturas_inicio_mes || 0,
      limite_churn: meta.limite_churn || 5,
      limite_cancelamentos: meta.limite_cancelamentos || 50,
      percentual_bonus_churn: meta.percentual_bonus_churn || 3,
      percentual_bonus_retencao: meta.percentual_bonus_retencao || 3,
      colaboradores_bonus_meta: meta.colaboradores_bonus_meta || [],
      todos_colaboradores_participam: !hasCustomParticipants,
    });
    setEditingMeta(null);
    setMetaFormStep(1);
    setIsMetaDialogOpen(true);
    
    toast({
      title: "Configuração duplicada",
      description: `Dados copiados de ${formatMonthYear(meta.mes_referencia)} para ${formatMonthYear(nextMesReferencia)}. Ajuste os valores se necessário.`,
    });
  };

  const handleFaixaSubmit = () => {
    if (!faixaForm.nome.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" });
      return;
    }
    if (faixaForm.mrr_max !== null && faixaForm.mrr_max <= faixaForm.mrr_min) {
      toast({
        title: "Erro",
        description: "MRR Máximo deve ser maior que MRR Mínimo.",
        variant: "destructive",
      });
      return;
    }
    faixaMutation.mutate();
  };

  const handleMetaSubmit = () => {
    if (!metaForm.mes_referencia) {
      toast({ title: "Erro", description: "Mês de referência é obrigatório.", variant: "destructive" });
      return;
    }
    if (metaForm.meta_mrr <= 0) {
      toast({ title: "Erro", description: "Meta de MRR deve ser maior que zero.", variant: "destructive" });
      return;
    }
    metaMutation.mutate();
  };

  const stepLabels = [
    { step: 1, label: "Metas", icon: Target },
    { step: 2, label: "Bônus", icon: TrendingUp },
    { step: 3, label: "Equipe", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie metas, faixas de comissão e parâmetros de fechamento
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="metas" className="gap-2">
            <Calendar className="h-4 w-4" />
            Metas Mensais
          </TabsTrigger>
          <TabsTrigger value="faixas" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Faixas de Comissão
          </TabsTrigger>
        </TabsList>

        {/* Metas Mensais Tab */}
        <TabsContent value="metas" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                  Metas e Configurações Mensais
                </CardTitle>
                <CardDescription>
                  Defina metas de vendas, parâmetros de comissão e bônus de equipe para cada mês
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetMetaForm();
                  setIsMetaDialogOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Configuração
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingMetas ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : metasMensais.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    Nenhuma configuração mensal cadastrada
                  </div>
                ) : (
                  metasMensais.map((meta) => (
                    <Card key={meta.id} className="hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                              <Calendar className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold capitalize text-lg">
                                {formatMonthYear(meta.mes_referencia)}
                              </h3>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Target className="w-3 h-3" />
                                  MRR: {formatCurrency(meta.meta_mrr)}
                                </span>
                                <span>•</span>
                                <span>Qtd: {meta.meta_quantidade}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {meta.num_colaboradores} colab.
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="hidden md:flex items-center gap-4 text-sm">
                              <div className="text-center px-3 py-1 rounded bg-green-500/10">
                                <div className="text-xs text-muted-foreground">Bônus Equipe</div>
                                <div className="font-medium text-green-600">{meta.bonus_meta_equipe}%</div>
                              </div>
                              <div className="text-center px-3 py-1 rounded bg-blue-500/10">
                                <div className="text-xs text-muted-foreground">Bônus Empresa</div>
                                <div className="font-medium text-blue-600">{meta.bonus_meta_empresa}%</div>
                              </div>
                              {meta.assinaturas_inicio_mes > 0 && (
                                <div className="text-center px-3 py-1 rounded bg-purple-500/10">
                                  <div className="text-xs text-muted-foreground">Clientes</div>
                                  <div className="font-medium text-purple-600">{meta.assinaturas_inicio_mes}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => duplicateMeta(meta)}
                                title="Duplicar para próximo mês"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => openEditMetaDialog(meta)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => openDeleteMetaDialog(meta)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Faixas de Comissão Tab */}
        <TabsContent value="faixas" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Faixas de Comissão
                </CardTitle>
                <CardDescription>
                  Configure os percentuais de comissão por faixa de MRR
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetFaixaForm();
                  setIsDialogOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Faixa
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>MRR Mín</TableHead>
                    <TableHead>MRR Máx</TableHead>
                    <TableHead>Percentual</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingFaixas ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : faixas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhuma faixa cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    faixas.map((faixa) => (
                      <TableRow key={faixa.id}>
                        <TableCell className="font-medium">{faixa.nome}</TableCell>
                        <TableCell>{formatCurrency(faixa.mrr_min)}</TableCell>
                        <TableCell>
                          {faixa.mrr_max ? formatCurrency(faixa.mrr_max) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{formatPercent(faixa.percentual)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(faixa)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(faixa)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para criar/editar faixa */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFaixa ? "Editar Faixa" : "Nova Faixa de Comissão"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={faixaForm.nome}
                onChange={(e) => setFaixaForm({ ...faixaForm, nome: e.target.value })}
                placeholder="Ex: Elite I"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mrr_min">MRR Mínimo</Label>
                <Input
                  id="mrr_min"
                  type="number"
                  value={faixaForm.mrr_min}
                  onChange={(e) =>
                    setFaixaForm({ ...faixaForm, mrr_min: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mrr_max">MRR Máximo (opcional)</Label>
                <Input
                  id="mrr_max"
                  type="number"
                  value={faixaForm.mrr_max || ""}
                  onChange={(e) =>
                    setFaixaForm({
                      ...faixaForm,
                      mrr_max: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="percentual">Percentual (%)</Label>
                <Input
                  id="percentual"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="Ex: 20, 30, 40"
                  value={faixaForm.percentual}
                  onChange={(e) =>
                    setFaixaForm({ ...faixaForm, percentual: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ordem">Ordem</Label>
                <Input
                  id="ordem"
                  type="number"
                  value={faixaForm.ordem}
                  onChange={(e) =>
                    setFaixaForm({ ...faixaForm, ordem: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFaixaSubmit} disabled={faixaMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar exclusão de faixa */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a faixa "{deletingFaixa?.nome}"? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingFaixa && deleteMutation.mutate(deletingFaixa.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para criar/editar meta mensal - Multi-step */}
      <Dialog open={isMetaDialogOpen} onOpenChange={(open) => {
        setIsMetaDialogOpen(open);
        if (!open) setMetaFormStep(1);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              {editingMeta ? "Editar Configuração Mensal" : "Nova Configuração Mensal"}
            </DialogTitle>
            <DialogDescription>
              Configure metas de vendas e parâmetros de fechamento de equipe
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-4 border-b">
            {stepLabels.map(({ step, label, icon: Icon }, index) => (
              <div key={step} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setMetaFormStep(step as 1 | 2 | 3)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    metaFormStep === step
                      ? "bg-primary text-primary-foreground"
                      : metaFormStep > step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
                {index < stepLabels.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          <div className="py-4 min-h-[320px]">
            {/* Step 1: Metas */}
            {metaFormStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mes_referencia">Mês de Referência</Label>
                  <Input
                    id="mes_referencia"
                    type="month"
                    value={metaForm.mes_referencia?.substring(0, 7) || ""}
                    onChange={(e) =>
                      setMetaForm({ ...metaForm, mes_referencia: e.target.value + "-01" })
                    }
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meta_mrr_form">Meta de MRR</Label>
                    <Input
                      id="meta_mrr_form"
                      type="number"
                      value={metaForm.meta_mrr}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, meta_mrr: Number(e.target.value) })
                      }
                      placeholder="Ex: 8500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta_quantidade_form">Meta de Quantidade</Label>
                    <Input
                      id="meta_quantidade_form"
                      type="number"
                      value={metaForm.meta_quantidade}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, meta_quantidade: Number(e.target.value) })
                      }
                      placeholder="Ex: 130"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ltv_medio_form">LTV Médio (meses)</Label>
                    <Input
                      id="ltv_medio_form"
                      type="number"
                      min="1"
                      max="120"
                      value={metaForm.ltv_medio}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, ltv_medio: Number(e.target.value) })
                      }
                      placeholder="Ex: 6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="num_colaboradores_form">Nº Colaboradores</Label>
                    <Input
                      id="num_colaboradores_form"
                      type="number"
                      min="1"
                      value={metaForm.num_colaboradores}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, num_colaboradores: Number(e.target.value) })
                      }
                      placeholder="Ex: 12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacao">Observação (opcional)</Label>
                  <Input
                    id="observacao"
                    value={metaForm.observacao}
                    onChange={(e) => setMetaForm({ ...metaForm, observacao: e.target.value })}
                    placeholder="Ex: Meta especial fim de ano"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Bônus Vendedores */}
            {metaFormStep === 2 && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="text-sm font-medium mb-2">Configurações de Comissão de Vendedores</h4>
                  <p className="text-xs text-muted-foreground">
                    Estes parâmetros são usados no cálculo de comissão individual dos vendedores
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bonus_meta_equipe_form">Bônus Meta Equipe (%)</Label>
                    <Input
                      id="bonus_meta_equipe_form"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={metaForm.bonus_meta_equipe}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, bonus_meta_equipe: Number(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">% sobre MRR individual se meta equipe batida</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bonus_meta_empresa_form">Bônus Meta Empresa (%)</Label>
                    <Input
                      id="bonus_meta_empresa_form"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={metaForm.bonus_meta_empresa}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, bonus_meta_empresa: Number(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">% sobre MRR total ÷ colaboradores</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="multiplicador_anual_form">Multiplicador Venda Anual</Label>
                    <Input
                      id="multiplicador_anual_form"
                      type="number"
                      step="0.1"
                      min="1"
                      value={metaForm.multiplicador_anual}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, multiplicador_anual: Number(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">MRR × multiplicador para vendas anuais</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comissao_venda_unica_form">Comissão Venda Única (%)</Label>
                    <Input
                      id="comissao_venda_unica_form"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={metaForm.comissao_venda_unica}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, comissao_venda_unica: Number(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">% sobre valor de adesão</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Parâmetros de Fechamento de Equipe */}
            {metaFormStep === 3 && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Parâmetros de Fechamento de Equipe
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Estes valores serão usados no fechamento de bônus da equipe
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assinaturas_inicio_mes_form">Clientes no Início do Mês</Label>
                    <Input
                      id="assinaturas_inicio_mes_form"
                      type="number"
                      min="0"
                      value={metaForm.assinaturas_inicio_mes}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, assinaturas_inicio_mes: Number(e.target.value) })
                      }
                      placeholder="Ex: 2000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="limite_churn_form">Limite Churn (%)</Label>
                    <Input
                      id="limite_churn_form"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={metaForm.limite_churn}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, limite_churn: Number(e.target.value) })
                      }
                      placeholder="Ex: 5"
                    />
                    <p className="text-xs text-muted-foreground">Bônus liberado se churn &lt; limite</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="limite_cancelamentos_form">Limite Cancelamentos (%)</Label>
                    <Input
                      id="limite_cancelamentos_form"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={metaForm.limite_cancelamentos}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, limite_cancelamentos: Number(e.target.value) })
                      }
                      placeholder="Ex: 50"
                    />
                    <p className="text-xs text-muted-foreground">Cancelamentos &lt; % das vendas</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentual_bonus_meta_form">% Bônus Meta Equipe</Label>
                    <Input
                      id="percentual_bonus_meta_form"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={metaForm.bonus_meta_equipe}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, bonus_meta_equipe: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="percentual_bonus_churn_form">% Bônus Churn</Label>
                    <Input
                      id="percentual_bonus_churn_form"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={metaForm.percentual_bonus_churn}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, percentual_bonus_churn: Number(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">% sobre MRR se churn controlado</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentual_bonus_retencao_form">% Bônus Retenção</Label>
                    <Input
                      id="percentual_bonus_retencao_form"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={metaForm.percentual_bonus_retencao}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, percentual_bonus_retencao: Number(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">% sobre MRR se retenção atingida</p>
                  </div>
                </div>

                {/* Seleção de Colaboradores para Bônus de Meta */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-primary" />
                        Participantes do Bônus de Meta
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Define quem recebe o bônus quando a meta é atingida
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="todos_participam" className="text-sm text-muted-foreground">
                        Todos os colaboradores ativos
                      </Label>
                      <Switch
                        id="todos_participam"
                        checked={metaForm.todos_colaboradores_participam}
                        onCheckedChange={(checked) => {
                          setMetaForm({ 
                            ...metaForm, 
                            todos_colaboradores_participam: checked,
                            colaboradores_bonus_meta: checked ? [] : metaForm.colaboradores_bonus_meta
                          });
                        }}
                      />
                    </div>
                  </div>

                  {!metaForm.todos_colaboradores_participam && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Selecione os colaboradores que participarão:
                        </p>
                        <Badge variant="secondary">
                          {metaForm.colaboradores_bonus_meta.length} selecionados
                        </Badge>
                      </div>
                      <ScrollArea className="h-[200px] rounded-md border p-3">
                        <div className="space-y-2">
                          {colaboradoresAtivos.map((colab) => (
                            <div
                              key={colab.id}
                              className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50"
                            >
                              <Checkbox
                                id={`colab-${colab.id}`}
                                checked={metaForm.colaboradores_bonus_meta.includes(colab.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setMetaForm({
                                      ...metaForm,
                                      colaboradores_bonus_meta: [...metaForm.colaboradores_bonus_meta, colab.id]
                                    });
                                  } else {
                                    setMetaForm({
                                      ...metaForm,
                                      colaboradores_bonus_meta: metaForm.colaboradores_bonus_meta.filter(id => id !== colab.id)
                                    });
                                  }
                                }}
                              />
                              <div className="flex-1 flex items-center gap-2">
                                <Label
                                  htmlFor={`colab-${colab.id}`}
                                  className="text-sm font-medium cursor-pointer flex-1"
                                >
                                  {colab.nome}
                                </Label>
                                {colab.cargo && (
                                  <span className="text-xs text-muted-foreground">{colab.cargo}</span>
                                )}
                                {colab.eh_vendedor_direto && (
                                  <Badge variant="outline" className="text-xs py-0">Vendedor</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {colaboradoresAtivos.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhum colaborador ativo encontrado
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMetaForm({
                            ...metaForm,
                            colaboradores_bonus_meta: colaboradoresAtivos.map(c => c.id)
                          })}
                        >
                          Selecionar Todos
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMetaForm({
                            ...metaForm,
                            colaboradores_bonus_meta: []
                          })}
                        >
                          Limpar Seleção
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              {metaFormStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMetaFormStep((prev) => (prev - 1) as 1 | 2 | 3)}
                >
                  Voltar
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsMetaDialogOpen(false);
                  setMetaFormStep(1);
                }}
              >
                Cancelar
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {metaFormStep < 3 ? (
                <Button
                  type="button"
                  onClick={() => setMetaFormStep((prev) => (prev + 1) as 1 | 2 | 3)}
                  className="w-full sm:w-auto"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleMetaSubmit}
                  disabled={metaMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  Salvar Configuração
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar exclusão de meta */}
      <AlertDialog open={isDeleteMetaDialogOpen} onOpenChange={setIsDeleteMetaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a configuração de{" "}
              {deletingMeta && formatMonthYear(deletingMeta.mes_referencia)}? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingMeta && deleteMetaMutation.mutate(deletingMeta.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
