import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  TableFooter,
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
import { Loader2, FileText, Plus, Pencil, Trash2, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
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
  const [searchParams] = useSearchParams();
  const [selectedFechamento, setSelectedFechamento] = useState<string>("");
  const [selectedVendedor, setSelectedVendedor] = useState<string>("todos");
  const [selectedTipoVenda, setSelectedTipoVenda] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<string>("data_contrato");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [vendaFormOpen, setVendaFormOpen] = useState(false);
  const [vendaForm, setVendaForm] = useState<VendaForm>(emptyVendaForm);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendaToDelete, setVendaToDelete] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false);

  // Auto-select fechamento and vendedor from URL query parameters
  useEffect(() => {
    const fechamentoParam = searchParams.get("fechamento");
    const vendedorParam = searchParams.get("vendedor");
    if (fechamentoParam && !selectedFechamento) {
      setSelectedFechamento(fechamentoParam);
    }
    if (vendedorParam) {
      setSelectedVendedor(vendedorParam);
    }
  }, [searchParams, selectedFechamento]);

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

  // Fetch meta mensal do mês do fechamento (para PDF)
  const { data: metaMensalAtual } = useQuery({
    queryKey: ["meta_mensal_pdf", selectedFechamento],
    queryFn: async () => {
      if (!selectedFechamento) return null;

      const { data: fechamentoData, error: fechamentoError } = await supabase
        .from("fechamento_comissao")
        .select("mes_referencia")
        .eq("id", selectedFechamento)
        .maybeSingle();
      if (fechamentoError) throw fechamentoError;
      if (!fechamentoData?.mes_referencia) return null;

      const { data, error } = await supabase
        .from("meta_mensal")
        .select("*")
        .eq("mes_referencia", fechamentoData.mes_referencia)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFechamento,
  });

  const fechamentoAtual = fechamentos.find((f) => f.id === selectedFechamento);
  const isRascunho = fechamentoAtual?.status === "rascunho";

  // Lista de vendedores e tipos de venda
  const vendedores = [...new Set(vendas.map((v) => v.vendedor).filter(Boolean))] as string[];
  const tiposVenda = [...new Set(vendas.map((v) => v.tipo_venda).filter(Boolean))] as string[];

  // Vendas filtradas e ordenadas
  const vendasFiltradas = vendas
    .filter((v) => {
      // Filtro por vendedor
      if (selectedVendedor !== "todos" && v.vendedor !== selectedVendedor) return false;
      // Filtro por tipo de venda
      if (selectedTipoVenda !== "todos" && v.tipo_venda !== selectedTipoVenda) return false;
      // Filtro por pesquisa (cliente ou contrato)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchCliente = v.cliente?.toLowerCase().includes(term);
        const matchContrato = v.num_contrato?.toLowerCase().includes(term);
        if (!matchCliente && !matchContrato) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let valA: any;
      let valB: any;
      
      switch (sortColumn) {
        case "data_contrato":
          valA = a.data_contrato || "";
          valB = b.data_contrato || "";
          break;
        case "vendedor":
          valA = a.vendedor || "";
          valB = b.vendedor || "";
          break;
        case "cliente":
          valA = a.cliente || "";
          valB = b.cliente || "";
          break;
        case "tipo_venda":
          valA = a.tipo_venda || "";
          valB = b.tipo_venda || "";
          break;
        case "intervalo":
          valA = a.intervalo || "";
          valB = b.intervalo || "";
          break;
        case "valor_mrr":
          valA = a.valor_mrr;
          valB = b.valor_mrr;
          break;
        case "valor_assinatura":
          valA = a.valor_assinatura;
          valB = b.valor_assinatura;
          break;
        default:
          valA = a.data_contrato || "";
          valB = b.data_contrato || "";
      }
      
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      
      return sortDirection === "asc" 
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

  // Get LTV Médio from config
  const ltvMedio = Number(configuracoes.find(c => c.chave === "ltv_medio")?.valor || 12);

  // Calculate totals for filtered data
  const totaisFiltrados = vendasFiltradas.reduce(
    (acc, v) => ({
      qtd: acc.qtd + 1,
      mrr: acc.mrr + v.valor_mrr,
      mrrComissao: acc.mrrComissao + (v.conta_comissao ? v.valor_mrr : 0),
      adesao: acc.adesao + v.valor_adesao,
    }),
    { qtd: 0, mrr: 0, mrrComissao: 0, adesao: 0 }
  );

  // Calculate Faturamento Total and Ticket Médio
  const faturamentoTotal = totaisFiltrados.mrr * ltvMedio;
  const ticketMedio = totaisFiltrados.qtd > 0 ? totaisFiltrados.mrr / totaisFiltrados.qtd : 0;

  // Group vendas por vendedor (usar vendas originais, não filtradas)
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

  // Generate individual PDF for a single salesperson
  const generateVendedorPdf = (vendedor: string) => {
    if (!fechamentoAtual) return;

    const doc = new jsPDF({ orientation: "portrait" });
    const mesAno = format(parseISO(fechamentoAtual.mes_referencia + "T12:00:00"), "MMMM/yyyy", { locale: ptBR });
    const vendasVend = vendasPorVendedor[vendedor] || [];
    const comissao = comissoes.find((c) => c.vendedor === vendedor);

    // Get configurations - use meta mensal if available
    const metaMrr = (metaMensalAtual as any)?.meta_mrr ?? parseFloat(configuracoes.find((c) => c.chave === "meta_mrr")?.valor || "8500");
    const metaQtd = (metaMensalAtual as any)?.meta_quantidade ?? parseFloat(configuracoes.find((c) => c.chave === "meta_quantidade")?.valor || "130");
    const bonusEquipePerc = (metaMensalAtual as any)?.bonus_meta_equipe ?? parseFloat(configuracoes.find((c) => c.chave === "bonus_meta_equipe")?.valor || "10");
    const bonusEmpresaPerc = (metaMensalAtual as any)?.bonus_meta_empresa ?? parseFloat(configuracoes.find((c) => c.chave === "bonus_meta_empresa")?.valor || "10");
    const qtdColaboradores = (metaMensalAtual as any)?.num_colaboradores ?? parseFloat(configuracoes.find((c) => c.chave === "num_colaboradores")?.valor || "12");
    const multiplicadorAnual = (metaMensalAtual as any)?.multiplicador_anual ?? parseFloat(configuracoes.find((c) => c.chave === "multiplicador_anual")?.valor || "2");

    // Calculate totals for summary
    const totalMrrBruto = vendasVend.reduce((acc, v) => acc + v.valor_mrr, 0);
    const totalMrrComissao = vendasVend.filter((v) => v.conta_comissao).reduce((acc, v) => acc + v.valor_mrr, 0);
    const totalAssinatura = vendasVend.reduce((acc, v) => acc + v.valor_assinatura, 0);
    const totalAdesao = vendasVend.reduce((acc, v) => acc + v.valor_adesao, 0);
    const totalVendas = vendasVend.length;
    
    // Only MRR from annual sales (not total value)
    const vendasAnuais = vendasVend.filter((v) => v.intervalo?.toLowerCase() === "anual" && v.conta_comissao);
    const mrrVendasAnuais = vendasAnuais.reduce((acc, v) => acc + v.valor_mrr, 0);
    const ticketMedio = totalVendas > 0 ? totalMrrBruto / totalVendas : 0;

    // Global totals
    const totalMrrGeral = vendas.reduce((acc, v) => acc + v.valor_mrr, 0);
    const totalVendasGeral = vendas.length;
    const totalMrrLiquidoGeral = vendas.filter((v) => v.conta_comissao).reduce((acc, v) => acc + v.valor_mrr, 0);
    const participacao = totalMrrBruto > 0 && totalMrrGeral > 0 ? (totalMrrBruto / totalMrrGeral) * 100 : 0;

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 10;

    // ===== HEADER =====
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`Comissão - ${mesAno.charAt(0).toUpperCase() + mesAno.slice(1)}`, pageWidth / 2, 10, { align: "center" });
    doc.setFontSize(12);
    doc.text(vendedor, pageWidth / 2, 18, { align: "center" });
    doc.setTextColor(0, 0, 0);
    yPos = 30;

    // ===== RESUMO GERAL =====
    doc.setFillColor(52, 73, 94);
    doc.rect(10, yPos, pageWidth - 20, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("RESUMO DO FECHAMENTO", pageWidth / 2, yPos + 5, { align: "center" });
    doc.setTextColor(0, 0, 0);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      body: [
        ["Meta Qtd Vendas", metaQtd.toString(), "Meta MRR", formatCurrency(metaMrr)],
        ["Total Vendas Equipe", totalVendasGeral.toString(), "MRR Total Equipe", formatCurrency(totalMrrGeral)],
        ["MRR Base Bônus", formatCurrency(totalMrrLiquidoGeral), "Colaboradores", qtdColaboradores.toString()],
      ],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, halign: "center" },
      headStyles: { fillColor: [52, 73, 94] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { fontStyle: "bold", halign: "left" }, 2: { fontStyle: "bold", halign: "left" } },
      margin: { left: 10, right: 10 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // ===== DADOS DO VENDEDOR =====
    doc.setFillColor(41, 128, 185);
    doc.rect(10, yPos, pageWidth - 20, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`VENDAS - ${vendedor.toUpperCase()}`, pageWidth / 2, yPos + 5, { align: "center" });
    doc.setTextColor(0, 0, 0);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      body: [
        ["Qtd Vendas", totalVendas.toString(), "MRR Bruto", formatCurrency(totalMrrBruto)],
        ["MRR Comissão", formatCurrency(totalMrrComissao), "MRR Anual", formatCurrency(mrrVendasAnuais)],
        ["Total Adesão", formatCurrency(totalAdesao), "Ticket Médio", formatCurrency(ticketMedio)],
        ["% Participação", `${participacao.toFixed(2)}%`, "", ""],
      ],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, halign: "center" },
      alternateRowStyles: { fillColor: [232, 245, 253] },
      columnStyles: { 0: { fontStyle: "bold", halign: "left" }, 2: { fontStyle: "bold", halign: "left" } },
      margin: { left: 10, right: 10 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // ===== CÁLCULO DE COMISSÃO =====
    const faixaInfo = comissao ? `${comissao.faixa_nome}` : "-";
    const percentualComissao = comissao ? comissao.percentual : 0;
    const valorComissao = comissao?.valor_comissao || 0;
    const bonusAnual = comissao?.bonus_anual || 0;
    const bonusMetaEquipe = comissao?.bonus_meta_equipe || 0;
    const bonusEmpresa = comissao?.bonus_empresa || 0;

    const comissaoVendaUnicaPercent =
      (metaMensalAtual as any)?.comissao_venda_unica ??
      parseFloat(configuracoes.find((c: any) => c.chave === "comissao_venda_unica")?.valor || "10");
    const comissaoVendaUnicaCalculada = totalAdesao * (comissaoVendaUnicaPercent / 100);
    const comissaoVendaUnica = (comissao as any)?.comissao_venda_unica || comissaoVendaUnicaCalculada;
    const totalComissoes = valorComissao + comissaoVendaUnica;
    const totalBonusMetas = bonusAnual + bonusMetaEquipe + bonusEmpresa;
    const totalReceber = (comissao?.total_receber || 0) > 0 ? (comissao?.total_receber || 0) : totalComissoes + totalBonusMetas;

    doc.setFillColor(39, 174, 96);
    doc.rect(10, yPos, pageWidth - 20, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("COMISSÕES", pageWidth / 2, yPos + 5, { align: "center" });
    doc.setTextColor(0, 0, 0);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      body: [
        [`Faixa: ${faixaInfo}`, `${percentualComissao}%`, "Comissão MRR", formatCurrency(valorComissao)],
        [`Adesão (${comissaoVendaUnicaPercent}%)`, formatCurrency(comissaoVendaUnica), "Total Comissões", formatCurrency(totalComissoes)],
      ],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, halign: "center" },
      alternateRowStyles: { fillColor: [232, 246, 237] },
      columnStyles: { 0: { fontStyle: "bold", halign: "left" }, 2: { fontStyle: "bold", halign: "left" } },
      margin: { left: 10, right: 10 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // ===== BÔNUS =====
    doc.setFillColor(243, 156, 18);
    doc.rect(10, yPos, pageWidth - 20, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("BÔNUS", pageWidth / 2, yPos + 5, { align: "center" });
    doc.setTextColor(0, 0, 0);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      body: [
        [`Bônus Anual (x${multiplicadorAnual})`, formatCurrency(bonusAnual), "Bônus Meta Equipe", formatCurrency(bonusMetaEquipe)],
        ["Bônus Empresa", formatCurrency(bonusEmpresa), "Total Bônus", formatCurrency(totalBonusMetas)],
      ],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, halign: "center" },
      alternateRowStyles: { fillColor: [254, 249, 231] },
      columnStyles: { 0: { fontStyle: "bold", halign: "left" }, 2: { fontStyle: "bold", halign: "left" } },
      margin: { left: 10, right: 10 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // ===== TOTAL A RECEBER =====
    doc.setFillColor(46, 204, 113);
    doc.rect(10, yPos, pageWidth - 20, 12, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL A RECEBER", 20, yPos + 8);
    doc.text(formatCurrency(totalReceber), pageWidth - 20, yPos + 8, { align: "right" });
    doc.setTextColor(0, 0, 0);
    yPos += 18;

    const pageHeight = doc.internal.pageSize.getHeight();

    // ===== TABELA DE VENDAS (todas as vendas, múltiplas páginas) =====
    if (vendasVend.length > 0) {
      doc.addPage();
      yPos = 15;
      
      doc.setFillColor(52, 73, 94);
      doc.rect(10, yPos, pageWidth - 20, 7, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`DETALHAMENTO DE VENDAS - ${vendedor.toUpperCase()} (${vendasVend.length} vendas)`, pageWidth / 2, yPos + 5, { align: "center" });
      doc.setTextColor(0, 0, 0);
      yPos += 8;

      const tableData = vendasVend.map((v) => [
        v.data_contrato ? format(new Date(v.data_contrato + "T12:00:00"), "dd/MM/yy") : "-",
        v.cliente?.substring(0, 30) || "-",
        v.tipo_venda?.substring(0, 15) || "-",
        v.intervalo?.substring(0, 6) || "-",
        formatCurrency(v.valor_mrr),
        formatCurrency(v.valor_adesao),
        `${v.conta_comissao ? "C" : ""}${v.conta_faixa ? "F" : ""}${v.conta_meta ? "M" : ""}`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Data", "Cliente", "Tipo", "Int.", "MRR", "Adesão", "Flags"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [52, 73, 94], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
        styles: { fontSize: 6.5, cellPadding: 1.5 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 55 },
          2: { cellWidth: 30 },
          3: { cellWidth: 15 },
          4: { cellWidth: 25, halign: "right" },
          5: { cellWidth: 25, halign: "right" },
          6: { cellWidth: 15, halign: "center" },
        },
        margin: { left: 10, right: 10 },
        didDrawPage: function (data) {
          // Footer on each page
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(128, 128, 128);
          doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 10, pageHeight - 5);
          doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth - 10, pageHeight - 5, { align: "right" });
        },
      });
      
      // Footer legend
      yPos = (doc as any).lastAutoTable.finalY + 3;
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("Flags: C = Conta Comissão | F = Conta Faixa | M = Conta Meta", 10, yPos);
    }

    // Add footer to first page
    doc.setPage(1);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);
    const totalPages = doc.getNumberOfPages();
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 10, pageHeight - 5);
    doc.text(`Página 1 de ${totalPages}`, pageWidth - 10, pageHeight - 5, { align: "right" });

    const vendedorSlug = vendedor.toLowerCase().replace(/\s+/g, "_");
    const mesAnoFile = format(parseISO(fechamentoAtual.mes_referencia), "yyyy-MM");
    doc.save(`comissao_${vendedorSlug}_${mesAnoFile}.pdf`);
  };

  // Generate shareable HTML report for a single salesperson
  const generateHtmlReport = (vendedor: string) => {
    if (!fechamentoAtual) return;

    const mesAno = format(parseISO(fechamentoAtual.mes_referencia), "MMMM/yyyy", { locale: ptBR });
    const vendasVend = vendasPorVendedor[vendedor] || [];
    const comissao = comissoes.find((c) => c.vendedor === vendedor);

    // Get configurations
    const metaMrr = (metaMensalAtual as any)?.meta_mrr ?? parseFloat(configuracoes.find((c) => c.chave === "meta_mrr")?.valor || "8500");
    const metaQtd = (metaMensalAtual as any)?.meta_quantidade ?? parseFloat(configuracoes.find((c) => c.chave === "meta_quantidade")?.valor || "130");
    const multiplicadorAnual = (metaMensalAtual as any)?.multiplicador_anual ?? parseFloat(configuracoes.find((c) => c.chave === "multiplicador_anual")?.valor || "2");
    const qtdColaboradores = (metaMensalAtual as any)?.num_colaboradores ?? parseFloat(configuracoes.find((c) => c.chave === "num_colaboradores")?.valor || "12");

    // Calculate totals
    const totalMrrBruto = vendasVend.reduce((acc, v) => acc + v.valor_mrr, 0);
    const totalMrrComissao = vendasVend.filter((v) => v.conta_comissao).reduce((acc, v) => acc + v.valor_mrr, 0);
    const totalAdesao = vendasVend.reduce((acc, v) => acc + v.valor_adesao, 0);
    const totalVendas = vendasVend.length;
    const vendasAnuais = vendasVend.filter((v) => v.intervalo?.toLowerCase() === "anual" && v.conta_comissao);
    const mrrVendasAnuais = vendasAnuais.reduce((acc, v) => acc + v.valor_mrr, 0);
    const ticketMedio = totalVendas > 0 ? totalMrrBruto / totalVendas : 0;

    // Global totals
    const totalMrrGeral = vendas.reduce((acc, v) => acc + v.valor_mrr, 0);
    const totalVendasGeral = vendas.length;
    const totalMrrLiquidoGeral = vendas.filter((v) => v.conta_comissao).reduce((acc, v) => acc + v.valor_mrr, 0);
    const participacao = totalMrrBruto > 0 && totalMrrGeral > 0 ? (totalMrrBruto / totalMrrGeral) * 100 : 0;

    // Commission values
    const faixaInfo = comissao ? `${comissao.faixa_nome}` : "-";
    const percentualComissao = comissao ? comissao.percentual : 0;
    const valorComissao = comissao?.valor_comissao || 0;
    const bonusAnual = comissao?.bonus_anual || 0;
    const bonusMetaEquipe = comissao?.bonus_meta_equipe || 0;
    const bonusEmpresa = comissao?.bonus_empresa || 0;
    const comissaoVendaUnicaPercent = (metaMensalAtual as any)?.comissao_venda_unica ?? parseFloat(configuracoes.find((c: any) => c.chave === "comissao_venda_unica")?.valor || "10");
    const comissaoVendaUnica = (comissao as any)?.comissao_venda_unica || totalAdesao * (comissaoVendaUnicaPercent / 100);
    const totalComissoes = valorComissao + comissaoVendaUnica;
    const totalBonusMetas = bonusAnual + bonusMetaEquipe + bonusEmpresa;
    const totalReceber = (comissao?.total_receber || 0) > 0 ? (comissao?.total_receber || 0) : totalComissoes + totalBonusMetas;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comissão ${vendedor} - ${mesAno}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%); min-height: 100vh; padding: 20px; color: #333; }
    .container { max-width: 900px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); color: white; padding: 24px; border-radius: 16px 16px 0 0; text-align: center; }
    .header h1 { font-size: 1.5rem; margin-bottom: 4px; }
    .header h2 { font-size: 1.2rem; font-weight: 400; opacity: 0.9; }
    .content { background: white; border-radius: 0 0 16px 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
    .section { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
    .section-title { background: #34495e; color: white; padding: 8px 16px; font-size: 0.85rem; font-weight: 600; margin: 0 -20px 16px -20px; }
    .section-title.blue { background: #2980b9; }
    .section-title.green { background: #27ae60; }
    .section-title.orange { background: #f39c12; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    @media (min-width: 600px) { .grid { grid-template-columns: repeat(4, 1fr); } }
    .stat { background: #f8fafc; padding: 12px; border-radius: 8px; }
    .stat-label { font-size: 0.75rem; color: #64748b; margin-bottom: 4px; }
    .stat-value { font-size: 1rem; font-weight: 600; color: #1e293b; }
    .total-box { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 20px; margin: 0; display: flex; justify-content: space-between; align-items: center; }
    .total-box .label { font-size: 1rem; font-weight: 600; }
    .total-box .value { font-size: 1.5rem; font-weight: 700; }
    .sales-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    .sales-table th { background: #34495e; color: white; padding: 10px 8px; text-align: left; font-weight: 600; }
    .sales-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .sales-table tr:nth-child(even) { background: #f8fafc; }
    .sales-table tr:hover { background: #e8f4fc; }
    .flag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 600; margin-right: 2px; }
    .flag.c { background: #d4edda; color: #155724; }
    .flag.f { background: #cce5ff; color: #004085; }
    .flag.m { background: #fff3cd; color: #856404; }
    .footer { text-align: center; padding: 16px; color: white; font-size: 0.75rem; opacity: 0.8; }
    .legend { font-size: 0.7rem; color: #64748b; padding: 8px 20px; background: #f8fafc; }
    @media print { body { background: white; padding: 0; } .container { max-width: 100%; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Comissão - ${mesAno.charAt(0).toUpperCase() + mesAno.slice(1)}</h1>
      <h2>${vendedor}</h2>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">📊 RESUMO DO FECHAMENTO</div>
        <div class="grid">
          <div class="stat"><div class="stat-label">Meta Qtd Vendas</div><div class="stat-value">${metaQtd}</div></div>
          <div class="stat"><div class="stat-label">Meta MRR</div><div class="stat-value">${formatCurrency(metaMrr)}</div></div>
          <div class="stat"><div class="stat-label">Total Vendas Equipe</div><div class="stat-value">${totalVendasGeral}</div></div>
          <div class="stat"><div class="stat-label">MRR Total Equipe</div><div class="stat-value">${formatCurrency(totalMrrGeral)}</div></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title blue">📈 VENDAS - ${vendedor.toUpperCase()}</div>
        <div class="grid">
          <div class="stat"><div class="stat-label">Qtd Vendas</div><div class="stat-value">${totalVendas}</div></div>
          <div class="stat"><div class="stat-label">MRR Bruto</div><div class="stat-value">${formatCurrency(totalMrrBruto)}</div></div>
          <div class="stat"><div class="stat-label">MRR Comissão</div><div class="stat-value">${formatCurrency(totalMrrComissao)}</div></div>
          <div class="stat"><div class="stat-label">MRR Anual</div><div class="stat-value">${formatCurrency(mrrVendasAnuais)}</div></div>
          <div class="stat"><div class="stat-label">Total Adesão</div><div class="stat-value">${formatCurrency(totalAdesao)}</div></div>
          <div class="stat"><div class="stat-label">Ticket Médio</div><div class="stat-value">${formatCurrency(ticketMedio)}</div></div>
          <div class="stat"><div class="stat-label">% Participação</div><div class="stat-value">${participacao.toFixed(2)}%</div></div>
          <div class="stat"><div class="stat-label">Colaboradores</div><div class="stat-value">${qtdColaboradores}</div></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title green">💵 COMISSÕES</div>
        <div class="grid">
          <div class="stat"><div class="stat-label">Faixa</div><div class="stat-value">${faixaInfo} (${percentualComissao}%)</div></div>
          <div class="stat"><div class="stat-label">Comissão MRR</div><div class="stat-value">${formatCurrency(valorComissao)}</div></div>
          <div class="stat"><div class="stat-label">Adesão (${comissaoVendaUnicaPercent}%)</div><div class="stat-value">${formatCurrency(comissaoVendaUnica)}</div></div>
          <div class="stat"><div class="stat-label">Total Comissões</div><div class="stat-value">${formatCurrency(totalComissoes)}</div></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title orange">🎁 BÔNUS</div>
        <div class="grid">
          <div class="stat"><div class="stat-label">Bônus Anual (x${multiplicadorAnual})</div><div class="stat-value">${formatCurrency(bonusAnual)}</div></div>
          <div class="stat"><div class="stat-label">Bônus Meta Equipe</div><div class="stat-value">${formatCurrency(bonusMetaEquipe)}</div></div>
          <div class="stat"><div class="stat-label">Bônus Empresa</div><div class="stat-value">${formatCurrency(bonusEmpresa)}</div></div>
          <div class="stat"><div class="stat-label">Total Bônus</div><div class="stat-value">${formatCurrency(totalBonusMetas)}</div></div>
        </div>
      </div>
      <div class="total-box">
        <span class="label">🏆 TOTAL A RECEBER</span>
        <span class="value">${formatCurrency(totalReceber)}</span>
      </div>
      ${vendasVend.length > 0 ? `
      <div class="section" style="padding-bottom: 0;">
        <div class="section-title">📋 DETALHAMENTO DE VENDAS (${vendasVend.length})</div>
        <div style="overflow-x: auto;">
          <table class="sales-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Intervalo</th>
                <th style="text-align: right;">MRR</th>
                <th style="text-align: right;">Adesão</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              ${vendasVend.map(v => `
              <tr>
                <td>${v.data_contrato ? format(new Date(v.data_contrato + "T12:00:00"), "dd/MM/yy") : "-"}</td>
                <td>${v.cliente || "-"}</td>
                <td>${v.tipo_venda || "-"}</td>
                <td>${v.intervalo || "-"}</td>
                <td style="text-align: right;">${formatCurrency(v.valor_mrr)}</td>
                <td style="text-align: right;">${formatCurrency(v.valor_adesao)}</td>
                <td>
                  ${v.conta_comissao ? '<span class="flag c">C</span>' : ''}
                  ${v.conta_faixa ? '<span class="flag f">F</span>' : ''}
                  ${v.conta_meta ? '<span class="flag m">M</span>' : ''}
                </td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="legend">Flags: C = Conta Comissão | F = Conta Faixa | M = Conta Meta</div>
      ` : ''}
    </div>
    <div class="footer">
      Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' às')} • SISMAIS Cohort Analyzer
    </div>
  </div>
</body>
</html>`;

    // Create blob and open in new tab
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleGenerateHtml = async () => {
    if (!fechamentoAtual || vendas.length === 0) return;
    if (selectedVendedor === "todos") {
      toast({ title: "Atenção", description: "Selecione um vendedor específico para gerar o relatório HTML.", variant: "destructive" });
      return;
    }

    setIsGeneratingHtml(true);
    try {
      generateHtmlReport(selectedVendedor);
      toast({ title: "Sucesso!", description: "Relatório HTML gerado em nova aba." });
    } catch (error) {
      console.error("Erro ao gerar HTML:", error);
      toast({ title: "Erro", description: "Erro ao gerar relatório HTML.", variant: "destructive" });
    } finally {
      setIsGeneratingHtml(false);
    }
  };

  // Generate PDF for all salespeople or selected one
  const handleGeneratePdf = async () => {
    if (!fechamentoAtual || vendas.length === 0) return;

    setIsGeneratingPdf(true);

    try {
      if (selectedVendedor !== "todos") {
        // Single salesperson
        generateVendedorPdf(selectedVendedor);
        toast({ title: "Sucesso!", description: "PDF gerado com sucesso." });
      } else {
        // Generate one PDF for each salesperson
        const vendedoresList = Object.keys(vendasPorVendedor);
        for (const vendedor of vendedoresList) {
          generateVendedorPdf(vendedor);
        }
        toast({
          title: "Sucesso!",
          description: `${vendedoresList.length} PDFs gerados com sucesso.`,
        });
      }
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Fechamento</Label>
              <Select value={selectedFechamento} onValueChange={setSelectedFechamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fechamento" />
                </SelectTrigger>
                <SelectContent>
                  {fechamentos.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {format(parseISO(f.mes_referencia), "MMMM/yyyy", { locale: ptBR })} -{" "}
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
              <div className="space-y-2">
                <Label>Tipo de Venda</Label>
                <Select value={selectedTipoVenda} onValueChange={setSelectedTipoVenda}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tiposVenda.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedFechamento && (
              <div className="space-y-2">
                <Label>Pesquisar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cliente ou contrato..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            )}
          </div>

          {selectedFechamento && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
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
                {selectedVendedor !== "todos" ? "Gerar PDF" : "Gerar PDFs"}
              </Button>
              {selectedVendedor !== "todos" && (
                <Button
                  variant="outline"
                  onClick={handleGenerateHtml}
                  disabled={isGeneratingHtml || vendas.length === 0}
                >
                  {isGeneratingHtml ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Share2 className="w-4 h-4 mr-2" />
                  )}
                  Compartilhar HTML
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {selectedFechamento && vendasFiltradas.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Qtd Vendas</p>
              <p className="text-2xl font-bold">{totaisFiltrados.qtd}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">MRR Total</p>
              <p className="text-2xl font-bold text-cyan-600">{formatCurrency(totaisFiltrados.mrr)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">MRR Comissão</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totaisFiltrados.mrrComissao)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Faturamento Total</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(faturamentoTotal)}</p>
              <p className="text-xs text-muted-foreground">MRR × {ltvMedio} meses</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(ticketMedio)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Adesões</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(totaisFiltrados.adesao)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vendas Table */}
      {selectedFechamento && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-lg">
                📋 Vendas {selectedVendedor !== "todos" && `- ${selectedVendedor}`} 
                <Badge variant="secondary" className="ml-2">{vendasFiltradas.length}</Badge>
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-medium">Legenda:</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] px-1 bg-green-100 text-green-700">C</Badge>
                  <span>Comissão</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] px-1 bg-blue-100 text-blue-700">F</Badge>
                  <span>Faixa</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] px-1 bg-yellow-100 text-yellow-700">M</Badge>
                  <span>Meta</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingVendas ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : vendasFiltradas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada.</p>
            ) : (
              <div className="overflow-auto max-h-[500px] border rounded-md">
                <Table>
                  <TableHeader className="bg-primary/10 sticky top-0">
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none text-xs"
                        onClick={() => {
                          if (sortColumn === "data_contrato") {
                            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setSortColumn("data_contrato");
                            setSortDirection("desc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Data
                          {sortColumn === "data_contrato" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </TableHead>
                      <TableHead className="text-xs">Contrato</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none text-xs"
                        onClick={() => {
                          if (sortColumn === "cliente") {
                            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setSortColumn("cliente");
                            setSortDirection("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Cliente
                          {sortColumn === "cliente" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none text-xs"
                        onClick={() => {
                          if (sortColumn === "tipo_venda") {
                            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setSortColumn("tipo_venda");
                            setSortDirection("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Tipo
                          {sortColumn === "tipo_venda" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none text-xs"
                        onClick={() => {
                          if (sortColumn === "intervalo") {
                            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setSortColumn("intervalo");
                            setSortDirection("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Intervalo
                          {sortColumn === "intervalo" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none text-xs"
                        onClick={() => {
                          if (sortColumn === "vendedor") {
                            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setSortColumn("vendedor");
                            setSortDirection("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Vendedor
                          {sortColumn === "vendedor" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50 select-none text-xs"
                        onClick={() => {
                          if (sortColumn === "valor_mrr") {
                            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setSortColumn("valor_mrr");
                            setSortDirection("desc");
                          }
                        }}
                      >
                        <div className="flex items-center justify-end gap-1">
                          MRR
                          {sortColumn === "valor_mrr" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50 select-none text-xs"
                        onClick={() => {
                          if (sortColumn === "valor_assinatura") {
                            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setSortColumn("valor_assinatura");
                            setSortDirection("desc");
                          }
                        }}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Assinatura
                          {sortColumn === "valor_assinatura" ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </TableHead>
                      <TableHead className="text-right text-xs">Adesão</TableHead>
                      <TableHead className="text-center text-xs">Flags</TableHead>
                      {isRascunho && <TableHead className="text-center text-xs">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasFiltradas.map((venda, idx) => (
                      <TableRow key={venda.id} className={idx % 2 === 0 ? "bg-muted/20" : ""}>
                        <TableCell className="text-sm py-2">
                          {venda.data_contrato
                            ? format(new Date(venda.data_contrato + "T12:00:00"), "dd/MM/yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm py-2 font-mono text-xs">
                          {venda.num_contrato ? venda.num_contrato.substring(0, 20) : "-"}
                        </TableCell>
                        <TableCell className="text-sm py-2 max-w-[200px] truncate" title={venda.cliente || ""}>
                          {venda.cliente || "-"}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-xs">{venda.tipo_venda || "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm py-2">{venda.intervalo || "-"}</TableCell>
                        <TableCell className="text-sm py-2 font-medium">{venda.vendedor || "-"}</TableCell>
                        <TableCell className="text-right text-sm py-2 font-semibold text-cyan-600">
                          {formatCurrency(venda.valor_mrr)}
                        </TableCell>
                        <TableCell className="text-right text-sm py-2">
                          {formatCurrency(venda.valor_assinatura)}
                        </TableCell>
                        <TableCell className="text-right text-sm py-2">
                          {formatCurrency(venda.valor_adesao)}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <div className="flex justify-center gap-0.5">
                            {venda.conta_comissao && (
                              <Badge variant="outline" className="text-[10px] px-1 bg-green-100 text-green-700">
                                C
                              </Badge>
                            )}
                            {venda.conta_faixa && (
                              <Badge variant="outline" className="text-[10px] px-1 bg-blue-100 text-blue-700">
                                F
                              </Badge>
                            )}
                            {venda.conta_meta && (
                              <Badge variant="outline" className="text-[10px] px-1 bg-yellow-100 text-yellow-700">
                                M
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {isRascunho && (
                          <TableCell className="py-2">
                            <div className="flex justify-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEditVenda(venda)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDeleteVenda(venda.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-primary/20 sticky bottom-0">
                    <TableRow className="font-bold">
                      <TableCell colSpan={2} className="text-sm">Totais</TableCell>
                      <TableCell className="text-sm font-bold">{totaisFiltrados.qtd}</TableCell>
                      <TableCell colSpan={3}></TableCell>
                      <TableCell className="text-right text-sm font-bold text-cyan-700">
                        {formatCurrency(totaisFiltrados.mrr)}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right text-sm font-bold">
                        {formatCurrency(totaisFiltrados.adesao)}
                      </TableCell>
                      <TableCell></TableCell>
                      {isRascunho && <TableCell></TableCell>}
                    </TableRow>
                  </TableFooter>
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
