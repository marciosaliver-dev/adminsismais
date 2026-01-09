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
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileSpreadsheet, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Calculator,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { format, subMonths, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
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

interface ImportacaoEduzz {
  id: string;
  created_at: string;
  arquivo_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_registros: number;
  registros_novos: number;
  registros_duplicados: number;
  total_vendas: number;
  status: string;
  observacao: string | null;
}

interface ExtratoEduzzRecord {
  id: string;
  created_at: string;
  importacao_id: string;
  fatura_id: string;
  data: string;
  tipo_transacao: string;
  descricao: string;
  valor: number;
}

type SortField = "data" | "tipo_transacao" | "valor" | "descricao";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 10;
const ITEMS_PER_PAGE_VISAO = 100;
const CHART_COLORS = ["#45E5E5", "#FFB800", "#22C55E", "#EF4444", "#8B5CF6"];

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

export default function ExtratoEduzz() {
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
  const [importacaoToDelete, setImportacaoToDelete] = useState<ImportacaoEduzz | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Visão Geral tab state
  const [periodoPreset, setPeriodoPreset] = useState("ultimos3meses");
  const [mesInicio, setMesInicio] = useState(format(subMonths(new Date(), 2), "yyyy-MM"));
  const [mesFim, setMesFim] = useState(format(new Date(), "yyyy-MM"));
  const [tiposSelecionados, setTiposSelecionados] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPageVisao, setCurrentPageVisao] = useState(1);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch histórico de importações
  const { data: importacoes = [], isLoading: isLoadingImportacoes } = useQuery({
    queryKey: ["importacoes-extrato-eduzz"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes_extrato_eduzz")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ImportacaoEduzz[];
    },
  });

  // Fetch all extrato records for Visão Geral
  const { data: allTransacoes = [], isLoading: isLoadingTransacoes } = useQuery({
    queryKey: ["extrato-eduzz-all"],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: ExtratoEduzzRecord[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("extrato_eduzz")
          .select("*")
          .order("data", { ascending: false })
          .range(from, to);

        if (error) throw error;

        allData = [...allData, ...(data || [])];
        hasMore = (data?.length || 0) === PAGE_SIZE;
        page++;
      }

      return allData as ExtratoEduzzRecord[];
    },
    enabled: activeTab === "visao-geral",
  });

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

    const [anoInicio, mesInicioNum] = mesInicio.split("-").map(Number);
    const [anoFim, mesFimNum] = mesFim.split("-").map(Number);
    const ultimoDiaMesFim = new Date(anoFim, mesFimNum, 0).getDate();
    
    const inicioStr = `${mesInicio}-01`;
    const fimStr = `${mesFim}-${String(ultimoDiaMesFim).padStart(2, '0')}`;
    
    filtered = filtered.filter(t => t.data >= inicioStr && t.data <= fimStr);

    if (tiposSelecionados.length > 0) {
      filtered = filtered.filter(t => tiposSelecionados.includes(t.tipo_transacao));
    }

    if (busca.trim()) {
      const searchLower = busca.toLowerCase();
      filtered = filtered.filter(t => 
        t.descricao.toLowerCase().includes(searchLower) ||
        t.tipo_transacao.toLowerCase().includes(searchLower) ||
        t.fatura_id.toLowerCase().includes(searchLower)
      );
    }

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "data":
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
        case "descricao":
          aVal = a.descricao;
          bVal = b.descricao;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allTransacoes, mesInicio, mesFim, tiposSelecionados, busca, sortField, sortOrder]);

  // Calculate metrics from filtered data
  const metrics = useMemo(() => {
    const totalVendas = transacoesFiltradas.reduce((sum, t) => sum + t.valor, 0);
    
    return {
      totalVendas,
      totalTransacoes: transacoesFiltradas.length,
      ticketMedio: transacoesFiltradas.length > 0 ? totalVendas / transacoesFiltradas.length : 0,
    };
  }, [transacoesFiltradas]);

  // Line chart data - monthly evolution
  const lineChartData = useMemo(() => {
    const grouped = transacoesFiltradas.reduce((acc, t) => {
      const monthKey = t.data.substring(0, 7);
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, vendas: 0, quantidade: 0 };
      }
      acc[monthKey].vendas += t.valor;
      acc[monthKey].quantidade += 1;
      return acc;
    }, {} as Record<string, { month: string; vendas: number; quantidade: number }>);

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

  // Top 5 products bar chart data
  const top5ProdutosData = useMemo(() => {
    const grouped = transacoesFiltradas.reduce((acc, t) => {
      // Extrair o nome do produto (simplificado)
      const key = t.descricao.split(" - ")[0];
      if (!acc[key]) acc[key] = 0;
      acc[key] += t.valor;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name: name.length > 30 ? name.substring(0, 30) + "..." : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transacoesFiltradas]);

  // Pie chart data - by tipo
  const pieData = useMemo(() => {
    const grouped = transacoesFiltradas.reduce((acc, t) => {
      if (!acc[t.tipo_transacao]) acc[t.tipo_transacao] = 0;
      acc[t.tipo_transacao] += t.valor;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0);
  }, [transacoesFiltradas]);

  // Pagination Import tab
  const totalPages = Math.ceil(importacoes.length / ITEMS_PER_PAGE);
  const paginatedImportacoes = importacoes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Pagination Visão Geral
  const totalPagesVisao = Math.ceil(transacoesFiltradas.length / ITEMS_PER_PAGE_VISAO);
  const paginatedTransacoes = transacoesFiltradas.slice(
    (currentPageVisao - 1) * ITEMS_PER_PAGE_VISAO,
    currentPageVisao * ITEMS_PER_PAGE_VISAO
  );

  useMemo(() => {
    setCurrentPageVisao(1);
  }, [mesInicio, mesFim, tiposSelecionados, busca]);

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
    setBusca("");
  };

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
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV.",
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

  const parseDate = (dateStr: string): string => {
    if (!dateStr) return format(new Date(), "yyyy-MM-dd");
    // Format: DD/MM/YYYY
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return format(new Date(), "yyyy-MM-dd");
  };

  const parseValue = (valueStr: string): number => {
    if (!valueStr) return 0;
    // Format: 568,01 (Brazilian format)
    const cleaned = valueStr.toString().trim().replace(/\s/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProcessProgress(0);
    setProcessStatus("Lendo arquivo...");

    try {
      const text = await file.text();
      // CSV with semicolon separator
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error("Arquivo vazio ou formato inválido");
      }

      setProcessProgress(10);
      setProcessStatus("Processando registros...");

      // Skip header line
      const dataLines = lines.slice(1);
      const totalRows = dataLines.length;

      interface EduzzRow {
        fatura_id: string;
        data: string;
        tipo_transacao: string;
        descricao: string;
        valor: number;
      }

      const registrosParaInserir: EduzzRow[] = [];
      const faturaIdsNoArquivo = new Set<string>();
      const faturaIds: string[] = [];
      let totalVendas = 0;
      let minDate = "9999-99-99";
      let maxDate = "0000-00-00";

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        // Parse CSV with semicolon and quoted values
        const parts = line.split(";").map(p => p.replace(/^"|"$/g, "").trim());
        
        const [dataStr, descricao, tipoTransacao, fatura, valorStr] = parts;
        
        if (!fatura || !dataStr) continue;

        // Skip duplicates within the same file
        if (faturaIdsNoArquivo.has(fatura)) continue;
        faturaIdsNoArquivo.add(fatura);

        if (i % 50 === 0) {
          setProcessProgress(10 + Math.floor((i / totalRows) * 40));
          setProcessStatus(`Processando linha ${i + 1} de ${totalRows}...`);
        }

        const data = parseDate(dataStr);
        const valor = parseValue(valorStr);

        faturaIds.push(fatura);
        totalVendas += valor;

        if (data < minDate) minDate = data;
        if (data > maxDate) maxDate = data;

        registrosParaInserir.push({
          fatura_id: fatura,
          data,
          tipo_transacao: tipoTransacao || "Venda",
          descricao: descricao || "",
          valor,
        });
      }

      setProcessProgress(55);
      setProcessStatus("Verificando duplicados...");

      // Check for existing fatura_ids
      const existentesSet = new Set<string>();
      const BATCH_CHECK_SIZE = 500;
      for (let i = 0; i < faturaIds.length; i += BATCH_CHECK_SIZE) {
        const batch = faturaIds.slice(i, i + BATCH_CHECK_SIZE);
        const { data: existentes } = await supabase
          .from("extrato_eduzz")
          .select("fatura_id")
          .in("fatura_id", batch);
        
        existentes?.forEach((e) => existentesSet.add(e.fatura_id));
      }

      const novosRegistros = registrosParaInserir.filter((r) => !existentesSet.has(r.fatura_id));
      const duplicadosIds = registrosParaInserir
        .filter((r) => existentesSet.has(r.fatura_id))
        .map((r) => r.fatura_id);
      const duplicados = duplicadosIds.length;

      setProcessProgress(70);
      setProcessStatus("Criando importação...");

      const { data: importacao, error: importError } = await supabase
        .from("importacoes_extrato_eduzz")
        .insert({
          arquivo_nome: file.name,
          periodo_inicio: minDate !== "9999-99-99" ? minDate : format(new Date(), "yyyy-MM-dd"),
          periodo_fim: maxDate !== "0000-00-00" ? maxDate : format(new Date(), "yyyy-MM-dd"),
          total_registros: registrosParaInserir.length,
          registros_novos: novosRegistros.length,
          registros_duplicados: duplicados,
          total_vendas: totalVendas,
          status: "processando",
        })
        .select()
        .single();

      if (importError) throw importError;

      setProcessProgress(75);
      setProcessStatus("Inserindo transações...");

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
          .from("extrato_eduzz")
          .upsert(lote, { onConflict: 'fatura_id', ignoreDuplicates: true });

        if (insertError) {
          console.error("Erro ao inserir lote:", insertError);
          await supabase
            .from("importacoes_extrato_eduzz")
            .update({ status: "erro", observacao: `Erro no lote ${loteAtual}: ${insertError.message}` })
            .eq("id", importacao.id);
          throw insertError;
        }

        insertedCount += lote.length;
        const progresso = 75 + Math.floor((insertedCount / registrosComImportacao.length) * 20);
        setProcessProgress(progresso);
      }

      setProcessProgress(98);
      setProcessStatus("Finalizando...");

      await supabase
        .from("importacoes_extrato_eduzz")
        .update({ status: "concluido" })
        .eq("id", importacao.id);

      setProcessProgress(100);
      setProcessStatus("Concluído!");

      setImportResult({
        novos: novosRegistros.length,
        duplicados,
        duplicadosIds,
        importacaoId: importacao.id,
      });
      setShowResultModal(true);

      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["importacoes-extrato-eduzz"] });
      queryClient.invalidateQueries({ queryKey: ["extrato-eduzz-all"] });
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
      await supabase
        .from("extrato_eduzz")
        .delete()
        .eq("importacao_id", importacaoToDelete.id);
      
      const { error } = await supabase
        .from("importacoes_extrato_eduzz")
        .delete()
        .eq("id", importacaoToDelete.id);
      
      if (error) throw error;
      
      toast({
        title: "Importação excluída com sucesso",
        description: `${importacaoToDelete.total_registros} transações foram removidas.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["importacoes-extrato-eduzz"] });
      queryClient.invalidateQueries({ queryKey: ["extrato-eduzz-all"] });
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

  const exportToExcel = (data: ExtratoEduzzRecord[], filename: string) => {
    const exportData = data.map(t => ({
      "Data": format(new Date(t.data + "T12:00:00"), "dd/MM/yyyy"),
      "Descrição": t.descricao,
      "Tipo Transação": t.tipo_transacao,
      "Fatura": t.fatura_id,
      "Valor": t.valor,
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Extrato Eduzz");
    
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
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Extrato Eduzz
          </h1>
          <p className="text-muted-foreground mt-1">
            Importe e gerencie transações da plataforma Eduzz
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="importar">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </TabsTrigger>
          <TabsTrigger value="visao-geral">
            <Calculator className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
        </TabsList>

        {/* Tab Importar */}
        <TabsContent value="importar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Importar Extrato CSV
              </CardTitle>
              <CardDescription>
                Faça upload do arquivo CSV exportado da Eduzz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <FileSpreadsheet className="w-10 h-10 text-primary" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFile(null)}
                        className="ml-4"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {isProcessing ? (
                      <div className="space-y-2">
                        <Progress value={processProgress} className="h-2" />
                        <p className="text-sm text-muted-foreground">
                          {processStatus} ({processProgress}%)
                        </p>
                      </div>
                    ) : (
                      <Button onClick={processFile} className="gap-2">
                        <Upload className="w-4 h-4" />
                        Processar Arquivo
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-foreground">
                        Arraste o arquivo CSV aqui
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        ou clique para selecionar
                      </p>
                    </div>
                    <label>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button variant="outline" className="cursor-pointer" asChild>
                        <span>Selecionar Arquivo</span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Importações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                Histórico de Importações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingImportacoes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : importacoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma importação realizada ainda.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-center">Registros</TableHead>
                        <TableHead className="text-right">Total Vendas</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedImportacoes.map((imp) => (
                        <TableRow key={imp.id}>
                          <TableCell>
                            {format(new Date(imp.created_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {imp.arquivo_nome}
                          </TableCell>
                          <TableCell>
                            {formatDate(imp.periodo_inicio)} - {formatDate(imp.periodo_fim)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline">
                                  {imp.registros_novos}/{imp.total_registros}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {imp.registros_novos} novos, {imp.registros_duplicados} duplicados
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(imp.total_vendas)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(imp.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
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

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a{" "}
                        {Math.min(currentPage * ITEMS_PER_PAGE, importacoes.length)} de{" "}
                        {importacoes.length} importações
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => p - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => p + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Período</label>
                  <Select value={periodoPreset} onValueChange={handlePresetChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estemes">Este mês</SelectItem>
                      <SelectItem value="ultimomes">Último mês</SelectItem>
                      <SelectItem value="ultimos3meses">Últimos 3 meses</SelectItem>
                      <SelectItem value="esteano">Este ano</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {periodoPreset === "personalizado" && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Início</label>
                      <Select value={mesInicio} onValueChange={setMesInicio}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fim</label>
                      <Select value={mesFim} onValueChange={setMesFim}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="flex-1">
                  <label className="text-sm font-medium text-muted-foreground">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por descrição, tipo ou fatura..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>

                <Button
                  variant="outline"
                  onClick={() => exportToExcel(transacoesFiltradas, "extrato_eduzz")}
                  disabled={transacoesFiltradas.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-emerald-500/10">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Vendas</p>
                    <p className="text-2xl font-bold text-emerald-500">
                      {formatCurrency(metrics.totalVendas)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Calculator className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transações</p>
                    <p className="text-2xl font-bold">{metrics.totalTransacoes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-amber-500/10">
                    <TrendingUp className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                    <p className="text-2xl font-bold text-amber-500">
                      {formatCurrency(metrics.ticketMedio)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="monthFormatted" className="text-xs" />
                    <YAxis
                      tickFormatter={(v) => formatCurrency(v).replace("R$", "")}
                      className="text-xs"
                    />
                    <RechartsTooltip
                      formatter={(value: number) => [formatCurrency(value), "Vendas"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="vendas"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={{ fill: "#22C55E" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 5 Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={top5ProdutosData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatCurrency(v).replace("R$", "")}
                      className="text-xs"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      className="text-xs"
                    />
                    <RechartsTooltip
                      formatter={(value: number) => [formatCurrency(value), "Total"]}
                    />
                    <Bar dataKey="value" fill="#45E5E5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Transações ({transacoesFiltradas.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTransacoes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : transacoesFiltradas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma transação encontrada para os filtros selecionados.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("data")}
                        >
                          Data <SortIcon field="data" />
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("descricao")}
                        >
                          Descrição <SortIcon field="descricao" />
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("tipo_transacao")}
                        >
                          Tipo <SortIcon field="tipo_transacao" />
                        </TableHead>
                        <TableHead>Fatura</TableHead>
                        <TableHead
                          className="text-right cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("valor")}
                        >
                          Valor <SortIcon field="valor" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransacoes.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{formatDate(t.data)}</TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {t.descricao}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{t.tipo_transacao}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {t.fatura_id}
                          </TableCell>
                          <TableCell className="text-right font-mono text-emerald-500">
                            {formatCurrency(t.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={4} className="font-medium">
                          Total
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-500">
                          {formatCurrency(metrics.totalVendas)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>

                  {totalPagesVisao > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {((currentPageVisao - 1) * ITEMS_PER_PAGE_VISAO) + 1} a{" "}
                        {Math.min(currentPageVisao * ITEMS_PER_PAGE_VISAO, transacoesFiltradas.length)} de{" "}
                        {transacoesFiltradas.length} transações
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPageVisao(p => p - 1)}
                          disabled={currentPageVisao === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPageVisao(p => p + 1)}
                          disabled={currentPageVisao === totalPagesVisao}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Importação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta importação? Isso removerá{" "}
              <strong>{importacaoToDelete?.total_registros}</strong> transações permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImportacao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              Importação Concluída
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-500/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Novos Registros</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {importResult?.novos || 0}
                </p>
              </div>
              <div className="p-4 bg-amber-500/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Duplicados</p>
                <p className="text-2xl font-bold text-amber-500">
                  {importResult?.duplicados || 0}
                </p>
              </div>
            </div>
            {importResult && importResult.duplicados > 0 && (
              <div className="p-3 bg-amber-500/10 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {importResult.duplicados} registro(s) já existiam e foram ignorados.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowResultModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}