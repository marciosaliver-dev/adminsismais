import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Pencil, Trash2, Save, Calendar, Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

type FaixaComissao = Tables<"faixa_comissao">;
type ConfiguracaoComissao = Tables<"configuracao_comissao">;

interface MetaMensal {
  id: string;
  mes_referencia: string;
  meta_mrr: number;
  meta_quantidade: number;
  observacao: string | null;
  created_at: string;
  updated_at: string;
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
  const [metaForm, setMetaForm] = useState({
    mes_referencia: "",
    meta_mrr: 0,
    meta_quantidade: 0,
    observacao: "",
  });

  const [configForm, setConfigForm] = useState({
    meta_mrr: "",
    meta_quantidade: "",
    meta_mes: "",
    bonus_meta_equipe: "",
    bonus_meta_empresa: "",
    num_colaboradores: "",
    multiplicador_anual: "",
    comissao_venda_unica: "",
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

  // Fetch configurações
  const { data: configuracoes = [], isLoading: loadingConfig } = useQuery({
    queryKey: ["configuracao_comissao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracao_comissao")
        .select("*");
      if (error) throw error;
      return data as ConfiguracaoComissao[];
    },
  });

  // Initialize config form when data loads
  useEffect(() => {
    if (configuracoes.length > 0) {
      const getConfig = (chave: string) =>
        configuracoes.find((c) => c.chave === chave)?.valor || "";
      setConfigForm({
        meta_mrr: getConfig("meta_mrr"),
        meta_quantidade: getConfig("meta_quantidade"),
        meta_mes: getConfig("meta_mes"),
        bonus_meta_equipe: getConfig("bonus_meta_equipe"),
        bonus_meta_empresa: getConfig("bonus_meta_empresa"),
        num_colaboradores: getConfig("num_colaboradores"),
        multiplicador_anual: getConfig("multiplicador_anual"),
        comissao_venda_unica: getConfig("comissao_venda_unica"),
      });
    }
  }, [configuracoes]);

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
      // Check if faixa is being used
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

  // Update config mutation
  const configMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(configForm).map(async ([chave, valor]) => {
        const { error } = await supabase
          .from("configuracao_comissao")
          .update({ valor })
          .eq("chave", chave);
        if (error) throw error;
      });
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracao_comissao"] });
      toast({
        title: "Sucesso!",
        description: "Configurações salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Create/Update meta mensal mutation
  const metaMutation = useMutation({
    mutationFn: async () => {
      if (editingMeta) {
        const { error } = await supabase
          .from("meta_mensal")
          .update({
            mes_referencia: metaForm.mes_referencia,
            meta_mrr: metaForm.meta_mrr,
            meta_quantidade: metaForm.meta_quantidade,
            observacao: metaForm.observacao || null,
          })
          .eq("id", editingMeta.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("meta_mensal").insert([{
          mes_referencia: metaForm.mes_referencia,
          meta_mrr: metaForm.meta_mrr,
          meta_quantidade: metaForm.meta_quantidade,
          observacao: metaForm.observacao || null,
        }]);
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
    setMetaForm({ mes_referencia: "", meta_mrr: 0, meta_quantidade: 0, observacao: "" });
    setEditingMeta(null);
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
    setMetaForm({
      mes_referencia: meta.mes_referencia,
      meta_mrr: meta.meta_mrr,
      meta_quantidade: meta.meta_quantidade,
      observacao: meta.observacao || "",
    });
    setIsMetaDialogOpen(true);
  };

  const openDeleteMetaDialog = (meta: MetaMensal) => {
    setDeletingMeta(meta);
    setIsDeleteMetaDialogOpen(true);
  };

  const handleFaixaSubmit = () => {
    // Validation
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
    // Validation
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

  const handleConfigSubmit = () => {
    configMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Configurações de Comissão</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie faixas de comissão e metas
        </p>
      </div>

      {/* Seção 1: Faixas de Comissão */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📊 Faixas de Comissão
          </CardTitle>
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
                    <TableCell>{formatPercent(faixa.percentual)}</TableCell>
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

      {/* Seção 2: Metas Mensais */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Metas Mensais
          </CardTitle>
          <Button
            onClick={() => {
              resetMetaForm();
              setIsMetaDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Meta
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Meta MRR</TableHead>
                <TableHead>Meta Quantidade</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingMetas ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : metasMensais.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma meta mensal cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                metasMensais.map((meta) => (
                  <TableRow key={meta.id}>
                    <TableCell className="font-medium capitalize">
                      {formatMonthYear(meta.mes_referencia)}
                    </TableCell>
                    <TableCell>{formatCurrency(meta.meta_mrr)}</TableCell>
                    <TableCell>{meta.meta_quantidade}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {meta.observacao || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Seção 3: Bônus e Configurações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Bônus e Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingConfig ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bonus_meta_equipe">Bônus Meta Equipe (%)</Label>
                <Input
                  id="bonus_meta_equipe"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={configForm.bonus_meta_equipe}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, bonus_meta_equipe: e.target.value })
                  }
                  placeholder="Ex: 10"
                />
                <p className="text-xs text-muted-foreground">
                  Digite 10 para 10%
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bonus_meta_empresa">Bônus Meta Empresa (%)</Label>
                <Input
                  id="bonus_meta_empresa"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={configForm.bonus_meta_empresa}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, bonus_meta_empresa: e.target.value })
                  }
                  placeholder="Ex: 10"
                />
                <p className="text-xs text-muted-foreground">
                  Digite 10 para 10%
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="num_colaboradores">Nº Colaboradores</Label>
                <Input
                  id="num_colaboradores"
                  type="number"
                  value={configForm.num_colaboradores}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, num_colaboradores: e.target.value })
                  }
                  placeholder="Ex: 12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="multiplicador_anual">Multiplicador Venda Anual</Label>
                <Input
                  id="multiplicador_anual"
                  type="number"
                  step="0.1"
                  value={configForm.multiplicador_anual}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, multiplicador_anual: e.target.value })
                  }
                  placeholder="Ex: 2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comissao_venda_unica">Comissão Venda Única (%)</Label>
                <Input
                  id="comissao_venda_unica"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={configForm.comissao_venda_unica}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, comissao_venda_unica: e.target.value })
                  }
                  placeholder="Ex: 10"
                />
                <p className="text-xs text-muted-foreground">
                  Digite 10 para 10% sobre o valor de adesão
                </p>
              </div>
            </div>
          )}
          <div className="mt-6">
            <Button
              onClick={handleConfigSubmit}
              disabled={configMutation.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

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

      {/* Alert Dialog para confirmar exclusão */}
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

      {/* Dialog para criar/editar meta mensal */}
      <Dialog open={isMetaDialogOpen} onOpenChange={setIsMetaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMeta ? "Editar Meta Mensal" : "Nova Meta Mensal"}
            </DialogTitle>
            <DialogDescription>
              Defina a meta de MRR e quantidade de vendas para o mês
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMetaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMetaSubmit} disabled={metaMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar exclusão de meta */}
      <AlertDialog open={isDeleteMetaDialogOpen} onOpenChange={setIsDeleteMetaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a meta de{" "}
              {deletingMeta && formatMonthYear(deletingMeta.mes_referencia)}? Esta ação
              não pode ser desfeita.
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
