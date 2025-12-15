import { useState } from "react";
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
  bonus_meta_equipe: number;
  bonus_meta_empresa: number;
  num_colaboradores: number;
  multiplicador_anual: number;
  comissao_venda_unica: number;
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
    bonus_meta_equipe: 10,
    bonus_meta_empresa: 10,
    num_colaboradores: 12,
    multiplicador_anual: 2,
    comissao_venda_unica: 10,
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
    });
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
      bonus_meta_equipe: meta.bonus_meta_equipe,
      bonus_meta_empresa: meta.bonus_meta_empresa,
      num_colaboradores: meta.num_colaboradores,
      multiplicador_anual: meta.multiplicador_anual,
      comissao_venda_unica: meta.comissao_venda_unica,
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
                <TableHead>Meta Qtd</TableHead>
                <TableHead>Bônus Equipe</TableHead>
                <TableHead>Bônus Empresa</TableHead>
                <TableHead>Colaboradores</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingMetas ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : metasMensais.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                    <TableCell>{formatPercent(meta.bonus_meta_equipe)}</TableCell>
                    <TableCell>{formatPercent(meta.bonus_meta_empresa)}</TableCell>
                    <TableCell>{meta.num_colaboradores}</TableCell>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMeta ? "Editar Meta Mensal" : "Nova Meta Mensal"}
            </DialogTitle>
            <DialogDescription>
              Defina metas e configurações de bônus para o mês
            </DialogDescription>
          </DialogHeader>
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

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-4">Configurações de Bônus</h4>
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
                    placeholder="Ex: 10"
                  />
                  <p className="text-xs text-muted-foreground">Digite 10 para 10%</p>
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
                    placeholder="Ex: 10"
                  />
                  <p className="text-xs text-muted-foreground">Digite 10 para 10%</p>
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
                    placeholder="Ex: 2"
                  />
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
                    placeholder="Ex: 10"
                  />
                  <p className="text-xs text-muted-foreground">Digite 10 para 10% sobre adesão</p>
                </div>
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
