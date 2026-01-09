import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Target, Loader2, Check, X, Trophy } from "lucide-react";
import { format, startOfMonth, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
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

interface MetaIndividual {
  id: string;
  colaborador_id: string;
  mes_referencia: string;
  titulo: string;
  descricao: string | null;
  valor_meta: string;
  tipo_bonus: string;
  valor_bonus: number;
  valor_atingido: string | null;
  percentual_atingido: number | null;
  atingida: boolean | null;
  colaboradores?: {
    nome: string;
    salario_base: number;
  };
}

interface Colaborador {
  id: string;
  nome: string;
  salario_base: number;
}

interface MetaForm {
  colaborador_id: string;
  titulo: string;
  descricao: string;
  valor_meta: string;
  tipo_bonus: string;
  valor_bonus: string;
}

const initialFormState: MetaForm = {
  colaborador_id: "",
  titulo: "",
  descricao: "",
  valor_meta: "",
  tipo_bonus: "fixo",
  valor_bonus: "",
};

export default function MetasIndividuais() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterColaborador, setFilterColaborador] = useState<string>("todos");
  const [filterAtingida, setFilterAtingida] = useState<string>("todos");
  const [mesReferencia, setMesReferencia] = useState(format(new Date(), "yyyy-MM"));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MetaForm>(initialFormState);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [atualizarModal, setAtualizarModal] = useState<{ open: boolean; meta: MetaIndividual | null }>({
    open: false,
    meta: null,
  });
  const [valorAtingido, setValorAtingido] = useState("");

  const mesReferenciaDate = startOfMonth(parse(mesReferencia, "yyyy-MM", new Date()));

  const { data: colaboradores } = useQuery({
    queryKey: ["colaboradores-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, salario_base")
        .eq("ativo", true)
        .eq("participa_fechamento_equipe", true)
        .order("nome");

      if (error) throw error;
      return data as Colaborador[];
    },
  });

  const { data: metas, isLoading } = useQuery({
    queryKey: ["metas-individuais", mesReferencia],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_individuais")
        .select(`
          *,
          colaboradores (nome, salario_base)
        `)
        .eq("mes_referencia", format(mesReferenciaDate, "yyyy-MM-dd"))
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MetaIndividual[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MetaForm) => {
      const { error } = await supabase.from("metas_individuais").insert({
        colaborador_id: data.colaborador_id,
        mes_referencia: format(mesReferenciaDate, "yyyy-MM-dd"),
        titulo: data.titulo,
        descricao: data.descricao || null,
        valor_meta: data.valor_meta,
        tipo_bonus: data.tipo_bonus,
        valor_bonus: parseFloat(data.valor_bonus),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas-individuais"] });
      setIsModalOpen(false);
      setFormData(initialFormState);
      toast.success("Meta cadastrada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar meta: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MetaForm }) => {
      const { error } = await supabase
        .from("metas_individuais")
        .update({
          colaborador_id: data.colaborador_id,
          titulo: data.titulo,
          descricao: data.descricao || null,
          valor_meta: data.valor_meta,
          tipo_bonus: data.tipo_bonus,
          valor_bonus: parseFloat(data.valor_bonus),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas-individuais"] });
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(initialFormState);
      toast.success("Meta atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar meta: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("metas_individuais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas-individuais"] });
      setDeleteConfirmId(null);
      toast.success("Meta excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir meta: " + error.message);
    },
  });

  const marcarAtingidaMutation = useMutation({
    mutationFn: async ({ id, atingida, valorAtingido }: { id: string; atingida: boolean; valorAtingido?: string }) => {
      const { error } = await supabase
        .from("metas_individuais")
        .update({
          atingida,
          valor_atingido: valorAtingido || null,
          percentual_atingido: atingida ? 100 : 0,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas-individuais"] });
      setAtualizarModal({ open: false, meta: null });
      setValorAtingido("");
      toast.success("Meta atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar meta: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.colaborador_id || !formData.titulo || !formData.valor_meta || !formData.valor_bonus) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (meta: MetaIndividual) => {
    setEditingId(meta.id);
    setFormData({
      colaborador_id: meta.colaborador_id,
      titulo: meta.titulo,
      descricao: meta.descricao || "",
      valor_meta: meta.valor_meta,
      tipo_bonus: meta.tipo_bonus,
      valor_bonus: meta.valor_bonus.toString(),
    });
    setIsModalOpen(true);
  };

  const handleAtualizarAtingida = () => {
    if (!atualizarModal.meta) return;
    marcarAtingidaMutation.mutate({
      id: atualizarModal.meta.id,
      atingida: true,
      valorAtingido: valorAtingido,
    });
  };

  const filteredMetas = metas?.filter((meta) => {
    const matchesSearch =
      meta.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meta.colaboradores?.nome.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesColaborador = filterColaborador === "todos" || meta.colaborador_id === filterColaborador;
    const matchesAtingida =
      filterAtingida === "todos" ||
      (filterAtingida === "atingida" && meta.atingida) ||
      (filterAtingida === "pendente" && !meta.atingida);

    return matchesSearch && matchesColaborador && matchesAtingida;
  });

  const calcularValorBonus = (meta: MetaIndividual) => {
    if (meta.tipo_bonus === "percentual" && meta.colaboradores?.salario_base) {
      return (meta.valor_bonus / 100) * meta.colaboradores.salario_base;
    }
    return meta.valor_bonus;
  };

  const totais = {
    total: filteredMetas?.length || 0,
    atingidas: filteredMetas?.filter((m) => m.atingida).length || 0,
    valorTotal: filteredMetas?.reduce((sum, m) => sum + calcularValorBonus(m), 0) || 0,
    valorAtingido: filteredMetas?.filter((m) => m.atingida).reduce((sum, m) => sum + calcularValorBonus(m), 0) || 0,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas Individuais</h1>
          <p className="text-muted-foreground">
            Cadastre e acompanhe metas individuais dos colaboradores
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Metas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totais.total}</div>
            <p className="text-xs text-muted-foreground">metas cadastradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atingidas</CardTitle>
            <Trophy className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totais.atingidas}</div>
            <p className="text-xs text-muted-foreground">
              {totais.total > 0 ? Math.round((totais.atingidas / totais.total) * 100) : 0}% de sucesso
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totais.valorTotal)}</div>
            <p className="text-xs text-muted-foreground">em bônus potencial</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bônus Conquistado</CardTitle>
            <Trophy className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totais.valorAtingido)}</div>
            <p className="text-xs text-muted-foreground">metas atingidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metas do Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="month"
                value={mesReferencia}
                onChange={(e) => setMesReferencia(e.target.value)}
                className="w-40"
              />
              <Select value={filterColaborador} onValueChange={setFilterColaborador}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Colaborador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {colaboradores?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterAtingida} onValueChange={setFilterAtingida}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="atingida">Atingidas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead>Valor Meta</TableHead>
                    <TableHead>Tipo Bônus</TableHead>
                    <TableHead className="text-right">Valor Bônus</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMetas?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma meta encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMetas?.map((meta) => (
                      <TableRow key={meta.id}>
                        <TableCell className="font-medium">{meta.colaboradores?.nome}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{meta.titulo}</p>
                            {meta.descricao && (
                              <p className="text-xs text-muted-foreground">{meta.descricao}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{meta.valor_meta}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {meta.tipo_bonus === "fixo" ? "Valor Fixo" : "% Salário"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {meta.tipo_bonus === "fixo"
                            ? formatCurrency(meta.valor_bonus)
                            : `${meta.valor_bonus}% = ${formatCurrency(calcularValorBonus(meta))}`}
                        </TableCell>
                        <TableCell>
                          {meta.atingida ? (
                            <Badge className="bg-green-500">
                              <Check className="mr-1 h-3 w-3" />
                              Atingida {meta.valor_atingido && `(${meta.valor_atingido})`}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <X className="mr-1 h-3 w-3" />
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {!meta.atingida && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  setAtualizarModal({ open: true, meta });
                                  setValorAtingido("");
                                }}
                                title="Marcar como atingida"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEdit(meta)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(meta.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nova/Editar Meta */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setEditingId(null);
          setFormData(initialFormState);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Meta" : "Cadastrar Meta Individual"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="colaborador">Colaborador *</Label>
              <Select
                value={formData.colaborador_id}
                onValueChange={(value) => setFormData({ ...formData, colaborador_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="titulo">Título da Meta *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Atender 100 tickets"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição detalhada da meta..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_meta">Valor da Meta *</Label>
              <Input
                id="valor_meta"
                value={formData.valor_meta}
                onChange={(e) => setFormData({ ...formData, valor_meta: e.target.value })}
                placeholder="Ex: 100 tickets, NPS 80, etc"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_bonus">Tipo de Bônus *</Label>
                <Select
                  value={formData.tipo_bonus}
                  onValueChange={(value) => setFormData({ ...formData, tipo_bonus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Valor Fixo</SelectItem>
                    <SelectItem value="percentual">% do Salário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_bonus">
                  {formData.tipo_bonus === "fixo" ? "Valor (R$) *" : "Percentual (%) *"}
                </Label>
                <Input
                  id="valor_bonus"
                  type="number"
                  step={formData.tipo_bonus === "fixo" ? "0.01" : "0.1"}
                  min="0"
                  value={formData.valor_bonus}
                  onChange={(e) => setFormData({ ...formData, valor_bonus: e.target.value })}
                  placeholder={formData.tipo_bonus === "fixo" ? "0,00" : "0"}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingId ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Marcar Atingida */}
      <Dialog open={atualizarModal.open} onOpenChange={(open) => setAtualizarModal({ open, meta: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar Meta como Atingida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{atualizarModal.meta?.titulo}</p>
              <p className="text-sm text-muted-foreground">Meta: {atualizarModal.meta?.valor_meta}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor_atingido">Valor Atingido</Label>
              <Input
                id="valor_atingido"
                value={valorAtingido}
                onChange={(e) => setValorAtingido(e.target.value)}
                placeholder="Ex: 112 tickets, NPS 85, etc"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAtualizarModal({ open: false, meta: null })}>
              Cancelar
            </Button>
            <Button onClick={handleAtualizarAtingida} disabled={marcarAtingidaMutation.isPending}>
              {marcarAtingidaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Check className="mr-2 h-4 w-4" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmação Exclusão */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Meta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
