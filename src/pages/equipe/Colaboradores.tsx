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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Colaborador {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  departamento: string | null;
  salario_base: number;
  percentual_comissao: number | null;
  participa_fechamento_equipe: boolean | null;
  eh_vendedor_direto: boolean | null;
  ativo: boolean | null;
  data_admissao: string | null;
  created_at: string;
}

interface ColaboradorForm {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  departamento: string;
  salario_base: string;
  percentual_comissao: string;
  participa_fechamento_equipe: boolean;
  eh_vendedor_direto: boolean;
  ativo: boolean;
  data_admissao: string;
}

const DEPARTAMENTOS = ["Comercial e Marketing", "Suporte e CS", "Desenvolvimento", "Administrativo"];

const initialFormState: ColaboradorForm = {
  nome: "",
  email: "",
  telefone: "",
  cargo: "",
  departamento: "",
  salario_base: "",
  percentual_comissao: "10",
  participa_fechamento_equipe: true,
  eh_vendedor_direto: false,
  ativo: true,
  data_admissao: "",
};

export default function Colaboradores() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAtivo, setFilterAtivo] = useState<string>("todos");
  const [filterParticipa, setFilterParticipa] = useState<string>("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ColaboradorForm>(initialFormState);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: colaboradores, isLoading } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("*")
        .order("nome");

      if (error) throw error;
      return data as Colaborador[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ColaboradorForm) => {
      const payload = {
        nome: data.nome,
        email: data.email || null,
        telefone: data.telefone || null,
        cargo: data.cargo || null,
        departamento: data.departamento || null,
        salario_base: parseFloat(data.salario_base) || 0,
        percentual_comissao: parseFloat(data.percentual_comissao) || 10,
        participa_fechamento_equipe: data.participa_fechamento_equipe,
        eh_vendedor_direto: data.eh_vendedor_direto,
        ativo: data.ativo,
        data_admissao: data.data_admissao || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("colaboradores")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("colaboradores").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      toast.success(editingId ? "Colaborador atualizado!" : "Colaborador cadastrado!");
      closeModal();
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("colaboradores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      toast.success("Colaborador excluído!");
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  const openModal = (colaborador?: Colaborador) => {
    if (colaborador) {
      setEditingId(colaborador.id);
      setFormData({
        nome: colaborador.nome,
        email: colaborador.email || "",
        telefone: colaborador.telefone || "",
        cargo: colaborador.cargo || "",
        departamento: colaborador.departamento || "",
        salario_base: colaborador.salario_base.toString(),
        percentual_comissao: (colaborador.percentual_comissao || 10).toString(),
        participa_fechamento_equipe: colaborador.participa_fechamento_equipe ?? true,
        eh_vendedor_direto: colaborador.eh_vendedor_direto ?? false,
        ativo: colaborador.ativo ?? true,
        data_admissao: colaborador.data_admissao || "",
      });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    saveMutation.mutate(formData);
  };

  const filteredColaboradores = colaboradores?.filter((c) => {
    const matchesSearch =
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.departamento?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAtivo =
      filterAtivo === "todos" ||
      (filterAtivo === "ativos" && c.ativo) ||
      (filterAtivo === "inativos" && !c.ativo);

    const matchesParticipa =
      filterParticipa === "todos" ||
      (filterParticipa === "sim" && c.participa_fechamento_equipe) ||
      (filterParticipa === "nao" && !c.participa_fechamento_equipe);

    return matchesSearch && matchesAtivo && matchesParticipa;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Colaboradores</h1>
            <p className="text-muted-foreground">
              Gerencie os colaboradores da equipe
            </p>
          </div>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Colaborador
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Lista de Colaboradores</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={filterAtivo} onValueChange={setFilterAtivo}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterParticipa} onValueChange={setFilterParticipa}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Fechamento: Todos</SelectItem>
                  <SelectItem value="sim">Participa</SelectItem>
                  <SelectItem value="nao">Não Participa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredColaboradores?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum colaborador encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Salário</TableHead>
                    <TableHead className="text-center">Fechamento</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredColaboradores.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.cargo || "-"}</TableCell>
                      <TableCell>{c.departamento || "-"}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(c.salario_base)}
                      </TableCell>
                      <TableCell className="text-center">
                        {c.eh_vendedor_direto ? (
                          <Badge variant="outline">Vendedor</Badge>
                        ) : c.participa_fechamento_equipe ? (
                          <Badge variant="default">Sim</Badge>
                        ) : (
                          <Badge variant="secondary">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={c.ativo ? "default" : "secondary"}>
                          {c.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openModal(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(c.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Cadastro/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Colaborador" : "Novo Colaborador"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Nome completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) =>
                      setFormData({ ...formData, telefone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) =>
                      setFormData({ ...formData, cargo: e.target.value })
                    }
                    placeholder="Ex: Analista de Suporte"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Select
                    value={formData.departamento}
                    onValueChange={(value) =>
                      setFormData({ ...formData, departamento: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTAMENTOS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salario_base">Salário Base (R$)</Label>
                  <Input
                    id="salario_base"
                    type="number"
                    step="0.01"
                    value={formData.salario_base}
                    onChange={(e) =>
                      setFormData({ ...formData, salario_base: e.target.value })
                    }
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentual_comissao">% Comissão Serviços</Label>
                  <Input
                    id="percentual_comissao"
                    type="number"
                    step="0.01"
                    value={formData.percentual_comissao}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        percentual_comissao: e.target.value,
                      })
                    }
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_admissao">Data de Admissão</Label>
                <Input
                  id="data_admissao"
                  type="date"
                  value={formData.data_admissao}
                  onChange={(e) =>
                    setFormData({ ...formData, data_admissao: e.target.value })
                  }
                />
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="participa_fechamento">
                    Participa do fechamento de equipe
                  </Label>
                  <Switch
                    id="participa_fechamento"
                    checked={formData.participa_fechamento_equipe}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        participa_fechamento_equipe: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="eh_vendedor">
                    É vendedor direto (usa módulo de comissões)
                  </Label>
                  <Switch
                    id="eh_vendedor"
                    checked={formData.eh_vendedor_direto}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, eh_vendedor_direto: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ativo">Ativo</Label>
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, ativo: checked })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Exclusão */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja excluir este colaborador? Esta ação não pode
            ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
