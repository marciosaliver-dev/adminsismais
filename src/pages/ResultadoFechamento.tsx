import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
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
import { ArrowLeft, Download, CheckCircle, Loader2, RefreshCw, Plus, Pencil, ExternalLink, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Tables } from "@/integrations/supabase/types";
import VendedorDetalhesModal from "@/components/comissoes/VendedorDetalhesModal";
import { AjusteComissaoModal } from "@/components/comissoes/AjusteComissaoModal";
import { AjustesListCard } from "@/components/comissoes/AjustesListCard";
import { ResumoFechamentoCard } from "@/components/comissoes/ResumoFechamentoCard";

type FechamentoComissao = Tables<"fechamento_comissao">;
type ComissaoCalculada = Tables<"comissao_calculada">;
type ConfiguracaoComissao = Tables<"configuracao_comissao">;
type FaixaComissao = Tables<"faixa_comissao">;
type VendaImportada = Tables<"venda_importada">;

interface AjusteComissao {
  id: string;
  fechamento_id: string;
  vendedor: string;
  tipo: string;
  valor: number;
  descricao: string;
  created_at: string;
  created_by: string | null;
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

// Cores das faixas
const getFaixaColor = (faixaNome: string | null) => {
  const nome = faixaNome?.toLowerCase() || "";
  if (nome.includes("início")) return "bg-muted text-muted-foreground";
  if (nome.includes("em ação")) return "bg-orange-100 text-orange-700 border-orange-300";
  if (nome.includes("starter")) return "bg-yellow-100 text-yellow-700 border-yellow-300";
  if (nome.includes("pro")) return "bg-blue-100 text-blue-700 border-blue-300";
  if (nome.includes("elite i") && !nome.includes("elite ii")) return "bg-green-100 text-green-700 border-green-300";
  if (nome.includes("elite ii") || nome.includes("lenda")) return "bg-amber-100 text-amber-700 border-amber-300";
  return "bg-muted text-muted-foreground";
};

export default function ResultadoFechamento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [selectedComissao, setSelectedComissao] = useState<ComissaoCalculada | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [ajusteModalOpen, setAjusteModalOpen] = useState(false);
  const [isAddingAjuste, setIsAddingAjuste] = useState(false);

  // Fetch fechamento
  const { data: fechamento, isLoading: loadingFechamento } = useQuery({
    queryKey: ["fechamento", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fechamento_comissao")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as FechamentoComissao | null;
    },
    enabled: !!id,
  });

  // Fetch comissões calculadas
  const { data: comissoes = [], isLoading: loadingComissoes } = useQuery({
    queryKey: ["comissoes_calculadas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comissao_calculada")
        .select("*")
        .eq("fechamento_id", id)
        .order("total_receber", { ascending: false });
      if (error) throw error;
      return data as ComissaoCalculada[];
    },
    enabled: !!id,
  });

  // Fetch ajustes
  const { data: ajustes = [] } = useQuery({
    queryKey: ["ajustes_comissao", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ajuste_comissao")
        .select("*")
        .eq("fechamento_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AjusteComissao[];
    },
    enabled: !!id,
  });

  // Fetch configurações
  const { data: configuracoes = [] } = useQuery({
    queryKey: ["configuracao_comissao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracao_comissao")
        .select("*");
      if (error) throw error;
      return data as ConfiguracaoComissao[];
    },
  });

  // Fetch meta mensal
  const { data: metaMensal } = useQuery({
    queryKey: ["meta_mensal", fechamento?.mes_referencia],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_mensal")
        .select("*")
        .eq("mes_referencia", fechamento?.mes_referencia)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!fechamento?.mes_referencia,
  });

  // Fetch faixas para exportação
  const { data: faixas = [] } = useQuery({
    queryKey: ["faixas_comissao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faixa_comissao")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as FaixaComissao[];
    },
  });

  const metaMrr = metaMensal?.meta_mrr || parseFloat(configuracoes.find((c) => c.chave === "meta_mrr")?.valor || "0");
  const bonusEquipePercent = (metaMensal?.bonus_meta_equipe || 10) / 100;
  const bonusEmpresaPercent = (metaMensal?.bonus_meta_empresa || 10) / 100;
  const totalColaboradores = metaMensal?.num_colaboradores || comissoes.length;
  
  // Calcular MRR base de comissão (soma de mrr_comissao de todos vendedores)
  const mrrBaseComissao = comissoes.reduce((sum, c) => sum + c.mrr_comissao, 0);
  
  // Calcular bônus com base nos parâmetros corretos
  // Bonus Equipe: (MRR Base Comissão * % bonus equipe) - distribuído proporcionalmente
  const bonusEquipeTotal = mrrBaseComissao * bonusEquipePercent;
  // Bonus Empresa: (MRR Base Comissão * % bonus empresa) / num colaboradores
  const bonusEmpresaTotal = fechamento?.meta_batida ? (mrrBaseComissao * bonusEmpresaPercent) : 0;

  // Add ajuste mutation
  const addAjusteMutation = useMutation({
    mutationFn: async (data: {
      vendedor: string;
      tipo: "credito" | "debito";
      valor: number;
      descricao: string;
    }) => {
      const { error } = await supabase.from("ajuste_comissao").insert({
        fechamento_id: id,
        vendedor: data.vendedor,
        tipo: data.tipo,
        valor: data.valor,
        descricao: data.descricao,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ajustes_comissao", id] });
      setAjusteModalOpen(false);
      toast({ title: "Sucesso!", description: "Ajuste adicionado." });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o ajuste.",
        variant: "destructive",
      });
    },
  });

  // Delete ajuste mutation
  const deleteAjusteMutation = useMutation({
    mutationFn: async (ajusteId: string) => {
      const { error } = await supabase
        .from("ajuste_comissao")
        .delete()
        .eq("id", ajusteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ajustes_comissao", id] });
      toast({ title: "Sucesso!", description: "Ajuste excluído." });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o ajuste.",
        variant: "destructive",
      });
    },
  });

  // Close month mutation
  const closeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("fechamento_comissao")
        .update({ status: "fechado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamento", id] });
      queryClient.invalidateQueries({ queryKey: ["fechamentos_comissao"] });
      setCloseDialogOpen(false);
      toast({ title: "Sucesso!", description: "Mês fechado com sucesso." });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível fechar o mês.",
        variant: "destructive",
      });
    },
  });

  // Recalculate commissions
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const { error } = await supabase.functions.invoke("calcular-comissoes", {
        body: { fechamento_id: id },
      });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["fechamento", id] });
      queryClient.invalidateQueries({ queryKey: ["comissoes_calculadas", id] });
      toast({ title: "Sucesso!", description: "Comissões recalculadas." });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao recalcular comissões.",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  // Handle add ajuste
  const handleAddAjuste = async (data: {
    vendedor: string;
    tipo: "credito" | "debito";
    valor: number;
    descricao: string;
  }) => {
    setIsAddingAjuste(true);
    try {
      await addAjusteMutation.mutateAsync(data);
    } finally {
      setIsAddingAjuste(false);
    }
  };

  // Export to Excel
  const handleExport = async () => {
    if (!fechamento || comissoes.length === 0) return;

    setIsExporting(true);

    try {
      const { data: vendas = [] } = await supabase
        .from("venda_importada")
        .select("*")
        .eq("fechamento_id", id)
        .order("data_contrato", { ascending: false });

      const mesAnoRef = format(parseISO(fechamento.mes_referencia + "T12:00:00"), "MMMM/yyyy", { locale: ptBR });
      const mesAnoFile = format(parseISO(fechamento.mes_referencia + "T12:00:00"), "yyyy-MM");

      // Calcular totais por tipo de venda
      const vendasTyped = vendas as VendaImportada[];
      const vendasPorTipo = vendasTyped.reduce((acc, v) => {
        const tipo = v.tipo_venda || "Não informado";
        if (!acc[tipo]) {
          acc[tipo] = { qtd: 0, mrr: 0, adesao: 0, assinatura: 0 };
        }
        acc[tipo].qtd += 1;
        acc[tipo].mrr += v.valor_mrr;
        acc[tipo].adesao += v.valor_adesao;
        acc[tipo].assinatura += v.valor_assinatura;
        return acc;
      }, {} as Record<string, { qtd: number; mrr: number; adesao: number; assinatura: number }>);

      // Vendas únicas e anuais
      const vendasUnicas = vendasTyped.filter(v => 
        v.intervalo?.toLowerCase().includes("única") || v.tipo_venda?.toLowerCase().includes("única")
      );
      const vendasAnuais = vendasTyped.filter(v => 
        v.intervalo?.toLowerCase() === "anual"
      );

      const totalVendasUnicas = vendasUnicas.reduce((acc, v) => acc + v.valor_adesao, 0);
      const totalVendasAnuais = vendasAnuais.reduce((acc, v) => acc + v.valor_mrr, 0);

      // ========== ABA 1: RESUMO ==========
      const resumoData: (string | number)[][] = [
        ["Fechamento de Comissões"],
        [mesAnoRef],
        [],
        ["INDICADORES GERAIS"],
        ["Total de Vendas:", fechamento.total_vendas],
        ["MRR Total Equipe:", fechamento.total_mrr],
        ["MRR Base Comissão:", mrrBaseComissao],
        ["Meta MRR:", metaMrr],
        ["Meta Batida:", fechamento.meta_batida ? "Sim" : "Não"],
        ["Data Processamento:", format(new Date(fechamento.data_importacao), "dd/MM/yyyy HH:mm")],
        [],
        ["VENDAS POR TIPO"],
      ];

      Object.entries(vendasPorTipo).forEach(([tipo, dados]) => {
        resumoData.push([tipo, `${dados.qtd} vendas`, `MRR: ${dados.mrr}`, `Adesão: ${dados.adesao}`]);
      });

      resumoData.push([]);
      resumoData.push(["VENDAS ÚNICAS"]);
      resumoData.push(["Quantidade:", vendasUnicas.length]);
      resumoData.push(["Valor Total:", totalVendasUnicas]);

      resumoData.push([]);
      resumoData.push(["VENDAS ANUAIS"]);
      resumoData.push(["Quantidade:", vendasAnuais.length]);
      resumoData.push(["MRR Anual:", totalVendasAnuais]);

      resumoData.push([]);
      resumoData.push(["COMISSÕES POR VENDEDOR"]);
      resumoData.push(["Vendedor", "Qtd Vendas", "MRR Faixa", "Faixa", "%", "Comissão Base", "Bônus Anual", "Bônus Meta", "Bônus Empresa", "Ajustes", "TOTAL"]);

      const totalsExport = { vendas: 0, mrrFaixa: 0, comissaoBase: 0, bonusAnual: 0, bonusMeta: 0, bonusEmpresa: 0, ajustes: 0, total: 0 };
      
      comissoes.forEach((c) => {
        const ajustesVendedor = ajustes
          .filter((a) => a.vendedor === c.vendedor)
          .reduce((acc, a) => acc + (a.tipo === "credito" ? a.valor : -a.valor), 0);
        
        const totalComAjuste = c.total_receber + ajustesVendedor;
        
        resumoData.push([
          c.vendedor,
          c.qtd_vendas,
          c.mrr_total,
          c.faixa_nome || "-",
          c.percentual,
          c.valor_comissao,
          c.bonus_anual,
          c.bonus_meta_equipe,
          c.bonus_empresa,
          ajustesVendedor,
          totalComAjuste,
        ]);
        totalsExport.vendas += c.qtd_vendas;
        totalsExport.mrrFaixa += c.mrr_total;
        totalsExport.comissaoBase += c.valor_comissao;
        totalsExport.bonusAnual += c.bonus_anual;
        totalsExport.bonusMeta += c.bonus_meta_equipe;
        totalsExport.bonusEmpresa += c.bonus_empresa;
        totalsExport.ajustes += ajustesVendedor;
        totalsExport.total += totalComAjuste;
      });

      resumoData.push([
        "TOTAL",
        totalsExport.vendas,
        totalsExport.mrrFaixa,
        "-",
        "-",
        totalsExport.comissaoBase,
        totalsExport.bonusAnual,
        totalsExport.bonusMeta,
        totalsExport.bonusEmpresa,
        totalsExport.ajustes,
        totalsExport.total,
      ]);

      // ========== ABA 2: VENDAS ==========
      const vendasData: (string | number | boolean)[][] = [
        ["Data", "Plataforma", "Contrato", "Cliente", "Email", "Plano", "Tipo Venda", "Intervalo", "Vendedor", "Assinatura", "MRR", "Adesão", "Conta Comissão", "Conta Faixa"],
      ];

      vendasTyped.forEach((v) => {
        vendasData.push([
          v.data_contrato ? format(new Date(v.data_contrato + "T12:00:00"), "dd/MM/yyyy") : "-",
          v.plataforma || "-",
          v.num_contrato || "-",
          v.cliente || "-",
          v.email || "-",
          v.plano || "-",
          v.tipo_venda || "-",
          v.intervalo || "-",
          v.vendedor || "-",
          v.valor_assinatura,
          v.valor_mrr,
          v.valor_adesao,
          v.conta_comissao ? "Sim" : "Não",
          v.conta_faixa ? "Sim" : "Não",
        ]);
      });

      // ========== ABA 3: VENDAS ÚNICAS ==========
      const vendasUnicasData: (string | number)[][] = [
        ["VENDAS ÚNICAS"],
        [],
        ["Data", "Cliente", "Plano", "Vendedor", "Valor"],
      ];

      vendasUnicas.forEach((v) => {
        vendasUnicasData.push([
          v.data_contrato ? format(new Date(v.data_contrato + "T12:00:00"), "dd/MM/yyyy") : "-",
          v.cliente || "-",
          v.plano || "-",
          v.vendedor || "-",
          v.valor_adesao,
        ]);
      });

      vendasUnicasData.push([]);
      vendasUnicasData.push(["TOTAL VENDAS ÚNICAS:", vendasUnicas.length, "", "", totalVendasUnicas]);

      // ========== ABA 4: VENDAS ANUAIS ==========
      const vendasAnuaisData: (string | number)[][] = [
        ["VENDAS ANUAIS"],
        [],
        ["Data", "Cliente", "Plano", "Vendedor", "MRR"],
      ];

      vendasAnuais.forEach((v) => {
        vendasAnuaisData.push([
          v.data_contrato ? format(new Date(v.data_contrato + "T12:00:00"), "dd/MM/yyyy") : "-",
          v.cliente || "-",
          v.plano || "-",
          v.vendedor || "-",
          v.valor_mrr,
        ]);
      });

      vendasAnuaisData.push([]);
      vendasAnuaisData.push(["TOTAL VENDAS ANUAIS:", vendasAnuais.length, "", "", totalVendasAnuais]);

      // ========== ABA 5: AJUSTES ==========
      const ajustesData: (string | number)[][] = [
        ["AJUSTES MANUAIS DE COMISSÃO"],
        [],
        ["Vendedor", "Tipo", "Valor", "Descrição", "Data"],
      ];

      const totalCreditos = ajustes.filter(a => a.tipo === "credito").reduce((acc, a) => acc + a.valor, 0);
      const totalDebitos = ajustes.filter(a => a.tipo === "debito").reduce((acc, a) => acc + a.valor, 0);

      ajustes.forEach((a) => {
        ajustesData.push([
          a.vendedor,
          a.tipo === "credito" ? "Crédito" : "Débito",
          a.tipo === "credito" ? a.valor : -a.valor,
          a.descricao,
          format(new Date(a.created_at), "dd/MM/yyyy HH:mm"),
        ]);
      });

      ajustesData.push([]);
      ajustesData.push(["RESUMO DE AJUSTES"]);
      ajustesData.push(["Total Créditos:", totalCreditos]);
      ajustesData.push(["Total Débitos:", totalDebitos]);
      ajustesData.push(["Saldo Ajustes:", totalCreditos - totalDebitos]);

      // ========== ABA 6: CONFIGURAÇÕES ==========
      const configData: (string | number)[][] = [
        ["CONFIGURAÇÕES"],
        [],
        ["Configuração", "Valor"],
      ];

      configuracoes.forEach((c) => {
        configData.push([c.chave, c.valor]);
      });

      configData.push([]);
      configData.push(["FAIXAS DE COMISSÃO"]);
      configData.push([]);
      configData.push(["Faixa", "MRR Mín", "MRR Máx", "Percentual"]);

      faixas.forEach((f) => {
        configData.push([
          f.nome,
          f.mrr_min,
          f.mrr_max || "Ilimitado",
          f.percentual,
        ]);
      });

      // Criar workbook
      const wb = XLSX.utils.book_new();

      const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
      wsResumo["!cols"] = [
        { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 8 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

      const wsVendas = XLSX.utils.aoa_to_sheet(vendasData);
      wsVendas["!cols"] = [
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 25 },
        { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, wsVendas, "Vendas");

      const wsVendasUnicas = XLSX.utils.aoa_to_sheet(vendasUnicasData);
      wsVendasUnicas["!cols"] = [{ wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsVendasUnicas, "Vendas Únicas");

      const wsVendasAnuais = XLSX.utils.aoa_to_sheet(vendasAnuaisData);
      wsVendasAnuais["!cols"] = [{ wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsVendasAnuais, "Vendas Anuais");

      const wsAjustes = XLSX.utils.aoa_to_sheet(ajustesData);
      wsAjustes["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 40 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsAjustes, "Ajustes");

      const wsConfig = XLSX.utils.aoa_to_sheet(configData);
      wsConfig["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsConfig, "Configurações");

      XLSX.writeFile(wb, `comissoes_${mesAnoFile}.xlsx`);

      toast({ title: "Exportado!", description: "Arquivo Excel gerado com sucesso." });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!fechamento || comissoes.length === 0) return;

    setIsExporting(true);

    try {
      // Buscar vendas para estatísticas
      const { data: vendas = [] } = await supabase
        .from("venda_importada")
        .select("*")
        .eq("fechamento_id", id);

      const vendasTyped = vendas as VendaImportada[];
      
      // Calcular totais por tipo de venda
      const vendasPorTipo = vendasTyped.reduce((acc, v) => {
        const tipo = v.tipo_venda || "Não informado";
        if (!acc[tipo]) {
          acc[tipo] = { qtd: 0, mrr: 0, adesao: 0 };
        }
        acc[tipo].qtd += 1;
        acc[tipo].mrr += v.valor_mrr;
        acc[tipo].adesao += v.valor_adesao;
        return acc;
      }, {} as Record<string, { qtd: number; mrr: number; adesao: number }>);

      // Vendas únicas e anuais
      const vendasUnicas = vendasTyped.filter(v => 
        v.intervalo?.toLowerCase().includes("única") || v.tipo_venda?.toLowerCase().includes("única")
      );
      const vendasAnuais = vendasTyped.filter(v => 
        v.intervalo?.toLowerCase() === "anual"
      );

      const totalVendasUnicas = vendasUnicas.reduce((acc, v) => acc + v.valor_adesao, 0);
      const totalVendasAnuais = vendasAnuais.reduce((acc, v) => acc + v.valor_mrr, 0);

      const mesAnoRef = format(parseISO(fechamento.mes_referencia + "T12:00:00"), "MMMM/yyyy", { locale: ptBR });
      const mesAnoFile = format(parseISO(fechamento.mes_referencia + "T12:00:00"), "yyyy-MM");

      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text("Fechamento de Comissões", 14, 20);
      doc.setFontSize(14);
      doc.text(mesAnoRef.charAt(0).toUpperCase() + mesAnoRef.slice(1), 14, 28);

      // Summary - Indicadores
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("INDICADORES GERAIS", 14, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Total de Vendas: ${fechamento.total_vendas}`, 14, 47);
      doc.text(`MRR Total Equipe: ${formatCurrency(fechamento.total_mrr)}`, 14, 53);
      doc.text(`MRR Base Comissão: ${formatCurrency(mrrBaseComissao)}`, 100, 47);
      doc.text(`Meta MRR: ${formatCurrency(metaMrr)}`, 100, 53);
      doc.text(`Status: ${fechamento.meta_batida ? "✓ Meta Batida" : "✗ Meta Não Batida"}`, 14, 59);

      // Vendas por Tipo
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("VENDAS POR TIPO", 14, 70);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      let yPos = 77;
      Object.entries(vendasPorTipo).forEach(([tipo, dados]) => {
        doc.text(`${tipo}: ${dados.qtd} vendas | MRR: ${formatCurrency(dados.mrr)} | Adesão: ${formatCurrency(dados.adesao)}`, 14, yPos);
        yPos += 5;
      });

      // Vendas Únicas e Anuais
      yPos += 3;
      doc.setFontSize(9);
      doc.text(`Vendas Únicas: ${vendasUnicas.length} | Total: ${formatCurrency(totalVendasUnicas)}`, 14, yPos);
      doc.text(`Vendas Anuais: ${vendasAnuais.length} | MRR: ${formatCurrency(totalVendasAnuais)}`, 100, yPos);

      // Table data
      yPos += 10;
      const tableData = comissoes.map((c) => {
        const ajustesVendedor = ajustes
          .filter((a) => a.vendedor === c.vendedor)
          .reduce((acc, a) => acc + (a.tipo === "credito" ? a.valor : -a.valor), 0);
        
        return [
          c.vendedor,
          c.qtd_vendas.toString(),
          formatCurrency(c.mrr_total),
          c.faixa_nome || "-",
          `${c.percentual}%`,
          formatCurrency(c.valor_comissao),
          formatCurrency(c.bonus_anual + c.bonus_meta_equipe + c.bonus_empresa),
          formatCurrency(ajustesVendedor),
          formatCurrency(c.total_receber + ajustesVendedor),
        ];
      });

      // Totals row
      const totalAjustes = ajustes.reduce((acc, a) => acc + (a.tipo === "credito" ? a.valor : -a.valor), 0);
      const totals = comissoes.reduce(
        (acc, c) => ({
          vendas: acc.vendas + c.qtd_vendas,
          mrrTotal: acc.mrrTotal + c.mrr_total,
          comissao: acc.comissao + c.valor_comissao,
          bonus: acc.bonus + c.bonus_anual + c.bonus_meta_equipe + c.bonus_empresa,
          total: acc.total + c.total_receber,
        }),
        { vendas: 0, mrrTotal: 0, comissao: 0, bonus: 0, total: 0 }
      );

      tableData.push([
        "TOTAL",
        totals.vendas.toString(),
        formatCurrency(totals.mrrTotal),
        "-",
        "-",
        formatCurrency(totals.comissao),
        formatCurrency(totals.bonus),
        formatCurrency(totalAjustes),
        formatCurrency(totals.total + totalAjustes),
      ]);

      autoTable(doc, {
        head: [["Vendedor", "Vendas", "MRR", "Faixa", "%", "Comissão", "Bônus", "Ajustes", "Total"]],
        body: tableData,
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [69, 229, 229] },
        footStyles: { fillColor: [240, 240, 240] },
      });

      // Ajustes detalhados
      if (ajustes.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("AJUSTES MANUAIS DE COMISSÃO", 14, finalY + 15);
        doc.setFont("helvetica", "normal");

        const ajustesTableData = ajustes.map(a => [
          a.vendedor,
          a.tipo === "credito" ? "Crédito" : "Débito",
          formatCurrency(a.tipo === "credito" ? a.valor : -a.valor),
          a.descricao,
          format(new Date(a.created_at), "dd/MM/yyyy"),
        ]);

        const totalCreditos = ajustes.filter(a => a.tipo === "credito").reduce((acc, a) => acc + a.valor, 0);
        const totalDebitos = ajustes.filter(a => a.tipo === "debito").reduce((acc, a) => acc + a.valor, 0);

        ajustesTableData.push([
          "TOTAL",
          "",
          formatCurrency(totalCreditos - totalDebitos),
          `Créditos: ${formatCurrency(totalCreditos)} | Débitos: ${formatCurrency(totalDebitos)}`,
          "",
        ]);

        autoTable(doc, {
          head: [["Vendedor", "Tipo", "Valor", "Descrição", "Data"]],
          body: ajustesTableData,
          startY: finalY + 20,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [100, 100, 100] },
        });
      }

      // Vendas Únicas detalhadas (nova página se necessário)
      if (vendasUnicas.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("VENDAS ÚNICAS", 14, 20);
        doc.setFont("helvetica", "normal");

        const vendasUnicasData = vendasUnicas.map(v => [
          v.data_contrato ? format(new Date(v.data_contrato + "T12:00:00"), "dd/MM/yyyy") : "-",
          v.cliente || "-",
          v.plano || "-",
          v.vendedor || "-",
          formatCurrency(v.valor_adesao),
        ]);

        vendasUnicasData.push([
          "TOTAL",
          `${vendasUnicas.length} vendas`,
          "",
          "",
          formatCurrency(totalVendasUnicas),
        ]);

        autoTable(doc, {
          head: [["Data", "Cliente", "Plano", "Vendedor", "Valor"]],
          body: vendasUnicasData,
          startY: 30,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [255, 159, 64] },
        });

        // Vendas Anuais
        const finalYUnicas = (doc as any).lastAutoTable.finalY || 80;
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("VENDAS ANUAIS", 14, finalYUnicas + 15);
        doc.setFont("helvetica", "normal");

        if (vendasAnuais.length > 0) {
          const vendasAnuaisData = vendasAnuais.map(v => [
            v.data_contrato ? format(new Date(v.data_contrato + "T12:00:00"), "dd/MM/yyyy") : "-",
            v.cliente || "-",
            v.plano || "-",
            v.vendedor || "-",
            formatCurrency(v.valor_mrr),
          ]);

          vendasAnuaisData.push([
            "TOTAL",
            `${vendasAnuais.length} vendas`,
            "",
            "",
            formatCurrency(totalVendasAnuais),
          ]);

          autoTable(doc, {
            head: [["Data", "Cliente", "Plano", "Vendedor", "MRR"]],
            body: vendasAnuaisData,
            startY: finalYUnicas + 20,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [54, 162, 235] },
          });
        }
      }

      doc.save(`comissoes_${mesAnoFile}.pdf`);

      toast({ title: "Exportado!", description: "Arquivo PDF gerado com sucesso." });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar o PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (loadingFechamento) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!fechamento) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Fechamento não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/comissoes")}>
          Voltar
        </Button>
      </div>
    );
  }

  const mesAno = format(parseISO(fechamento.mes_referencia + "T12:00:00"), "MMMM/yyyy", { locale: ptBR });
  const vendedores = comissoes.map((c) => ({ nome: c.vendedor }));

  // Calculate totals with adjustments
  const totals = comissoes.reduce(
    (acc, c) => {
      const ajustesVendedor = ajustes
        .filter((a) => a.vendedor === c.vendedor)
        .reduce((sum, a) => sum + (a.tipo === "credito" ? a.valor : -a.valor), 0);
      
      return {
        vendas: acc.vendas + c.qtd_vendas,
        mrrTotal: acc.mrrTotal + c.mrr_total,
        comissao: acc.comissao + c.valor_comissao,
        bonusTotal: acc.bonusTotal + c.bonus_anual + c.bonus_meta_equipe + c.bonus_empresa,
        ajustes: acc.ajustes + ajustesVendedor,
        total: acc.total + c.total_receber + ajustesVendedor,
      };
    },
    { vendas: 0, mrrTotal: 0, comissao: 0, bonusTotal: 0, ajustes: 0, total: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/comissoes")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold capitalize">
              📊 Fechamento {mesAno}
            </h1>
          </div>
        </div>
        {fechamento.status === "rascunho" ? (
          <Badge variant="outline" className="bg-warning/20 text-warning border-warning text-sm px-3 py-1">
            Rascunho
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-success/20 text-success border-success text-sm px-3 py-1">
            Fechado
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{fechamento.total_vendas}</p>
          </CardContent>
        </Card>

        <Card className="bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-700 dark:text-cyan-400">MRR Total Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-700 dark:text-cyan-400">{formatCurrency(fechamento.total_mrr)}</p>
          </CardContent>
        </Card>

        <Card className="bg-cyan-100 dark:bg-cyan-900/40 border-cyan-300 dark:border-cyan-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-800 dark:text-cyan-300">MRR Base Comissão</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-800 dark:text-cyan-300">{formatCurrency(mrrBaseComissao)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Meta MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(metaMrr)}</p>
          </CardContent>
        </Card>

        <Card className={fechamento.meta_batida ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {fechamento.meta_batida ? (
              <p className="text-2xl font-bold text-success">✅ Meta Batida</p>
            ) : (
              <p className="text-2xl font-bold text-destructive">❌ Meta Não Batida</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo Card */}
      <ResumoFechamentoCard
        comissoes={comissoes}
        ajustes={ajustes}
        metaBatida={fechamento.meta_batida}
        mrrBaseComissao={mrrBaseComissao}
        bonusEquipePercent={bonusEquipePercent}
        bonusEmpresaPercent={bonusEmpresaPercent}
        bonusEquipeTotal={bonusEquipeTotal}
        bonusEmpresaTotal={bonusEmpresaTotal}
        totalColaboradores={totalColaboradores}
      />

      {/* Commissions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>💰 Comissões por Vendedor</CardTitle>
          <div className="flex gap-2">
            {fechamento.status === "rascunho" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAjusteModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajuste Manual
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/comissoes/relatorio-vendas?fechamento=${id}`)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Lançar Venda
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/comissoes/relatorio-vendas?fechamento=${id}`)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar Vendas
            </Button>
            {fechamento.status === "rascunho" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculate}
                disabled={isRecalculating}
              >
                {isRecalculating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Recalcular
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingComissoes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : comissoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma comissão calculada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-center">Vendas</TableHead>
                  <TableHead className="text-right">MRR Faixa</TableHead>
                  <TableHead className="text-center">% Part.</TableHead>
                  <TableHead className="text-center">Faixa</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Bônus</TableHead>
                  <TableHead className="text-right">Ajustes</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center w-12">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoes.map((comissao, index) => {
                  const ajustesVendedor = ajustes
                    .filter((a) => a.vendedor === comissao.vendedor)
                    .reduce((acc, a) => acc + (a.tipo === "credito" ? a.valor : -a.valor), 0);
                  const totalComAjuste = comissao.total_receber + ajustesVendedor;
                  
                  // Calcular % de participação no MRR Total
                  const participacaoPercent = totals.mrrTotal > 0 
                    ? (comissao.mrr_total / totals.mrrTotal) * 100 
                    : 0;
                  
                  return (
                    <TableRow
                      key={comissao.id}
                      className={`cursor-pointer hover:bg-muted/50 transition-colors ${index % 2 === 0 ? "bg-muted/30" : ""}`}
                      onClick={() => setSelectedComissao(comissao)}
                    >
                      <TableCell className="font-medium">{comissao.vendedor}</TableCell>
                      <TableCell className="text-center">{comissao.qtd_vendas}</TableCell>
                      <TableCell className="text-right">{formatCurrency(comissao.mrr_total)}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className="bg-primary/10 text-primary border-primary/30 font-semibold"
                        >
                          {participacaoPercent.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={getFaixaColor(comissao.faixa_nome)}
                        >
                          {comissao.faixa_nome || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{formatPercent(comissao.percentual)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(comissao.valor_comissao)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(comissao.bonus_anual + comissao.bonus_meta_equipe + comissao.bonus_empresa)}
                      </TableCell>
                      <TableCell className={`text-right ${ajustesVendedor >= 0 ? "text-success" : "text-destructive"}`}>
                        {ajustesVendedor !== 0 ? formatCurrency(ajustesVendedor) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(totalComAjuste)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/comissoes/relatorio-vendas?fechamento=${id}&vendedor=${encodeURIComponent(comissao.vendedor)}`);
                          }}
                          title="Ver vendas do vendedor"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-center">{totals.vendas}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.mrrTotal)}</TableCell>
                  <TableCell className="text-center">100%</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.comissao)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.bonusTotal)}</TableCell>
                  <TableCell className={`text-right ${totals.ajustes >= 0 ? "text-success" : "text-destructive"}`}>
                    {totals.ajustes !== 0 ? formatCurrency(totals.ajustes) : "-"}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ajustes List */}
      <AjustesListCard
        ajustes={ajustes}
        onDelete={(id) => deleteAjusteMutation.mutate(id)}
        onAdd={() => setAjusteModalOpen(true)}
        isReadOnly={fechamento.status !== "rascunho"}
      />

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button 
          variant="outline" 
          onClick={handleExportPDF} 
          disabled={comissoes.length === 0 || isExporting}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          PDF
        </Button>
        <Button 
          variant="outline" 
          onClick={handleExport} 
          disabled={comissoes.length === 0 || isExporting}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Excel
        </Button>
        {fechamento.status === "rascunho" && (
          <Button
            onClick={() => setCloseDialogOpen(true)}
            style={{ backgroundColor: "#45E5E5", color: "#10293f" }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Fechar Mês
          </Button>
        )}
      </div>

      {/* Close Month Dialog */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Mês</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja fechar o mês de {mesAno}? Após o fechamento, não será
              possível editar ou excluir os dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => closeMutation.mutate()}
              style={{ backgroundColor: "#45E5E5", color: "#10293f" }}
            >
              Confirmar Fechamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ajuste Modal */}
      <AjusteComissaoModal
        open={ajusteModalOpen}
        onOpenChange={setAjusteModalOpen}
        vendedores={vendedores}
        onSubmit={handleAddAjuste}
        isLoading={isAddingAjuste}
      />

      {/* Vendor Details Modal */}
      <VendedorDetalhesModal
        open={!!selectedComissao}
        onOpenChange={(open) => !open && setSelectedComissao(null)}
        comissao={selectedComissao}
        mesReferencia={fechamento.mes_referencia}
        metaBatida={fechamento.meta_batida}
      />
    </div>
  );
}
