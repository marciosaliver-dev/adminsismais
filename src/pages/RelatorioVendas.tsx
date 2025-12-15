import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileText, Plus, Pencil, Trash2, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Tables } from "@/integrations/supabase/types";

type FechamentoComissao = Tables<"fechamento_comissao">;
type VendaImportada = Tables<"venda_importada">;
type ComissaoCalculada = Tables<"comissao_calculada">;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface VendaForm {
  id?: string;
  data_contrato: string;
  plataforma: string;
  num_contrato: string;
  cliente: string;
  email: string;
  plano: string;
  tipo_venda: string;
  intervalo: string;
  vendedor: string;
  valor_assinatura: number;
  valor_mrr: number;
  valor_adesao: number;
  conta_comissao: boolean;
  conta_faixa: boolean;
  conta_meta: boolean;
}

const emptyVendaForm: VendaForm = {
  data_contrato: "",
  plataforma: "",
  num_contrato: "",
  cliente: "",
  email: "",
  plano: "",
  tipo_venda: "Venda Direta",
  intervalo: "Mensal",
  vendedor: "",
  valor_assinatura: 0,
  valor_mrr: 0,
  valor_adesao: 0,
  conta_comissao: true,
  conta_faixa: true,
  conta_meta: true,
};

const TIPOS_VENDA = [
  "Venda Direta",
  "Upgrade",
  "Indicação de Cliente",
  "Recuperação de Cliente",
  "Afiliado",
  "Migração",
  "Troca de plataforma",
];

const INTERVALOS = ["Mensal", "Anual", "Semestral"];

export default function RelatorioVendas() {
  const queryClient = useQueryClient();
  const [selectedFechamento, setSelectedFechamento] = useState<string>("");
  const [selectedVendedor, setSelectedVendedor] = useState<string>("todos");
  const [vendaFormOpen, setVendaFormOpen] = useState(false);
  const [vendaForm, setVendaForm] = useState<VendaForm>(emptyVendaForm);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendaToDelete, setVendaToDelete] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Fetch fechamentos em rascunho
  const { data: fechamentos = [], isLoading: loadingFechamentos } = useQuery({
    queryKey: ["fechamentos_rascunho"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fechamento_comissao")
        .select("*")
        .order("mes_referencia", { ascending: false });
      if (error) throw error;
      return data as FechamentoComissao[];
    },
  });

  // Fetch vendas do fechamento selecionado
  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ["vendas_fechamento", selectedFechamento],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venda_importada")
        .select("*")
        .eq("fechamento_id", selectedFechamento)
        .order("vendedor")
        .order("data_contrato", { ascending: false });
      if (error) throw error;
      return data as VendaImportada[];
    },
    enabled: !!selectedFechamento,
  });

  // Fetch comissões do fechamento
  const { data: comissoes = [] } = useQuery({
    queryKey: ["comissoes_rel", selectedFechamento],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comissao_calculada")
        .select("*")
        .eq("fechamento_id", selectedFechamento)
        .order("vendedor");
      if (error) throw error;
      return data as ComissaoCalculada[];
    },
    enabled: !!selectedFechamento,
  });

  // Fetch configurações
  const { data: configuracoes = [] } = useQuery({
    queryKey: ["config_rel"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracao_comissao").select("*");
      if (error) throw error;
      return data;
    },
  });

  const fechamentoAtual = fechamentos.find((f) => f.id === selectedFechamento);
  const isRascunho = fechamentoAtual?.status === "rascunho";

  // Lista de vendedores
  const vendedores = [...new Set(vendas.map((v) => v.vendedor).filter(Boolean))] as string[];

  // Vendas filtradas
  const vendasFiltradas =
    selectedVendedor === "todos"
      ? vendas
      : vendas.filter((v) => v.vendedor === selectedVendedor);

  // Group vendas por vendedor
  const vendasPorVendedor = vendas.reduce((acc, venda) => {
    const vendedor = venda.vendedor || "Sem Vendedor";
    if (!acc[vendedor]) acc[vendedor] = [];
    acc[vendedor].push(venda);
    return acc;
  }, {} as Record<string, VendaImportada[]>);

  // Save venda mutation
  const saveMutation = useMutation({
    mutationFn: async (form: VendaForm) => {
      if (form.id) {
        const { error } = await supabase
          .from("venda_importada")
          .update({
            data_contrato: form.data_contrato || null,
            plataforma: form.plataforma || null,
            num_contrato: form.num_contrato || null,
            cliente: form.cliente || null,
            email: form.email || null,
            plano: form.plano || null,
            tipo_venda: form.tipo_venda || null,
            intervalo: form.intervalo || null,
            vendedor: form.vendedor || null,
            valor_assinatura: form.valor_assinatura,
            valor_mrr: form.valor_mrr,
            valor_adesao: form.valor_adesao,
            conta_comissao: form.conta_comissao,
            conta_faixa: form.conta_faixa,
            conta_meta: form.conta_meta,
          })
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("venda_importada").insert({
          fechamento_id: selectedFechamento,
          data_contrato: form.data_contrato || null,
          plataforma: form.plataforma || null,
          num_contrato: form.num_contrato || null,
          cliente: form.cliente || null,
          email: form.email || null,
          plano: form.plano || null,
          tipo_venda: form.tipo_venda || null,
          intervalo: form.intervalo || null,
          vendedor: form.vendedor || null,
          valor_assinatura: form.valor_assinatura,
          valor_mrr: form.valor_mrr,
          valor_adesao: form.valor_adesao,
          conta_comissao: form.conta_comissao,
          conta_faixa: form.conta_faixa,
          conta_meta: form.conta_meta,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas_fechamento", selectedFechamento] });
      setVendaFormOpen(false);
      setVendaForm(emptyVendaForm);
      toast({ title: "Sucesso!", description: "Venda salva com sucesso." });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar venda.",
        variant: "destructive",
      });
    },
  });

  // Delete venda mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("venda_importada").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas_fechamento", selectedFechamento] });
      setDeleteDialogOpen(false);
      setVendaToDelete(null);
      toast({ title: "Sucesso!", description: "Venda excluída." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao excluir.", variant: "destructive" });
    },
  });

  const handleEditVenda = (venda: VendaImportada) => {
    setVendaForm({
      id: venda.id,
      data_contrato: venda.data_contrato || "",
      plataforma: venda.plataforma || "",
      num_contrato: venda.num_contrato || "",
      cliente: venda.cliente || "",
      email: venda.email || "",
      plano: venda.plano || "",
      tipo_venda: venda.tipo_venda || "Venda Direta",
      intervalo: venda.intervalo || "Mensal",
      vendedor: venda.vendedor || "",
      valor_assinatura: venda.valor_assinatura,
      valor_mrr: venda.valor_mrr,
      valor_adesao: venda.valor_adesao,
      conta_comissao: venda.conta_comissao,
      conta_faixa: venda.conta_faixa,
      conta_meta: venda.conta_meta,
    });
    setVendaFormOpen(true);
  };

  const handleDeleteVenda = (id: string) => {
    setVendaToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleAddVenda = () => {
    setVendaForm(emptyVendaForm);
    setVendaFormOpen(true);
  };

  const handleGeneratePdf = async () => {
    if (!fechamentoAtual || vendas.length === 0) return;

    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF();
      const mesAno = format(new Date(fechamentoAtual.mes_referencia), "MMMM/yyyy", { locale: ptBR });

      // Header
      doc.setFontSize(18);
      doc.text(`Fechamento de Comissões - ${mesAno}`, 14, 20);

      doc.setFontSize(12);
      doc.text(`Total Vendas: ${fechamentoAtual.total_vendas}`, 14, 32);
      doc.text(`MRR Total: ${formatCurrency(fechamentoAtual.total_mrr)}`, 14, 40);
      doc.text(`Meta: ${fechamentoAtual.meta_batida ? "✓ Batida" : "✗ Não Batida"}`, 14, 48);

      let yPos = 58;

      // Para cada vendedor
      Object.entries(vendasPorVendedor).forEach(([vendedor, vendasVend]) => {
        const comissao = comissoes.find((c) => c.vendedor === vendedor);

        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`${vendedor}`, 14, yPos);
        yPos += 8;

        // Comissão do vendedor
        if (comissao) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(
            `Faixa: ${comissao.faixa_nome || "-"} | Comissão: ${formatCurrency(comissao.valor_comissao)} | Bônus: ${formatCurrency(comissao.bonus_anual + comissao.bonus_meta_equipe + comissao.bonus_empresa)} | Total: ${formatCurrency(comissao.total_receber)}`,
            14,
            yPos
          );
          yPos += 8;
        }

        // Tabela de vendas do vendedor
        const tableData = vendasVend.map((v) => [
          v.data_contrato ? format(new Date(v.data_contrato), "dd/MM/yy") : "-",
          v.cliente?.substring(0, 20) || "-",
          v.tipo_venda || "-",
          v.intervalo || "-",
          formatCurrency(v.valor_mrr),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Data", "Cliente", "Tipo", "Intervalo", "MRR"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [69, 229, 229], textColor: [0, 0, 0], fontStyle: "bold" },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      });

      // Summary page
      doc.addPage();
      doc.setFontSize(16);
      doc.text("Resumo Geral de Comissões", 14, 20);

      const summaryData = comissoes.map((c) => [
        c.vendedor,
        c.qtd_vendas.toString(),
        formatCurrency(c.mrr_total),
        c.faixa_nome || "-",
        `${c.percentual}%`,
        formatCurrency(c.valor_comissao),
        formatCurrency(c.bonus_anual + c.bonus_meta_equipe + c.bonus_empresa),
        formatCurrency(c.total_receber),
      ]);

      const totals = comissoes.reduce(
        (acc, c) => ({
          vendas: acc.vendas + c.qtd_vendas,
          mrr: acc.mrr + c.mrr_total,
          comissao: acc.comissao + c.valor_comissao,
          bonus: acc.bonus + c.bonus_anual + c.bonus_meta_equipe + c.bonus_empresa,
          total: acc.total + c.total_receber,
        }),
        { vendas: 0, mrr: 0, comissao: 0, bonus: 0, total: 0 }
      );

      summaryData.push([
        "TOTAL",
        totals.vendas.toString(),
        formatCurrency(totals.mrr),
        "-",
        "-",
        formatCurrency(totals.comissao),
        formatCurrency(totals.bonus),
        formatCurrency(totals.total),
      ]);

      autoTable(doc, {
        startY: 30,
        head: [["Vendedor", "Vendas", "MRR", "Faixa", "%", "Comissão", "Bônus", "Total"]],
        body: summaryData,
        theme: "striped",
        headStyles: { fillColor: [69, 229, 229], textColor: [0, 0, 0], fontStyle: "bold" },
        styles: { fontSize: 9 },
        foot: [],
      });

      const mesAnoFile = format(new Date(fechamentoAtual.mes_referencia), "yyyy-MM");
      doc.save(`fechamento_comissoes_${mesAnoFile}.pdf`);

      toast({ title: "Sucesso!", description: "PDF gerado com sucesso." });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({ title: "Erro", description: "Erro ao gerar PDF.", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold">📋 Relatório de Vendas</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fechamento</Label>
              <Select value={selectedFechamento} onValueChange={setSelectedFechamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fechamento" />
                </SelectTrigger>
                <SelectContent>
                  {fechamentos.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {format(new Date(f.mes_referencia), "MMMM/yyyy", { locale: ptBR })} -{" "}
                      {f.status === "rascunho" ? "📝 Rascunho" : "✅ Fechado"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedFechamento && (
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os vendedores</SelectItem>
                    {vendedores.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedFechamento && (
              <div className="flex items-end gap-2">
                {isRascunho && (
                  <Button onClick={handleAddVenda} className="bg-primary">
                    <Plus className="w-4 h-4 mr-2" /> Nova Venda
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf || vendas.length === 0}
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Gerar PDF
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vendas Table */}
      {selectedFechamento && (
        <Card>
          <CardHeader>
            <CardTitle>
              Vendas {selectedVendedor !== "todos" && `- ${selectedVendedor}`} ({vendasFiltradas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingVendas ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : vendasFiltradas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Intervalo</TableHead>
                      <TableHead className="text-right">MRR</TableHead>
                      <TableHead className="text-right">Assinatura</TableHead>
                      <TableHead className="text-center">Flags</TableHead>
                      {isRascunho && <TableHead className="text-center">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasFiltradas.map((venda, idx) => (
                      <TableRow key={venda.id} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell>
                          {venda.data_contrato
                            ? format(new Date(venda.data_contrato), "dd/MM/yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium">{venda.vendedor || "-"}</TableCell>
                        <TableCell>{venda.cliente || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{venda.tipo_venda || "-"}</Badge>
                        </TableCell>
                        <TableCell>{venda.intervalo || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(venda.valor_mrr)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(venda.valor_assinatura)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            {venda.conta_comissao && (
                              <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                                C
                              </Badge>
                            )}
                            {venda.conta_faixa && (
                              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                                F
                              </Badge>
                            )}
                            {venda.conta_meta && (
                              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700">
                                M
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {isRascunho && (
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditVenda(venda)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDeleteVenda(venda.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Venda Form Dialog */}
      <Dialog open={vendaFormOpen} onOpenChange={setVendaFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{vendaForm.id ? "Editar Venda" : "Nova Venda"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Data Contrato</Label>
              <Input
                type="date"
                value={vendaForm.data_contrato}
                onChange={(e) => setVendaForm({ ...vendaForm, data_contrato: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Input
                value={vendaForm.vendedor}
                onChange={(e) => setVendaForm({ ...vendaForm, vendedor: e.target.value })}
                placeholder="Nome do vendedor"
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                value={vendaForm.cliente}
                onChange={(e) => setVendaForm({ ...vendaForm, cliente: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={vendaForm.email}
                onChange={(e) => setVendaForm({ ...vendaForm, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Input
                value={vendaForm.plataforma}
                onChange={(e) => setVendaForm({ ...vendaForm, plataforma: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nº Contrato</Label>
              <Input
                value={vendaForm.num_contrato}
                onChange={(e) => setVendaForm({ ...vendaForm, num_contrato: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Input
                value={vendaForm.plano}
                onChange={(e) => setVendaForm({ ...vendaForm, plano: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Venda</Label>
              <Select
                value={vendaForm.tipo_venda}
                onValueChange={(val) => setVendaForm({ ...vendaForm, tipo_venda: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_VENDA.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Intervalo</Label>
              <Select
                value={vendaForm.intervalo}
                onValueChange={(val) => setVendaForm({ ...vendaForm, intervalo: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVALOS.map((int) => (
                    <SelectItem key={int} value={int}>
                      {int}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Assinatura</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={vendaForm.valor_assinatura}
                onChange={(e) =>
                  setVendaForm({ ...vendaForm, valor_assinatura: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Valor MRR</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={vendaForm.valor_mrr}
                onChange={(e) =>
                  setVendaForm({ ...vendaForm, valor_mrr: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Adesão</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={vendaForm.valor_adesao}
                onChange={(e) =>
                  setVendaForm({ ...vendaForm, valor_adesao: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="col-span-2 flex gap-6 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="conta_comissao"
                  checked={vendaForm.conta_comissao}
                  onCheckedChange={(checked) =>
                    setVendaForm({ ...vendaForm, conta_comissao: !!checked })
                  }
                />
                <Label htmlFor="conta_comissao">Conta para Comissão</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="conta_faixa"
                  checked={vendaForm.conta_faixa}
                  onCheckedChange={(checked) =>
                    setVendaForm({ ...vendaForm, conta_faixa: !!checked })
                  }
                />
                <Label htmlFor="conta_faixa">Conta para Faixa</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="conta_meta"
                  checked={vendaForm.conta_meta}
                  onCheckedChange={(checked) =>
                    setVendaForm({ ...vendaForm, conta_meta: !!checked })
                  }
                />
                <Label htmlFor="conta_meta">Conta para Meta</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVendaFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate(vendaForm)} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => vendaToDelete && deleteMutation.mutate(vendaToDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
