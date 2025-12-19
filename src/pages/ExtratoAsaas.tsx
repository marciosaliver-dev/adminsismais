import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileSpreadsheet, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calculator,
  List,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { format, parse, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { TransactionSummaryGrid } from "@/components/extrato/TransactionSummaryGrid";
import { ActiveFiltersBar } from "@/components/extrato/ActiveFiltersBar";
import { LookerCards } from "@/components/extrato/LookerCards";
import { PeriodSummaryGrid } from "@/components/extrato/PeriodSummaryGrid";
import { formatarTipoTransacao, formatCurrency as formatCurrencyUtil, formatDateBR, parseDateBR } from "@/lib/extratoUtils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ImportacaoExtrato {
  id: string;
  created_at: string;
  arquivo_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_registros: number;
  registros_novos: number;
  registros_duplicados: number;
  total_creditos: number;
  total_debitos: number;
  saldo_final: number;
  status: string;
  observacao: string | null;
}

interface ExtratoRow {
  transacao_id: string;
  data: string;
  tipo_transacao: string;
  descricao: string;
  valor: number;
  saldo: number;
  fatura_parcelamento: string | null;
  fatura_cobranca: string | null;
  nota_fiscal: string | null;
  tipo_lancamento: string;
}

interface ExtratoAsaasRecord {
  id: string;
  created_at: string;
  importacao_id: string;
  transacao_id: string;
  data: string;
  tipo_transacao: string;
  descricao: string;
  valor: number;
  saldo: number;
  fatura_parcelamento: string | null;
  fatura_cobranca: string | null;
  nota_fiscal: string | null;
  tipo_lancamento: string;
}

type SortField = "data" | "tipo_transacao" | "valor" | "saldo";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 10;
const ITEMS_PER_PAGE_VISAO = 100;

const CHART_COLORS = ["#45E5E5", "#FFB800", "#22C55E", "#EF4444", "#8B5CF6"];

// Generate month options for last 24 months
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const date = subMonths(now, i);
    options.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: ptBR }),
    });
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();

export default function ExtratoAsaas() {
  const [activeTab, setActiveTab] = useState("importar");
  
  // Import tab state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [processProgress, setProcessProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState("");
  
  // Import result modal state
  const [showResultModal, setShowResultModal] = useState(false);
  const [importResult, setImportResult] = useState<{
    novos: number;
    duplicados: number;
    duplicadosIds: string[];
    importacaoId: string;
  } | null>(null);
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [importacaoToDelete, setImportacaoToDelete] = useState<ImportacaoExtrato | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Visão Geral tab state
  const [periodoPreset, setPeriodoPreset] = useState("ultimos3meses");
  const [mesInicio, setMesInicio] = useState(format(subMonths(new Date(), 2), "yyyy-MM"));
  const [mesFim, setMesFim] = useState(format(new Date(), "yyyy-MM"));
  const [tiposSelecionados, setTiposSelecionados] = useState<string[]>([]);
  const [lancamentoFiltro, setLancamentoFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPageVisao, setCurrentPageVisao] = useState(1);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch histórico de importações
  const { data: importacoes = [], isLoading: isLoadingImportacoes } = useQuery({
    queryKey: ["importacoes-extrato"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes_extrato")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ImportacaoExtrato[];
    },
  });

  // Fetch all extrato records for Visão Geral (with pagination to handle >1000 records)
  const { data: allTransacoes = [], isLoading: isLoadingTransacoes } = useQuery({
    queryKey: ["extrato-asaas-all"],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: ExtratoAsaasRecord[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("extrato_asaas")
          .select("*")
          .order("data", { ascending: false })
          .range(from, to);

        if (error) throw error;

        allData = [...allData, ...(data || [])];
        hasMore = (data?.length || 0) === PAGE_SIZE;
        page++;
      }

      return allData as ExtratoAsaasRecord[];
    },
    enabled: activeTab === "visao-geral",
  });

  // Create importacoes lookup map
  const importacoesMap = useMemo(() => {
    const map = new Map<string, ImportacaoExtrato>();
    importacoes.forEach(imp => map.set(imp.id, imp));
    return map;
  }, [importacoes]);

  // Handle preset changes
  const handlePresetChange = (preset: string) => {
    setPeriodoPreset(preset);
    const now = new Date();
    
    switch (preset) {
      case "estemes":
        setMesInicio(format(now, "yyyy-MM"));
        setMesFim(format(now, "yyyy-MM"));
        break;
      case "ultimomes":
        const lastMonth = subMonths(now, 1);
        setMesInicio(format(lastMonth, "yyyy-MM"));
        setMesFim(format(lastMonth, "yyyy-MM"));
        break;
      case "ultimos3meses":
        setMesInicio(format(subMonths(now, 2), "yyyy-MM"));
        setMesFim(format(now, "yyyy-MM"));
        break;
      case "esteano":
        setMesInicio(format(startOfYear(now), "yyyy-MM"));
        setMesFim(format(now, "yyyy-MM"));
        break;
    }
  };

  // Get unique tipos for filter
  const tiposUnicos = useMemo(() => {
    const tipos = new Set(allTransacoes.map(t => t.tipo_transacao));
    return Array.from(tipos).sort();
  }, [allTransacoes]);

  // Filter transações for Visão Geral
  const transacoesFiltradas = useMemo(() => {
    let filtered = [...allTransacoes];

    // Filter by period - comparar strings YYYY-MM-DD diretamente (sem Date objects)
    // Isso evita problemas de timezone
    const [anoInicio, mesInicioNum] = mesInicio.split("-").map(Number);
    const [anoFim, mesFimNum] = mesFim.split("-").map(Number);
    
    // Calcular último dia do mês final
    const ultimoDiaMesFim = new Date(anoFim, mesFimNum, 0).getDate();
    
    const inicioStr = `${mesInicio}-01`;
    const fimStr = `${mesFim}-${String(ultimoDiaMesFim).padStart(2, '0')}`;
    
    filtered = filtered.filter(t => {
      // Comparação direta de strings YYYY-MM-DD
      return t.data >= inicioStr && t.data <= fimStr;
    });

    // Filter by tipos
    if (tiposSelecionados.length > 0) {
      filtered = filtered.filter(t => tiposSelecionados.includes(t.tipo_transacao));
    }

    // Filter by lancamento
    if (lancamentoFiltro !== "todos") {
      filtered = filtered.filter(t => t.tipo_lancamento === lancamentoFiltro);
    }

    // Filter by search
    if (busca.trim()) {
      const searchLower = busca.toLowerCase();
      filtered = filtered.filter(t => 
        t.descricao.toLowerCase().includes(searchLower) ||
        t.tipo_transacao.toLowerCase().includes(searchLower) ||
        t.transacao_id.toLowerCase().includes(searchLower)
      );
    }

    // Sort - usar strings diretamente para datas (formato YYYY-MM-DD permite comparação lexicográfica)
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "data":
          // Comparar strings YYYY-MM-DD diretamente (funciona pois o formato é ordenável)
          aVal = a.data;
          bVal = b.data;
          break;
        case "tipo_transacao":
          aVal = a.tipo_transacao;
          bVal = b.tipo_transacao;
          break;
        case "valor":
          aVal = a.valor;
          bVal = b.valor;
          break;
        case "saldo":
          aVal = a.saldo;
          bVal = b.saldo;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allTransacoes, mesInicio, mesFim, tiposSelecionados, lancamentoFiltro, busca, sortField, sortOrder]);

  // Calculate metrics from filtered data
  const metrics = useMemo(() => {
    const creditos = transacoesFiltradas
      .filter(t => t.tipo_lancamento === "Crédito")
      .reduce((sum, t) => sum + Math.abs(t.valor), 0);
    
    const debitos = transacoesFiltradas
      .filter(t => t.tipo_lancamento === "Débito")
      .reduce((sum, t) => sum + Math.abs(t.valor), 0);
    
    return {
      totalCreditos: creditos,
      totalDebitos: debitos,
      resultado: creditos - debitos,
      totalTransacoes: transacoesFiltradas.length,
    };
  }, [transacoesFiltradas]);

  // Line chart data - monthly evolution
  const lineChartData = useMemo(() => {
    const grouped = transacoesFiltradas.reduce((acc, t) => {
      const monthKey = t.data.substring(0, 7); // YYYY-MM
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, creditos: 0, debitos: 0 };
      }
      if (t.tipo_lancamento === "Crédito") {
        acc[monthKey].creditos += Math.abs(t.valor);
      } else {
        acc[monthKey].debitos += Math.abs(t.valor);
      }
      return acc;
    }, {} as Record<string, { month: string; creditos: number; debitos: number }>);

    return Object.values(grouped)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => {
        const [year, month] = d.month.split("-");
        const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
        return {
          ...d,
          monthFormatted: `${monthNames[parseInt(month, 10) - 1]}/${year.slice(2)}`,
        };
      });
  }, [transacoesFiltradas]);

  // Top 5 tipos bar chart data
  const top5TiposData = useMemo(() => {
    const grouped = transacoesFiltradas.reduce((acc, t) => {
      const key = t.tipo_transacao;
      if (!acc[key]) acc[key] = 0;
      acc[key] += Math.abs(t.valor);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transacoesFiltradas]);

  // Pie chart data - Crédito vs Débito
  const pieData = useMemo(() => {
    return [
      { name: "Créditos", value: metrics.totalCreditos },
      { name: "Débitos", value: metrics.totalDebitos },
    ].filter(d => d.value > 0);
  }, [metrics]);

  // Paginação Import tab
  const totalPages = Math.ceil(importacoes.length / ITEMS_PER_PAGE);
  const paginatedImportacoes = importacoes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Paginação Visão Geral
  const totalPagesVisao = Math.ceil(transacoesFiltradas.length / ITEMS_PER_PAGE_VISAO);
  const paginatedTransacoes = transacoesFiltradas.slice(
    (currentPageVisao - 1) * ITEMS_PER_PAGE_VISAO,
    currentPageVisao * ITEMS_PER_PAGE_VISAO
  );

  // Reset page when filters change
  useMemo(() => {
    setCurrentPageVisao(1);
  }, [mesInicio, mesFim, tiposSelecionados, lancamentoFiltro, busca]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const clearFilters = () => {
    setPeriodoPreset("ultimos3meses");
    setMesInicio(format(subMonths(new Date(), 2), "yyyy-MM"));
    setMesFim(format(new Date(), "yyyy-MM"));
    setTiposSelecionados([]);
    setLancamentoFiltro("todos");
    setBusca("");
  };

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith(".csv") || droppedFile.name.endsWith(".xlsx"))) {
      setFile(droppedFile);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV ou XLSX.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Parser de data SEM timezone - usa parseDateBR do extratoUtils
  const parseDate = (dateValue: string | number | Date | null | undefined): string | null => {
    // Importa função do utils que trata todos os formatos sem timezone
    const { parseDateBR } = require("@/lib/extratoUtils");
    return parseDateBR(dateValue);
  };

  const parseValue = (valueStr: string): number => {
    if (!valueStr) return 0;
    const cleaned = valueStr.toString().trim().replace(/\s/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const extractPeriodo = (firstRow: string): { inicio: string | null; fim: string | null } => {
    const dateRegex = /(\d{2}\/\d{2}\/\d{4})/g;
    const matches = firstRow.match(dateRegex);
    if (matches && matches.length >= 2) {
      return {
        inicio: parseDate(matches[0]),
        fim: parseDate(matches[1]),
      };
    }
    return { inicio: null, fim: null };
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProcessProgress(0);
    setProcessStatus("Lendo arquivo...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Ler XLSX sem conversão automática de datas - manter como raw values
      const workbook = XLSX.read(arrayBuffer, { 
        type: "array",
        cellDates: false,  // NÃO converter para Date automaticamente
        cellText: true,    // Manter como texto quando possível
        raw: false         // Usar valores formatados
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false }) as string[][];

      if (rawData.length < 4) {
        throw new Error("Arquivo vazio ou formato inválido");
      }

      setProcessProgress(10);
      setProcessStatus("Extraindo período...");

      const periodoInfo = extractPeriodo(rawData[0]?.join(" ") || "");
      const dataRows = rawData.slice(3);
      const totalRows = dataRows.length;

      const registrosParaInserir: ExtratoRow[] = [];
      const transacoesIds: string[] = [];
      let totalCreditos = 0;
      let totalDebitos = 0;
      let saldoFinal = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const transacaoId = row[1]?.toString().trim();
        
        if (!transacaoId || row[2]?.toString().includes("Saldo Inicial")) {
          continue;
        }

        // Update progress every 50 rows
        if (i % 50 === 0) {
          setProcessProgress(10 + Math.floor((i / totalRows) * 40));
          setProcessStatus(`Processando linha ${i + 1} de ${totalRows}...`);
        }

        transacoesIds.push(transacaoId);

        const valor = parseValue(row[5]?.toString());
        const saldo = parseValue(row[6]?.toString());
        const tipoLancamento = row[11]?.toString().trim() || (valor >= 0 ? "Crédito" : "Débito");

        if (tipoLancamento === "Crédito" || valor > 0) {
          totalCreditos += Math.abs(valor);
        } else {
          totalDebitos += Math.abs(valor);
        }

        saldoFinal = saldo;

        registrosParaInserir.push({
          transacao_id: transacaoId,
          data: parseDate(row[0]?.toString()) || format(new Date(), "yyyy-MM-dd"),
          tipo_transacao: row[2]?.toString().trim() || "",
          descricao: row[4]?.toString().trim() || "",
          valor: valor,
          saldo: saldo,
          fatura_parcelamento: row[7]?.toString().trim() || null,
          fatura_cobranca: row[8]?.toString().trim() || null,
          nota_fiscal: row[9]?.toString().trim() || null,
          tipo_lancamento: tipoLancamento,
        });
      }

      setProcessProgress(55);
      setProcessStatus("Verificando duplicados...");

      // Fetch existing transacao_ids in batches to handle large arrays
      const existentesSet = new Set<string>();
      const BATCH_CHECK_SIZE = 500;
      for (let i = 0; i < transacoesIds.length; i += BATCH_CHECK_SIZE) {
        const batch = transacoesIds.slice(i, i + BATCH_CHECK_SIZE);
        const { data: existentes } = await supabase
          .from("extrato_asaas")
          .select("transacao_id")
          .in("transacao_id", batch);
        
        existentes?.forEach((e) => existentesSet.add(e.transacao_id));
      }

      const novosRegistros = registrosParaInserir.filter((r) => !existentesSet.has(r.transacao_id));
      const duplicadosIds = registrosParaInserir
        .filter((r) => existentesSet.has(r.transacao_id))
        .map((r) => r.transacao_id);
      const duplicados = duplicadosIds.length;

      setProcessProgress(70);
      setProcessStatus("Criando importação...");

      const { data: importacao, error: importError } = await supabase
        .from("importacoes_extrato")
        .insert({
          arquivo_nome: file.name,
          periodo_inicio: periodoInfo.inicio,
          periodo_fim: periodoInfo.fim,
          total_registros: registrosParaInserir.length,
          registros_novos: novosRegistros.length,
          registros_duplicados: duplicados,
          total_creditos: totalCreditos,
          total_debitos: totalDebitos,
          saldo_final: saldoFinal,
          status: "processando",
        })
        .select()
        .single();

      if (importError) throw importError;

      setProcessProgress(75);
      setProcessStatus("Inserindo transações...");

      // Insert in batches of 500 records
      const BATCH_INSERT_SIZE = 500;
      const registrosComImportacao = novosRegistros.map((r) => ({
        ...r,
        importacao_id: importacao.id,
      }));

      const totalLotes = Math.ceil(registrosComImportacao.length / BATCH_INSERT_SIZE);
      let insertedCount = 0;

      for (let i = 0; i < registrosComImportacao.length; i += BATCH_INSERT_SIZE) {
        const lote = registrosComImportacao.slice(i, i + BATCH_INSERT_SIZE);
        const loteAtual = Math.floor(i / BATCH_INSERT_SIZE) + 1;

        setProcessStatus(`Importando lote ${loteAtual} de ${totalLotes}... (${lote.length} registros)`);

        const { error: insertError } = await supabase
          .from("extrato_asaas")
          .insert(lote);

        if (insertError) {
          await supabase
            .from("importacoes_extrato")
            .update({ status: "erro", observacao: `Erro no lote ${loteAtual}: ${insertError.message}` })
            .eq("id", importacao.id);
          throw insertError;
        }

        insertedCount += lote.length;
        const progresso = 75 + Math.floor((insertedCount / registrosComImportacao.length) * 20);
        setProcessProgress(progresso);
      }

      setProcessProgress(96);
      setProcessStatus("Verificando contagem...");

      // Verify count after insertion
      const { count: realCount } = await supabase
        .from("extrato_asaas")
        .select("*", { count: "exact", head: true })
        .eq("importacao_id", importacao.id);

      if (realCount !== novosRegistros.length) {
        console.warn(`Esperado ${novosRegistros.length}, inserido ${realCount}`);
      }

      setProcessProgress(98);
      setProcessStatus("Finalizando...");

      await supabase
        .from("importacoes_extrato")
        .update({ 
          status: "concluido",
          registros_novos: realCount || novosRegistros.length
        })
        .eq("id", importacao.id);

      setProcessProgress(100);
      setProcessStatus("Concluído!");

      // Show result modal
      setImportResult({
        novos: realCount || novosRegistros.length,
        duplicados: duplicados,
        duplicadosIds: duplicadosIds,
        importacaoId: importacao.id,
      });
      setShowResultModal(true);

      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["importacoes-extrato"] });
      queryClient.invalidateQueries({ queryKey: ["extrato-asaas-all"] });
    } catch (error: any) {
      console.error("Erro ao processar arquivo:", error);
      toast({
        title: "Erro na importação",
        description: error.message || "Ocorreu um erro ao processar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessProgress(0);
      setProcessStatus("");
    }
  };

  const handleDeleteImportacao = async () => {
    if (!importacaoToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete transações first (cascade should handle this, but being explicit)
      await supabase
        .from("extrato_asaas")
        .delete()
        .eq("importacao_id", importacaoToDelete.id);
      
      // Delete importação
      const { error } = await supabase
        .from("importacoes_extrato")
        .delete()
        .eq("id", importacaoToDelete.id);
      
      if (error) throw error;
      
      toast({
        title: "Importação excluída com sucesso",
        description: `${importacaoToDelete.total_registros} transações foram removidas.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["importacoes-extrato"] });
      queryClient.invalidateQueries({ queryKey: ["extrato-asaas-all"] });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir a importação.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setImportacaoToDelete(null);
    }
  };

  const exportToExcel = (data: ExtratoAsaasRecord[], filename: string) => {
    const exportData = data.map(t => ({
      "Data": format(new Date(t.data + "T12:00:00"), "dd/MM/yyyy"),
      "Tipo Transação": t.tipo_transacao,
      "Descrição": t.descricao,
      "Valor": t.valor,
      "Saldo": t.saldo,
      "Fatura": t.fatura_cobranca || t.fatura_parcelamento || "",
      "Tipo Lançamento": t.tipo_lancamento,
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Extrato");
    
    const today = format(new Date(), "yyyy-MM-dd");
    XLSX.writeFile(wb, `${filename}_${today}.xlsx`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "concluido":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Concluído</Badge>;
      case "erro":
        return <Badge variant="destructive">Erro</Badge>;
      case "processando":
        return <Badge variant="secondary">Processando...</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? 
      <ChevronUp className="w-4 h-4 inline ml-1" /> : 
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Extrato Asaas</h1>
          <p className="text-muted-foreground mt-1">
            Importe e analise seus extratos financeiros
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="importar" className="data-[state=active]:bg-[#45E5E5] data-[state=active]:text-white">
              Importar
            </TabsTrigger>
            <TabsTrigger value="visao-geral" className="data-[state=active]:bg-[#45E5E5] data-[state=active]:text-white">
              Visão Geral
            </TabsTrigger>
          </TabsList>

          {/* Tab: Importar */}
          <TabsContent value="importar" className="space-y-6">
            {/* Upload Section */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Upload de Arquivo</CardTitle>
                <CardDescription>
                  Importe extratos no formato CSV ou XLSX exportados do Asaas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                    ${isDragging 
                      ? "border-[#45E5E5] bg-[#45E5E5]/10" 
                      : "border-muted-foreground/30 hover:border-[#45E5E5] hover:bg-muted/50"
                    }
                  `}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-foreground font-medium">
                    Arraste seu arquivo CSV ou XLSX aqui
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ou clique para selecionar
                  </p>
                </div>

                {file && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-8 h-8 text-[#45E5E5]" />
                        <div>
                          <p className="font-medium text-foreground">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={processFile}
                        disabled={isProcessing}
                        className="bg-[#45E5E5] hover:bg-[#3cd4d4] text-white"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          "Processar Importação"
                        )}
                      </Button>
                    </div>
                    
                    {/* Progress Bar */}
                    {isProcessing && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{processStatus}</span>
                          <span className="font-medium">{processProgress}%</span>
                        </div>
                        <Progress value={processProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Histórico de Importações */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Histórico de Importações</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingImportacoes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : importacoes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma importação realizada ainda.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data Import</TableHead>
                            <TableHead>Arquivo</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead className="text-right">Novos</TableHead>
                            <TableHead className="text-right">Duplicados</TableHead>
                            <TableHead className="text-right">Créditos</TableHead>
                            <TableHead className="text-right">Débitos</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedImportacoes.map((imp) => (
                            <TableRow
                              key={imp.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => navigate(`/extrato-asaas/${imp.id}`)}
                            >
                              <TableCell>
                                {format(new Date(imp.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="font-medium max-w-[200px] truncate">
                                {imp.arquivo_nome}
                              </TableCell>
                              <TableCell>
                                {imp.periodo_inicio && imp.periodo_fim
                                  ? `${format(new Date(imp.periodo_inicio + "T12:00:00"), "dd/MM")} - ${format(new Date(imp.periodo_fim + "T12:00:00"), "dd/MM/yy")}`
                                  : "-"
                                }
                              </TableCell>
                              <TableCell className="text-right text-emerald-600 font-medium">
                                {imp.registros_novos}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {imp.registros_duplicados}
                              </TableCell>
                              <TableCell className="text-right text-emerald-600">
                                {formatCurrency(imp.total_creditos)}
                              </TableCell>
                              <TableCell className="text-right text-red-500">
                                {formatCurrency(imp.total_debitos)}
                              </TableCell>
                              <TableCell>{getStatusBadge(imp.status)}</TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setImportacaoToDelete(imp);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a{" "}
                          {Math.min(currentPage * ITEMS_PER_PAGE, importacoes.length)} de{" "}
                          {importacoes.length} importações
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Próximo
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Visão Geral */}
          <TabsContent value="visao-geral" className="space-y-6">
            {/* Filtros de Período */}
            <Card className="bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Preset */}
                  <Select value={periodoPreset} onValueChange={handlePresetChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estemes">Este mês</SelectItem>
                      <SelectItem value="ultimomes">Último mês</SelectItem>
                      <SelectItem value="ultimos3meses">Últimos 3 meses</SelectItem>
                      <SelectItem value="esteano">Este ano</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Mês Início */}
                  <Select value={mesInicio} onValueChange={(v) => { setMesInicio(v); setPeriodoPreset("personalizado"); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Mês inicial" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-muted-foreground">até</span>

                  {/* Mês Fim */}
                  <Select value={mesFim} onValueChange={(v) => { setMesFim(v); setPeriodoPreset("personalizado"); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Mês final" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Lançamento */}
                  <Select value={lancamentoFiltro} onValueChange={setLancamentoFiltro}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Lançamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="Crédito">Crédito</SelectItem>
                      <SelectItem value="Débito">Débito</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Clear Filters */}
                  <Button variant="ghost" onClick={clearFilters} size="sm">
                    <X className="w-4 h-4 mr-1" />
                    Limpar filtros
                  </Button>

                  {/* Export Button */}
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToExcel(transacoesFiltradas, "extrato_asaas_visao_geral")}
                    disabled={transacoesFiltradas.length === 0}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card shadow-sm border-l-4 border-l-emerald-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-emerald-100">
                      <TrendingUp className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Recebido</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(metrics.totalCreditos)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card shadow-sm border-l-4 border-l-red-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-red-100">
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Taxas</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(metrics.totalDebitos)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card shadow-sm border-l-4 border-l-primary">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/20">
                      <Calculator className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Resultado Líquido</p>
                      <p className="text-2xl font-bold text-secondary">
                        {formatCurrency(metrics.resultado)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card shadow-sm border-l-4 border-l-accent">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-accent/20">
                      <List className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transações</p>
                      <p className="text-2xl font-bold text-foreground">
                        {metrics.totalTransacoes}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Grid de Resumo + Looker Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <TransactionSummaryGrid
                  transacoes={transacoesFiltradas.map(t => ({
                    tipo_transacao: t.tipo_transacao,
                    valor: t.valor,
                    tipo_lancamento: t.tipo_lancamento,
                  }))}
                  selectedTipos={tiposSelecionados}
                  onSelectionChange={setTiposSelecionados}
                />
              </div>
              <div className="lg:col-span-1">
                <LookerCards
                  recordCount={transacoesFiltradas.length}
                  totalValue={transacoesFiltradas.reduce((sum, t) => sum + t.valor, 0)}
                />
              </div>
            </div>

            {/* Resumo por Período do Mês */}
            <PeriodSummaryGrid
              transacoes={transacoesFiltradas.map(t => ({
                data: t.data,
                valor: t.valor,
                tipo_lancamento: t.tipo_lancamento,
              }))}
            />

            {/* Active Filters Bar */}
            <ActiveFiltersBar
              selectedTipos={tiposSelecionados}
              onRemoveTipo={(tipo) => setTiposSelecionados(prev => prev.filter(t => t !== tipo))}
              onClearAll={() => setTiposSelecionados([])}
            />

            {/* Charts */}
            {isLoadingTransacoes ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Line Chart - Evolução Mensal */}
                  <Card className="bg-white shadow-sm lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Evolução Mensal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {lineChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={lineChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="monthFormatted" fontSize={12} />
                            <YAxis fontSize={12} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="creditos" name="Créditos" stroke="#22C55E" strokeWidth={2} dot={{ fill: "#22C55E" }} />
                            <Line type="monotone" dataKey="debitos" name="Débitos" stroke="#EF4444" strokeWidth={2} dot={{ fill: "#EF4444" }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          Sem dados para o período selecionado
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Bar Chart - Top 5 Tipos */}
                  <Card className="bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Top 5 Tipos de Transação</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {top5TiposData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={top5TiposData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" fontSize={12} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" fontSize={11} width={150} tickFormatter={(val) => val.length > 25 ? val.substring(0, 25) + '...' : val} />
                            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                            <Bar dataKey="value" name="Valor" fill="#45E5E5" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          Sem dados para exibir
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pie Chart - Crédito vs Débito */}
                  <Card className="bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Distribuição Crédito/Débito</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                              <Cell fill="#22C55E" />
                              <Cell fill="#EF4444" />
                            </Pie>
                            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          Sem dados para exibir
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Transactions Table */}
                <Card className="bg-white shadow-sm">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <CardTitle className="text-lg">Transações</CardTitle>
                      <div className="relative w-full sm:w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar na descrição..."
                          value={busca}
                          onChange={(e) => setBusca(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead 
                              className="cursor-pointer hover:text-foreground"
                              onClick={() => handleSort("data")}
                            >
                              Data <SortIcon field="data" />
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:text-foreground"
                              onClick={() => handleSort("tipo_transacao")}
                            >
                              Tipo de Transação <SortIcon field="tipo_transacao" />
                            </TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Fatura</TableHead>
                            <TableHead 
                              className="text-right cursor-pointer hover:text-foreground"
                              onClick={() => handleSort("valor")}
                            >
                              Valor <SortIcon field="valor" />
                            </TableHead>
                            <TableHead 
                              className="text-right cursor-pointer hover:text-foreground"
                              onClick={() => handleSort("saldo")}
                            >
                              Saldo <SortIcon field="saldo" />
                            </TableHead>
                            <TableHead>Importação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedTransacoes.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                Nenhuma transação encontrada
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedTransacoes.map((t, idx) => (
                              <TableRow 
                                key={t.id} 
                                className={idx % 2 === 0 ? "bg-card" : "bg-muted/30"}
                              >
                                <TableCell>{formatDate(t.data)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-normal">
                                    {formatarTipoTransacao(t.tipo_transacao)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[200px]">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block truncate cursor-help">
                                        {t.descricao}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[400px]">
                                      {t.descricao}
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {t.fatura_cobranca || t.fatura_parcelamento || "-"}
                                </TableCell>
                                <TableCell className={`text-right font-medium ${
                                  t.tipo_lancamento === "Crédito" ? "text-emerald-600" : "text-red-500"
                                }`}>
                                  {t.tipo_lancamento === "Crédito" ? "+" : "-"}
                                  {formatCurrency(Math.abs(t.valor))}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(t.saldo)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/extrato-asaas/${t.importacao_id}`)}
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell colSpan={4}>Total geral</TableCell>
                            <TableCell className={`text-right font-bold ${
                              transacoesFiltradas.reduce((sum, t) => sum + t.valor, 0) >= 0 ? "text-emerald-600" : "text-red-500"
                            }`}>
                              {formatCurrency(transacoesFiltradas.reduce((sum, t) => sum + t.valor, 0))}
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>

                    {totalPagesVisao > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Mostrando {((currentPageVisao - 1) * ITEMS_PER_PAGE_VISAO) + 1} a{" "}
                          {Math.min(currentPageVisao * ITEMS_PER_PAGE_VISAO, transacoesFiltradas.length)} de{" "}
                          {transacoesFiltradas.length} transações
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPageVisao((p) => Math.max(1, p - 1))}
                            disabled={currentPageVisao === 1}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPageVisao((p) => Math.min(totalPagesVisao, p + 1))}
                            disabled={currentPageVisao === totalPagesVisao}
                          >
                            Próximo
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir importação</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir importação "{importacaoToDelete?.arquivo_nome}"? 
              Isso removerá {importacaoToDelete?.total_registros} transações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImportacao}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importação Concluída</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-foreground">
                {importResult?.novos} transações importadas com sucesso
              </span>
            </div>
            {importResult?.duplicados && importResult.duplicados > 0 && (
              <Collapsible>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span className="text-foreground">
                    {importResult.duplicados} transações ignoradas (já existiam)
                  </span>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-auto">
                      Ver IDs
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="mt-2">
                  <div className="max-h-[150px] overflow-y-auto bg-muted rounded p-2 text-xs font-mono">
                    {importResult.duplicadosIds.slice(0, 50).map((id, idx) => (
                      <div key={idx} className="py-0.5">{id}</div>
                    ))}
                    {importResult.duplicadosIds.length > 50 && (
                      <div className="py-0.5 text-muted-foreground">
                        ... e mais {importResult.duplicadosIds.length - 50}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResultModal(false)}
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                setShowResultModal(false);
                if (importResult?.importacaoId) {
                  navigate(`/extrato-asaas/${importResult.importacaoId}`);
                }
              }}
              className="bg-[#45E5E5] hover:bg-[#3cd4d4] text-white"
            >
              Ver Extrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
