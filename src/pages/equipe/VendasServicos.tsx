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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Search, Check, X, Receipt, Loader2, DollarSign, Clock, CheckCircle } from "lucide-react";
import { format, startOfMonth, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VendaServico {
  id: string;
  colaborador_id: string;
  cliente: string;
  descricao_servico: string;
  valor_servico: number;
  data_venda: string;
  mes_referencia: string;
  status: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  motivo_rejeicao: string | null;
  observacoes: string | null;
  plataforma: string | null;
  created_at: string;
  colaboradores?: {
    nome: string;
  };
}

interface Colaborador {
  id: string;
  nome: string;
  percentual_comissao: number | null;
}

interface VendaForm {
  colaborador_id: string;
  cliente: string;
  descricao_servico: string;
  valor_servico: string;
  data_venda: string;
  observacoes: string;
  plataforma: string;
}

const SERVICOS_SUGERIDOS = [
  "Treinamento",
  "Implantação",
  "Consultoria",
  "Suporte Premium",
  "Migração de Dados",
  "Customização",
  "Integração",
];

const PLATAFORMAS = [
  "Guru Manager",
  "Banco Inter",
  "Eduzz",
  "GalaxyPay",
];

const initialFormState: VendaForm = {
  colaborador_id: "",
  cliente: "",
  descricao_servico: "",
  valor_servico: "",
  data_venda: format(new Date(), "yyyy-MM-dd"),
  observacoes: "",
  plataforma: "Guru Manager",
};

export default function VendasServicos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterColaborador, setFilterColaborador] = useState<string>("todos");
  const [mesReferencia, setMesReferencia] = useState(format(new Date(), "yyyy-MM"));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<VendaForm>(initialFormState);
  const [rejeicaoModal, setRejeicaoModal] = useState<{ open: boolean; vendaId: string | null }>({
    open: false,
    vendaId: null,
  });
  const [motivoRejeicao, setMotivoRejeicao] = useState("");

  const mesReferenciaDate = startOfMonth(parse(mesReferencia, "yyyy-MM", new Date()));

  const { data: colaboradores } = useQuery({
    queryKey: ["colaboradores-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, percentual_comissao")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Colaborador[];
    },
  });

  const { data: vendas, isLoading } = useQuery({
    queryKey: ["vendas-servicos", mesReferencia],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas_servicos")
        .select(`
          *,
          colaboradores (nome)
        `)
        .eq("mes_referencia", format(mesReferenciaDate, "yyyy-MM-dd"))
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as VendaServico[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: VendaForm) => {
      const { error } = await supabase.from("vendas_servicos").insert({
        colaborador_id: data.colaborador_id,
        cliente: data.cliente,
        descricao_servico: data.descricao_servico,
        valor_servico: parseFloat(data.valor_servico),
        data_venda: data.data_venda,
        mes_referencia: format(mesReferenciaDate, "yyyy-MM-dd"),
        observacoes: data.observacoes || null,
        plataforma: data.plataforma,
        status: "pendente",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas-servicos"] });
      setIsModalOpen(false);
      setFormData(initialFormState);
      toast.success("Venda registrada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao registrar venda: " + error.message);
    },
  });

  const aprovarMutation = useMutation({
    mutationFn: async (vendaId: string) => {
      const { error } = await supabase
        .from("vendas_servicos")
        .update({
          status: "aprovado",
          aprovado_em: new Date().toISOString(),
          aprovado_por: "Admin", // TODO: usar nome do usuário logado
        })
        .eq("id", vendaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas-servicos"] });
      toast.success("Venda aprovada!");
    },
    onError: (error) => {
      toast.error("Erro ao aprovar venda: " + error.message);
    },
  });

  const rejeitarMutation = useMutation({
    mutationFn: async ({ vendaId, motivo }: { vendaId: string; motivo: string }) => {
      const { error } = await supabase
        .from("vendas_servicos")
        .update({
          status: "rejeitado",
          motivo_rejeicao: motivo,
        })
        .eq("id", vendaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas-servicos"] });
      setRejeicaoModal({ open: false, vendaId: null });
      setMotivoRejeicao("");
      toast.success("Venda rejeitada!");
    },
    onError: (error) => {
      toast.error("Erro ao rejeitar venda: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.colaborador_id || !formData.cliente || !formData.descricao_servico || !formData.valor_servico) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleRejeitar = () => {
    if (!rejeicaoModal.vendaId || !motivoRejeicao.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }
    rejeitarMutation.mutate({ vendaId: rejeicaoModal.vendaId, motivo: motivoRejeicao });
  };

  const filteredVendas = vendas?.filter((venda) => {
    const matchesSearch =
      venda.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venda.descricao_servico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venda.colaboradores?.nome.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "todos" || venda.status === filterStatus;
    const matchesColaborador = filterColaborador === "todos" || venda.colaborador_id === filterColaborador;

    return matchesSearch && matchesStatus && matchesColaborador;
  });

  const totais = {
    total: filteredVendas?.reduce((sum, v) => sum + v.valor_servico, 0) || 0,
    aprovado: filteredVendas?.filter((v) => v.status === "aprovado").reduce((sum, v) => sum + v.valor_servico, 0) || 0,
    pendente: filteredVendas?.filter((v) => v.status === "pendente").reduce((sum, v) => sum + v.valor_servico, 0) || 0,
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "aprovado":
        return <Badge className="bg-green-500">Aprovado</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Vendas de Serviços</h1>
          <p className="text-muted-foreground">
            Registre e gerencie vendas de serviços dos colaboradores
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Venda
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totais.total)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredVendas?.length || 0} vendas no período
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovado</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totais.aprovado)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredVendas?.filter((v) => v.status === "aprovado").length || 0} vendas aprovadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totais.pendente)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredVendas?.filter((v) => v.status === "pendente").length || 0} aguardando aprovação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Vendas do Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, serviço ou colaborador..."
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
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
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
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendas?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendas?.map((venda) => (
                      <TableRow key={venda.id}>
                        <TableCell>
                          {format(new Date(venda.data_venda), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {venda.colaboradores?.nome}
                        </TableCell>
                        <TableCell>{venda.cliente}</TableCell>
                        <TableCell>{venda.descricao_servico}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{venda.plataforma || "Guru Manager"}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(venda.valor_servico)}
                        </TableCell>
                        <TableCell>{getStatusBadge(venda.status)}</TableCell>
                        <TableCell className="text-right">
                          {venda.status === "pendente" && (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => aprovarMutation.mutate(venda.id)}
                                disabled={aprovarMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setRejeicaoModal({ open: true, vendaId: venda.id })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {venda.status === "rejeitado" && venda.motivo_rejeicao && (
                            <span className="text-xs text-muted-foreground" title={venda.motivo_rejeicao}>
                              {venda.motivo_rejeicao.substring(0, 20)}...
                            </span>
                          )}
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

      {/* Modal Nova Venda */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Venda de Serviço</DialogTitle>
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
              <Label htmlFor="cliente">Cliente *</Label>
              <Input
                id="cliente"
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="servico">Serviço *</Label>
              <Select
                value={formData.descricao_servico}
                onValueChange={(value) => setFormData({ ...formData, descricao_servico: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione ou digite o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICOS_SUGERIDOS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Ou digite um serviço personalizado"
                value={SERVICOS_SUGERIDOS.includes(formData.descricao_servico) ? "" : formData.descricao_servico}
                onChange={(e) => setFormData({ ...formData, descricao_servico: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_servico}
                  onChange={(e) => setFormData({ ...formData, valor_servico: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data_venda}
                  onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plataforma">Plataforma de Recebimento *</Label>
              <Select
                value={formData.plataforma}
                onValueChange={(value) => setFormData({ ...formData, plataforma: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {PLATAFORMAS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Rejeição */}
      <Dialog open={rejeicaoModal.open} onOpenChange={(open) => setRejeicaoModal({ open, vendaId: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Rejeição *</Label>
              <Textarea
                id="motivo"
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                placeholder="Informe o motivo da rejeição..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejeicaoModal({ open: false, vendaId: null });
                setMotivoRejeicao("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejeitar}
              disabled={rejeitarMutation.isPending}
            >
              {rejeitarMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
