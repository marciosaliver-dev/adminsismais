import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  Download,
  MoreHorizontal,
  Filter,
  Search,
  RefreshCw,
  BarChart3,
  PieChart,
} from "lucide-react";
import { parseDateBR } from "@/lib/extratoUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

type Plataforma = "guru" | "eduzz" | "galaxypay";

interface ContratoAssinatura {
  id: string;
  codigo_assinatura: string;
  plataforma: string;
  nome_produto: string | null;
  nome_assinatura: string | null;
  nome_contato: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
  valor_assinatura: number;
  ciclo_dias: number;
  data_inicio: string | null;
  data_status: string | null;
  data_cancelamento: string | null;
  status: string;
  mrr: number;
  motivo_cancelamento: string | null;
  forma_pagamento: string | null;
  quantidade_cobrancas: number | null;
}

interface ImportacaoAssinatura {
  id: string;
  created_at: string;
  arquivo_nome: string;
  plataforma: string;
  periodo_referencia: string;
  total_registros: number;
  registros_novos: number;
  registros_atualizados: number;
  total_mrr: number;
  total_contratos_ativos: number;
  status: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR");
};

const getCicloLabel = (dias: number) => {
  switch (dias) {
    case 30:
      return "Mensal";
    case 90:
      return "Trimestral";
    case 180:
      return "Semestral";
    case 365:
      return "Anual";
    default:
      return `${dias} dias`;
  }
};

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case "ativa":
    case "active":
      return <Badge className="bg-emerald-500">Ativa</Badge>;
    case "cancelada":
    case "canceled":
      return <Badge variant="destructive">Cancelada</Badge>;
    case "suspensa":
    case "suspended":
      return <Badge variant="secondary">Suspensa</Badge>;
    case "atrasada":
    case "overdue":
      return <Badge className="bg-amber-500">Atrasada</Badge>;
    case "trial":
      return <Badge className="bg-blue-500">Trial</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Calculate LTV = Receita Total gerada pelo cliente
// LTV = valor_assinatura * quantidade_cobrancas
const calculateLTV = (contrato: ContratoAssinatura): number => {
  const valor = contrato.valor_assinatura || 0;
  const qtdCobrancas = contrato.quantidade_cobrancas || 0;
  
  if (valor <= 0 || qtdCobrancas <= 0) return 0;
  
  // LTV é a receita total que o cliente gerou
  return valor * qtdCobrancas;
};

// Calcula LTV em meses
const calculateLTVMeses = (contrato: ContratoAssinatura): number => {
  const qtdCobrancas = contrato.quantidade_cobrancas || 0;
  if (qtdCobrancas <= 0) return 0;
  
  const ciclo = contrato.ciclo_dias || 30;
  // Para anual (365 dias) com 1 cobrança = 12 meses
  // Para mensal (30 dias) com N cobranças = N meses
  const mesesPorCiclo = ciclo / 30;
  
  return qtdCobrancas * mesesPorCiclo;
};

const CHART_COLORS = [
  'hsl(180, 67%, 59%)',   // primary - turquoise
  'hsl(205, 60%, 15%)',   // secondary - dark blue
  'hsl(38, 92%, 50%)',    // warning - orange
  'hsl(142, 71%, 45%)',   // success - green
  'hsl(199, 89%, 48%)',   // info - blue
  'hsl(0, 84%, 60%)',     // destructive - red
  'hsl(51, 100%, 50%)',   // accent - yellow
  'hsl(280, 60%, 50%)',   // purple
];

export default function Assinaturas() {
  const queryClient = useQueryClient();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPlataforma, setSelectedPlataforma] = useState<Plataforma>("guru");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("contratos");
  const [previewData, setPreviewData] = useState<Array<{
    codigo: string;
    nome: string;
    data_inicio: string | null;
    data_status: string | null;
    data_cancelamento: string | null;
    data_proximo_ciclo: string | null;
    data_fim_ciclo: string | null;
    valor: number;
    mrr: number;
    ciclo_dias: number;
    quantidade_cobrancas: number;
    status: string;
  }> | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [plataformaFilter, setPlataformaFilter] = useState<string>("all");
  const [intervaloFilter, setIntervaloFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Cohort Filters
  const [cohortDataInicio, setCohortDataInicio] = useState<string>("");
  const [cohortDataFim, setCohortDataFim] = useState<string>("");
  const [cohortSegmento, setCohortSegmento] = useState<string>("all");
  const [cohortProduto, setCohortProduto] = useState<string>("all");
  const [cohortPlataforma, setCohortPlataforma] = useState<string>("all");

  // Fetch ALL contratos using pagination to bypass 1000 limit
  const { data: contratos = [], isLoading: isLoadingContratos } = useQuery({
    queryKey: ["contratos-assinatura"],
    queryFn: async () => {
      const allContratos: ContratoAssinatura[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("contratos_assinatura")
          .select("*")
          .order("data_inicio", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allContratos.push(...(data as ContratoAssinatura[]));
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allContratos;
    },
  });

  // Fetch importacoes
  const { data: importacoes = [], isLoading: isLoadingImportacoes } = useQuery({
    queryKey: ["importacoes-assinaturas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes_assinaturas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ImportacaoAssinatura[];
    },
  });

  // Filter contratos - exclude those with quantidade_cobrancas = 0
  const contratosFiltrados = useMemo(() => {
    return contratos.filter((c) => {
      // Filter out contracts with 0 charges
      if ((c.quantidade_cobrancas || 0) === 0) return false;
      
      const matchStatus = statusFilter === "all" || c.status.toLowerCase() === statusFilter.toLowerCase();
      const matchPlataforma = plataformaFilter === "all" || c.plataforma === plataformaFilter;
      const matchIntervalo = intervaloFilter === "all" || getCicloLabel(c.ciclo_dias) === intervaloFilter;
      const matchSearch = searchTerm === "" || 
        c.nome_contato?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email_contato?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.codigo_assinatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.nome_produto?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchStatus && matchPlataforma && matchIntervalo && matchSearch;
    });
  }, [contratos, statusFilter, plataformaFilter, intervaloFilter, searchTerm]);

  // Contratos válidos (com cobranças > 0) para métricas
  const contratosValidos = useMemo(() => {
    return contratos.filter(c => (c.quantidade_cobrancas || 0) > 0);
  }, [contratos]);

  // Verificar se há filtros ativos no dashboard
  const temFiltrosDashboard = statusFilter !== "all" || plataformaFilter !== "all" || intervaloFilter !== "all" || searchTerm !== "";

  // Calculate unique clients using email/phone - baseado nos filtrados
  const clientesUnicos = useMemo(() => {
    const dados = temFiltrosDashboard ? contratosFiltrados : contratosValidos;
    const uniqueClients = new Set<string>();
    dados.forEach(c => {
      const key = c.email_contato?.toLowerCase() || c.telefone_contato || c.codigo_assinatura;
      if (key) uniqueClients.add(key);
    });
    return uniqueClients.size;
  }, [contratosValidos, contratosFiltrados, temFiltrosDashboard]);

  // Clientes ativos únicos - baseado nos filtrados
  const clientesAtivosUnicos = useMemo(() => {
    const dados = temFiltrosDashboard ? contratosFiltrados : contratosValidos;
    const uniqueClients = new Set<string>();
    dados
      .filter(c => c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active")
      .forEach(c => {
        const key = c.email_contato?.toLowerCase() || c.telefone_contato || c.codigo_assinatura;
        if (key) uniqueClients.add(key);
      });
    return uniqueClients.size;
  }, [contratosValidos, contratosFiltrados, temFiltrosDashboard]);

  // Calculate metrics - baseado nos filtrados
  const metrics = useMemo(() => {
    const dados = temFiltrosDashboard ? contratosFiltrados : contratosValidos;
    const ativos = dados.filter(c => c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active");
    const atrasados = dados.filter(c => c.status.toLowerCase() === "atrasada" || c.status.toLowerCase() === "overdue");
    const totalMRR = ativos.reduce((sum, c) => sum + (c.mrr || 0), 0);
    const mrrAtrasados = atrasados.reduce((sum, c) => sum + (c.mrr || 0), 0);
    const totalLTV = dados.reduce((sum, c) => sum + calculateLTV(c), 0);
    const totalLTVMeses = dados.reduce((sum, c) => sum + calculateLTVMeses(c), 0);
    const cancelados = dados.filter(c => c.status.toLowerCase() === "cancelada");
    const churn = dados.length > 0 
      ? (cancelados.length / dados.length) * 100
      : 0;
    
    return {
      totalContratos: dados.length,
      contratosAtivos: ativos.length,
      contratosAtrasados: atrasados.length,
      mrrAtrasados,
      totalMRR,
      totalLTV,
      ltvMedioMeses: dados.length > 0 ? totalLTVMeses / dados.length : 0,
      ltvMedioValor: dados.length > 0 ? totalLTV / dados.length : 0,
      ticketMedio: ativos.length > 0 ? totalMRR / ativos.length : 0,
      churnRate: churn,
      clientesUnicos,
      clientesAtivosUnicos,
    };
  }, [contratosValidos, contratosFiltrados, temFiltrosDashboard, clientesUnicos, clientesAtivosUnicos]);

  // MRR by Product
  const mrrPorProduto = useMemo(() => {
    const produtoMap = new Map<string, number>();
    contratosValidos
      .filter(c => c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active")
      .forEach(c => {
        const produto = c.nome_produto || c.nome_assinatura || 'Sem produto';
        const current = produtoMap.get(produto) || 0;
        produtoMap.set(produto, current + (c.mrr || 0));
      });
    
    return Array.from(produtoMap.entries())
      .map(([nome, mrr]) => ({ nome, mrr }))
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 10);
  }, [contratosValidos]);

  // MRR by Interval (Ciclo)
  const mrrPorIntervalo = useMemo(() => {
    const intervaloMap = new Map<string, { mrr: number; count: number }>();
    contratosValidos
      .filter(c => c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active")
      .forEach(c => {
        const intervalo = getCicloLabel(c.ciclo_dias);
        const current = intervaloMap.get(intervalo) || { mrr: 0, count: 0 };
        intervaloMap.set(intervalo, { 
          mrr: current.mrr + (c.mrr || 0),
          count: current.count + 1
        });
      });
    
    return Array.from(intervaloMap.entries())
      .map(([nome, data]) => ({ nome, mrr: data.mrr, contratos: data.count }))
      .sort((a, b) => b.mrr - a.mrr);
  }, [contratosValidos]);

  // Lista de produtos únicos para filtro
  const produtosUnicos = useMemo(() => {
    const produtos = new Set<string>();
    contratosValidos.forEach(c => {
      const produto = c.nome_produto || c.nome_assinatura;
      if (produto) produtos.add(produto);
    });
    return Array.from(produtos).sort();
  }, [contratosValidos]);

  // Lista de plataformas únicas
  const plataformasUnicas = useMemo(() => {
    const plataformas = new Set<string>();
    contratosValidos.forEach(c => {
      if (c.plataforma) plataformas.add(c.plataforma);
    });
    return Array.from(plataformas).sort();
  }, [contratosValidos]);

  // Filtrar contratos para o Cohort
  const contratosFiltradosCohort = useMemo(() => {
    return contratosValidos.filter(c => {
      // Filtro de data início
      if (cohortDataInicio && c.data_inicio) {
        if (c.data_inicio < cohortDataInicio) return false;
      }
      // Filtro de data fim
      if (cohortDataFim && c.data_inicio) {
        if (c.data_inicio > cohortDataFim) return false;
      }
      // Filtro de segmento (ciclo)
      if (cohortSegmento !== "all") {
        const cicloLabel = getCicloLabel(c.ciclo_dias);
        if (cicloLabel !== cohortSegmento) return false;
      }
      // Filtro de produto
      if (cohortProduto !== "all") {
        const produto = c.nome_produto || c.nome_assinatura || '';
        if (produto !== cohortProduto) return false;
      }
      // Filtro de plataforma
      if (cohortPlataforma !== "all") {
        if (c.plataforma !== cohortPlataforma) return false;
      }
      return true;
    });
  }, [contratosValidos, cohortDataInicio, cohortDataFim, cohortSegmento, cohortProduto, cohortPlataforma]);

  // Cohort Analysis (by month of signup) - Matriz completa com retenção por mês
  const cohortData = useMemo(() => {
    const cohortMap = new Map<string, { 
      total: number; 
      ativos: number; 
      cancelados: number;
      mrr: number;
      ltv: number;
      ltvMeses: number;
      contratos: ContratoAssinatura[];
    }>();
    
    contratosFiltradosCohort.forEach(c => {
      if (!c.data_inicio) return;
      const mes = c.data_inicio.substring(0, 7); // YYYY-MM
      const current = cohortMap.get(mes) || { 
        total: 0, ativos: 0, cancelados: 0, mrr: 0, ltv: 0, ltvMeses: 0, contratos: [] 
      };
      
      current.total++;
      current.ltv += calculateLTV(c);
      current.ltvMeses += calculateLTVMeses(c);
      current.contratos.push(c);
      
      if (c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active") {
        current.ativos++;
        current.mrr += c.mrr || 0;
      } else if (c.status.toLowerCase() === "cancelada") {
        current.cancelados++;
      }
      
      cohortMap.set(mes, current);
    });
    
    // Calcular matriz de retenção (M0 a M12)
    const calcularRetencaoMes = (contratos: ContratoAssinatura[], mesIndex: number): number => {
      if (contratos.length === 0) return 0;
      
      const hoje = new Date();
      const retidos = contratos.filter(c => {
        const inicio = new Date(c.data_inicio!);
        const mesesDesdeInicio = Math.floor((hoje.getTime() - inicio.getTime()) / (30 * 24 * 60 * 60 * 1000));
        
        // Se ainda não atingiu esse mês, não considerar
        if (mesesDesdeInicio < mesIndex) return false;
        
        // Se está ativo OU foi cancelado após esse mês
        if (c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active") return true;
        
        if (c.data_cancelamento) {
          const cancelamento = new Date(c.data_cancelamento);
          const mesesAteCancelamento = Math.floor((cancelamento.getTime() - inicio.getTime()) / (30 * 24 * 60 * 60 * 1000));
          return mesesAteCancelamento > mesIndex;
        }
        
        return false;
      });
      
      return Math.round((retidos.length / contratos.length) * 100);
    };
    
    return Array.from(cohortMap.entries())
      .map(([mes, data]) => {
        // Matriz de retenção M0 a M12
        const retencaoMeses: number[] = [];
        for (let m = 0; m <= 12; m++) {
          retencaoMeses.push(calcularRetencaoMes(data.contratos, m));
        }
        
        // Formatar mês corretamente sem timezone issues
        // mes é no formato YYYY-MM
        const [ano, mesNum] = mes.split('-').map(Number);
        const mesesNomes = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
        const mesFormatado = `${mesesNomes[mesNum - 1]} de ${String(ano).slice(-2)}`;
        
        return {
          mes,
          mesFormatado,
          total: data.total,
          ativos: data.ativos,
          cancelados: data.cancelados,
          churn: data.total > 0 ? ((data.cancelados / data.total) * 100).toFixed(1) : '0',
          retencao: data.total > 0 ? ((data.ativos / data.total) * 100).toFixed(1) : '0',
          mrr: data.mrr,
          ltv: data.ltv,
          ltvMedio: data.total > 0 ? data.ltv / data.total : 0,
          ltvMeses: data.total > 0 ? data.ltvMeses / data.total : 0,
          retencaoMeses, // Array M0-M12
        };
      })
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [contratosFiltradosCohort]);

  // Métricas do Cohort filtrado
  const cohortMetrics = useMemo(() => {
    const total = contratosFiltradosCohort.length;
    const ativos = contratosFiltradosCohort.filter(c => 
      c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active"
    ).length;
    const cancelados = contratosFiltradosCohort.filter(c => 
      c.status.toLowerCase() === "cancelada"
    ).length;
    const totalLTV = contratosFiltradosCohort.reduce((sum, c) => sum + calculateLTV(c), 0);
    const totalLTVMeses = contratosFiltradosCohort.reduce((sum, c) => sum + calculateLTVMeses(c), 0);
    const mrrEstimado = contratosFiltradosCohort
      .filter(c => c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active")
      .reduce((sum, c) => sum + (c.mrr || 0), 0);
    
    return {
      total,
      ativos,
      cancelados,
      churn: total > 0 ? ((cancelados / total) * 100).toFixed(1) : '0',
      ltvMedio: total > 0 ? totalLTV / total : 0,
      ltvMesesMedio: total > 0 ? totalLTVMeses / total : 0,
      mrrEstimado,
      receitaTotal: totalLTV,
    };
  }, [contratosFiltradosCohort]);

  // Timeline de Aquisição (por ano com churn acumulado)
  const timelineData = useMemo(() => {
    const anoMap = new Map<string, { 
      total: number; 
      ativos: number; 
      cancelados: number;
      churnAcumulado: number;
    }>();
    
    contratosFiltradosCohort.forEach(c => {
      if (!c.data_inicio) return;
      const ano = c.data_inicio.substring(0, 4);
      const current = anoMap.get(ano) || { total: 0, ativos: 0, cancelados: 0, churnAcumulado: 0 };
      
      current.total++;
      
      if (c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active") {
        current.ativos++;
      } else if (c.status.toLowerCase() === "cancelada") {
        current.cancelados++;
      }
      
      anoMap.set(ano, current);
    });
    
    // Calcular churn acumulado
    let churnAcumulado = 0;
    return Array.from(anoMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ano, data]) => {
        churnAcumulado += data.cancelados;
        return {
          ano,
          total: data.total,
          ativos: data.ativos,
          cancelados: data.cancelados,
          churnAcumulado,
          taxaChurn: data.total > 0 ? ((data.cancelados / data.total) * 100).toFixed(1) : '0',
        };
      });
  }, [contratosFiltradosCohort]);

  // Limpar filtros do cohort
  const limparFiltrosCohort = () => {
    setCohortDataInicio("");
    setCohortDataFim("");
    setCohortSegmento("all");
    setCohortProduto("all");
    setCohortPlataforma("all");
  };

  // Verificar se há filtros ativos
  const temFiltrosAtivos = cohortDataInicio || cohortDataFim || cohortSegmento !== "all" || cohortProduto !== "all" || cohortPlataforma !== "all";

  // Parse Excel file based on platform
  const parseExcelFile = useCallback(async (file: File, plataforma: Plataforma) => {
    const data = await file.arrayBuffer();
    // IMPORTANTE: cellDates: false para evitar conversão de timezone pelo XLSX
    // raw: false para obter valores já formatados como string
    const workbook = XLSX.read(data, { type: "array", cellDates: false, raw: false });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

    // Parser de data SEM timezone - trata serial dates e strings
    const parseDate = (dateValue: string | number | Date | null | undefined): string | null => {
      if (!dateValue) return null;
      
      // Se for número (Excel serial date)
      if (typeof dateValue === 'number') {
        // Excel serial date: dias desde 1/1/1900 (com bug do leap year 1900)
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Se for string, usar parseDateBR
      return parseDateBR(dateValue);
    };

    const parseValue = (val: string | number | null | undefined): number => {
      if (val === null || val === undefined || val === '') return 0;
      
      // If it's already a number from Excel, return as-is
      if (typeof val === 'number') {
        return val;
      }
      
      const strVal = String(val).trim();
      
      // Check if it's Brazilian format: "1.234,56" or just "69,90"
      // Brazilian: dot as thousand separator, comma as decimal
      if (strVal.includes(',')) {
        // Remove thousand separators (dots) and convert decimal comma to dot
        const cleaned = strVal
          .replace(/[^\d,.-]/g, '') // Remove non-numeric except , . -
          .replace(/\./g, '')       // Remove dots (thousand separators)
          .replace(',', '.');       // Convert comma to dot (decimal)
        return parseFloat(cleaned) || 0;
      }
      
      // US/International format or plain number
      const cleaned = strVal.replace(/[^\d.-]/g, '');
      return parseFloat(cleaned) || 0;
    };

    const normalizeStatus = (status: string | null | undefined): string => {
      if (!status) return 'Ativa';
      const s = String(status).toLowerCase().trim();
      if (s.includes('cancel')) return 'Cancelada';
      if (s.includes('ativ') || s.includes('active')) return 'Ativa';
      if (s.includes('suspens')) return 'Suspensa';
      if (s.includes('atras') || s.includes('overdue')) return 'Atrasada';
      if (s.includes('trial')) return 'Trial';
      return status;
    };

    // Função para detectar ciclo pelo nome do produto Eduzz
    const detectarCicloPorNome = (nomeProduto: string | null): number | null => {
      if (!nomeProduto) return null;
      const nome = nomeProduto.toUpperCase();
      
      if (nome.includes('ANUAL') || nome.includes('YEARLY') || nome.includes('YEAR')) return 365;
      if (nome.includes('SEMESTRAL') || nome.includes('6 MESES')) return 180;
      if (nome.includes('TRIMESTRAL') || nome.includes('3 MESES')) return 90;
      if (nome.includes('BIMESTRAL') || nome.includes('2 MESES')) return 60;
      if (nome.includes('MENSAL') || nome.includes('MONTHLY') || nome.includes('MES')) return 30;
      if (nome.includes('SEMANAL') || nome.includes('WEEKLY')) return 7;
      
      return null;
    };

    // Função para calcular ciclo em dias baseado nas datas da Eduzz
    const calcularCicloDiasEduzz = (
      dataInicio: string | null,
      ultimoPagamento: string | null,
      proximoVencimento: string | null,
      cobrancasPagas: number,
      nomeProduto: string | null
    ): number => {
      // PRIMEIRO: Tentar detectar pelo nome do produto (mais confiável)
      const cicloPorNome = detectarCicloPorNome(nomeProduto);
      if (cicloPorNome) return cicloPorNome;
      
      // Se temos próximo vencimento e último pagamento, calcular diferença
      if (proximoVencimento && ultimoPagamento) {
        const prox = new Date(proximoVencimento);
        const ultimo = new Date(ultimoPagamento);
        const diffDias = Math.round((prox.getTime() - ultimo.getTime()) / (1000 * 60 * 60 * 24));
        
        // Normalizar para ciclos padrão
        if (diffDias >= 25 && diffDias <= 35) return 30;      // Mensal
        if (diffDias >= 55 && diffDias <= 65) return 60;      // Bimestral
        if (diffDias >= 85 && diffDias <= 95) return 90;      // Trimestral
        if (diffDias >= 175 && diffDias <= 185) return 180;   // Semestral
        if (diffDias >= 360 && diffDias <= 370) return 365;   // Anual
        
        return diffDias > 0 ? diffDias : 30;
      }
      
      // Se temos data início e último pagamento com cobranças >= 2, calcular média
      if (dataInicio && ultimoPagamento && cobrancasPagas >= 2) {
        const inicio = new Date(dataInicio);
        const ultimo = new Date(ultimoPagamento);
        const diffDias = Math.round((ultimo.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
        const mediaPorCiclo = diffDias / (cobrancasPagas - 1);
        
        // Normalizar para ciclos padrão
        if (mediaPorCiclo >= 25 && mediaPorCiclo <= 35) return 30;
        if (mediaPorCiclo >= 55 && mediaPorCiclo <= 65) return 60;
        if (mediaPorCiclo >= 85 && mediaPorCiclo <= 95) return 90;
        if (mediaPorCiclo >= 175 && mediaPorCiclo <= 185) return 180;
        if (mediaPorCiclo >= 360 && mediaPorCiclo <= 370) return 365;
        
        return Math.round(mediaPorCiclo) || 30;
      }
      
      // Default: mensal
      return 30;
    };
    
    // Função para calcular MRR baseado no valor e ciclo
    const calcularMRREduzz = (valorCobranca: number, cicloDias: number): number => {
      if (valorCobranca <= 0 || cicloDias <= 0) return 0;
      
      // MRR = (Valor da cobrança / ciclo em dias) * 30
      return (valorCobranca / cicloDias) * 30;
    };

    // Map based on platform
    if (plataforma === "guru") {
      return jsonData.map((row: Record<string, unknown>) => ({
        codigo_assinatura: String(row['código assinatura'] || row['codigo_assinatura'] || ''),
        plataforma: 'guru',
        nome_produto: row['nome produto'] as string || null,
        nome_assinatura: row['nome assinatura'] as string || null,
        nome_oferta: row['nome oferta'] as string || null,
        nome_contato: row['nome contato'] as string || null,
        doc_contato: row['doc contato'] as string || null,
        email_contato: row['email contato'] as string || null,
        telefone_contato: row['telefone contato'] as string || null,
        valor_assinatura: parseValue(row['último valor'] as string),
        valor_liquido: parseValue(row['último valor líquido'] as string),
        ciclo_dias: parseInt(String(row['cobrada a cada X dias'] || 30)) || 30,
        data_inicio: parseDate(row['data início'] as string),
        data_status: parseDate(row['data status'] as string),
        data_cancelamento: parseDate(row['data cancelamento'] as string),
        data_proximo_ciclo: parseDate(row['próximo ciclo'] as string),
        data_fim_ciclo: parseDate(row['data fim ciclo'] as string),
        status: normalizeStatus(row['status'] as string),
        motivo_cancelamento: row['motivo cancelamento'] as string || null,
        cancelado_por: row['cancelado por nome'] as string || null,
        forma_pagamento: row['pagamento'] as string || null,
        quantidade_cobrancas: parseInt(String(row['quantidade cobranças'] || 0)) || 0,
        parcelamento: parseInt(String(row['parcelamento'] || 1)) || 1,
        cupom: row['cupom'] as string || null,
      })).filter((c: { codigo_assinatura: string }) => c.codigo_assinatura);
    }
    
    // EDUZZ - Tratamento específico com campos corretos do arquivo
    if (plataforma === "eduzz") {
      return jsonData.map((row: Record<string, unknown>) => {
        // Campos corretos do arquivo Eduzz (analisado)
        const cobrancasPagas = parseInt(String(row['Cobranças pagas'] || 0)) || 0;
        const valorCobranca = parseValue(row['Valor da cobrança'] as string);
        const totalPago = parseValue(row['Total pago'] as string);
        const nomeProduto = (row['Nome produto'] || '') as string;
        
        // Datas - formato: DD/MM/YYYY HH:MM:SS
        const dataInicio = parseDate(row['Início em'] as string);
        const ultimoPagamento = parseDate(row['Último pagamento'] as string);
        const proximoVencimento = parseDate(row['Próx. Vencimento'] as string);
        const dataCancelamento = parseDate(row['Cancelamento em'] as string);
        
        // Determinar status baseado no campo Status ou data cancelamento
        let status = 'Ativa';
        const statusOriginal = (row['Status'] || '') as string;
        if (dataCancelamento || statusOriginal.toLowerCase().includes('cancel')) {
          status = 'Cancelada';
        } else if (statusOriginal.toLowerCase().includes('atras')) {
          status = 'Atrasada';
        } else if (statusOriginal.toLowerCase().includes('dia') || statusOriginal.toLowerCase().includes('ativ')) {
          status = 'Ativa';
        }
        
        // Calcular ciclo em dias (prioriza detecção pelo nome do produto)
        const cicloDias = calcularCicloDiasEduzz(
          dataInicio,
          ultimoPagamento,
          proximoVencimento,
          cobrancasPagas,
          nomeProduto
        );
        
        // Calcular MRR = (Valor da cobrança / ciclo) * 30
        const mrrCalculado = calcularMRREduzz(valorCobranca, cicloDias);
        // Garantir que MRR seja um número válido (não NaN, não Infinity)
        const mrrFinal = Number.isFinite(mrrCalculado) ? Math.round(mrrCalculado * 100) / 100 : 0;
        
        // LTV = Total pago (já é o valor histórico acumulado)
        const ltv = Number.isFinite(totalPago) ? totalPago : 0;
        
        return {
          codigo_assinatura: String(row['Contrato'] || `eduzz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
          plataforma: 'eduzz',
          nome_produto: nomeProduto || null,
          nome_assinatura: nomeProduto || null, // Usar nome produto como nome assinatura
          nome_oferta: null,
          nome_contato: (row['Cliente / Razão-Social'] || row['Cliente / Razao-Social']) as string || null,
          doc_contato: String(row['Cliente / Documento'] || '').replace(/[^\d]/g, '') || null,
          email_contato: (row['Cliente / E-mail'] || row['Cliente / Email']) as string || null,
          telefone_contato: (row['Cliente / Fones'] || row['Cliente / Telefone']) as string || null,
          valor_assinatura: Number.isFinite(valorCobranca) ? valorCobranca : 0,
          valor_liquido: ltv, // LTV como valor líquido acumulado
          mrr: mrrFinal, // MRR calculado e validado
          ciclo_dias: cicloDias,
          data_inicio: dataInicio,
          data_status: ultimoPagamento, // Último pagamento como data de status
          data_cancelamento: dataCancelamento,
          data_proximo_ciclo: proximoVencimento,
          data_fim_ciclo: null,
          status: status,
          motivo_cancelamento: null,
          cancelado_por: null,
          forma_pagamento: (row['Forma de pagamento']) as string || null,
          quantidade_cobrancas: cobrancasPagas,
          parcelamento: 1,
          cupom: null,
        };
      })
      // IMPORTANTE: Filtrar registros com cobranças pagas = 0 (não devem entrar nos relatórios)
      .filter((c: { codigo_assinatura: string; quantidade_cobrancas: number }) => 
        c.codigo_assinatura && c.quantidade_cobrancas > 0
      );
    }

    // Generic mapping for other platforms
    return jsonData.map((row: Record<string, unknown>) => {
      const keys = Object.keys(row);
      const findKey = (patterns: string[]) => {
        for (const pattern of patterns) {
          const found = keys.find(k => k.toLowerCase().includes(pattern.toLowerCase()));
          if (found) return row[found];
        }
        return null;
      };

      return {
        codigo_assinatura: String(findKey(['codigo', 'id', 'assinatura', 'subscription']) || `${plataforma}_${Date.now()}_${Math.random()}`),
        plataforma,
        nome_produto: findKey(['produto', 'product']) as string || null,
        nome_assinatura: findKey(['plano', 'plan', 'assinatura']) as string || null,
        nome_oferta: findKey(['oferta', 'offer']) as string || null,
        nome_contato: findKey(['nome', 'name', 'cliente', 'customer']) as string || null,
        doc_contato: findKey(['cpf', 'cnpj', 'doc', 'documento']) as string || null,
        email_contato: findKey(['email', 'e-mail']) as string || null,
        telefone_contato: findKey(['telefone', 'phone', 'celular']) as string || null,
        valor_assinatura: parseValue(findKey(['valor', 'value', 'price', 'preco']) as string),
        valor_liquido: parseValue(findKey(['liquido', 'net']) as string),
        ciclo_dias: parseInt(String(findKey(['ciclo', 'dias', 'period']) || 30)) || 30,
        data_inicio: parseDate(findKey(['inicio', 'start', 'criacao', 'created']) as string),
        data_status: parseDate(findKey(['status_date', 'data_status']) as string),
        data_cancelamento: parseDate(findKey(['cancelamento', 'cancel']) as string),
        status: normalizeStatus(findKey(['status', 'situacao']) as string),
        motivo_cancelamento: findKey(['motivo', 'reason']) as string || null,
        forma_pagamento: findKey(['pagamento', 'payment']) as string || null,
        quantidade_cobrancas: parseInt(String(findKey(['cobrancas', 'charges']) || 0)) || 0,
        parcelamento: 1,
        cupom: findKey(['cupom', 'coupon']) as string || null,
      };
    }).filter((c: { codigo_assinatura: string, valor_assinatura: number }) => c.codigo_assinatura && c.valor_assinatura > 0);
  }, []);

  // Generate preview from file
  const generatePreview = useCallback(async () => {
    if (!selectedFile) return;
    
    setIsLoadingPreview(true);
    try {
      const contratos = await parseExcelFile(selectedFile, selectedPlataforma);
      
      // Take first 10 records for preview
      const preview = contratos.slice(0, 10).map((c: Record<string, unknown>) => {
        // Para Eduzz, o MRR já vem calculado. Para outras plataformas, calcular baseado no ciclo
        const cicloDias = (c.ciclo_dias as number) || 30;
        const valorAssinatura = (c.valor_assinatura as number) || 0;
        let mrr = c.mrr as number || 0;
        
        // Se não tem MRR calculado, calcular baseado no ciclo
        if (!mrr && valorAssinatura > 0) {
          mrr = (valorAssinatura / cicloDias) * 30;
        }
        
        return {
          codigo: String(c.codigo_assinatura || '').slice(0, 20),
          nome: String(c.nome_contato || c.nome_produto || '-').slice(0, 30),
          data_inicio: c.data_inicio as string | null,
          data_status: c.data_status as string | null,
          data_cancelamento: c.data_cancelamento as string | null,
          data_proximo_ciclo: c.data_proximo_ciclo as string | null,
          data_fim_ciclo: c.data_fim_ciclo as string | null,
          valor: valorAssinatura,
          mrr: mrr,
          ciclo_dias: cicloDias,
          quantidade_cobrancas: (c.quantidade_cobrancas as number) || 0,
          status: c.status as string || 'Ativa',
        };
      });
      
      setPreviewData(preview);
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      toast({
        title: "Erro ao gerar preview",
        description: "Não foi possível ler o arquivo. Verifique o formato.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  }, [selectedFile, selectedPlataforma, parseExcelFile]);

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Nenhum arquivo selecionado");

      setIsProcessing(true);
      
      const contratos = await parseExcelFile(selectedFile, selectedPlataforma);
      
      if (contratos.length === 0) {
        throw new Error("Nenhum contrato válido encontrado no arquivo");
      }

      // Create import record
      const { data: importacao, error: importError } = await supabase
        .from("importacoes_assinaturas")
        .insert({
          arquivo_nome: selectedFile.name,
          plataforma: selectedPlataforma,
          periodo_referencia: new Date().toISOString().split('T')[0],
          total_registros: contratos.length,
          status: 'processando',
        })
        .select()
        .single();

      if (importError) throw importError;

      // Get existing contracts to count new vs updated
      const codigosAssinatura = contratos.map(c => c.codigo_assinatura);
      const { data: existingContracts } = await supabase
        .from("contratos_assinatura")
        .select("codigo_assinatura")
        .in("codigo_assinatura", codigosAssinatura);
      
      const existingCodes = new Set(existingContracts?.map(c => c.codigo_assinatura) || []);
      const novos = contratos.filter(c => !existingCodes.has(c.codigo_assinatura)).length;
      const atualizados = contratos.length - novos;

      // Batch upsert contracts (in chunks of 500 to avoid payload limits)
      const BATCH_SIZE = 500;
      const contratosComImportacao = contratos.map(c => ({ ...c, importacao_id: importacao.id }));
      
      for (let i = 0; i < contratosComImportacao.length; i += BATCH_SIZE) {
        const batch = contratosComImportacao.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from("contratos_assinatura")
          .upsert(batch, { 
            onConflict: 'codigo_assinatura',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error('Batch upsert error:', error);
          throw new Error(`Erro ao importar lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
        }
      }

      // Calculate totals
      const { data: ativos } = await supabase
        .from("contratos_assinatura")
        .select("mrr")
        .eq("status", "Ativa");

      const totalMRR = ativos?.reduce((sum, c) => sum + (c.mrr || 0), 0) || 0;
      const totalAtivos = ativos?.length || 0;

      // Update import record
      await supabase
        .from("importacoes_assinaturas")
        .update({
          registros_novos: novos,
          registros_atualizados: atualizados,
          total_mrr: totalMRR,
          total_contratos_ativos: totalAtivos,
          status: 'concluido',
        })
        .eq("id", importacao.id);

      return { novos, atualizados, total: contratos.length };
    },
    onSuccess: (data) => {
      toast({
        title: "Importação concluída!",
        description: `${data.total} registros processados: ${data.novos} novos, ${data.atualizados} atualizados.`,
      });
      queryClient.invalidateQueries({ queryKey: ["contratos-assinatura"] });
      queryClient.invalidateQueries({ queryKey: ["importacoes-assinaturas"] });
      setIsImportDialogOpen(false);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Delete import mutation
  const deleteImportMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("importacoes_assinaturas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Importação excluída" });
      queryClient.invalidateQueries({ queryKey: ["importacoes-assinaturas"] });
      queryClient.invalidateQueries({ queryKey: ["contratos-assinatura"] });
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assinaturas & MRR</h1>
            <p className="text-muted-foreground">Gestão de contratos e análise de receita recorrente</p>
          </div>
          <Button onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar Arquivo
          </Button>
        </div>

        {/* Metrics Cards - 2 rows of 5 */}
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-blue-50 border-blue-200 cursor-help">
                  <CardContent className="p-3">
                    <div className="text-xs text-blue-600">Total</div>
                    <p className="text-xl font-bold text-blue-700">{metrics.totalContratos}</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Total de contratos cadastrados (ativos + cancelados)</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-emerald-50 border-emerald-200 cursor-help">
                  <CardContent className="p-3">
                    <div className="text-xs text-emerald-600">Ativos</div>
                    <p className="text-xl font-bold text-emerald-700">{metrics.contratosAtivos}</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Contratos com status ativo gerando receita recorrente</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-amber-50 border-amber-200 border-2 border-l-4 border-l-amber-500 cursor-help">
                  <CardContent className="p-3">
                    <div className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Atrasados
                    </div>
                    <p className="text-xl font-bold text-amber-700">{metrics.contratosAtrasados}</p>
                    <p className="text-xs text-amber-600">{formatCurrency(metrics.mrrAtrasados)} MRR</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Contratos com pagamentos em atraso - risco de cancelamento</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-red-50 border-red-200 cursor-help">
                  <CardContent className="p-3">
                    <div className="text-xs text-red-600">Churn</div>
                    <p className="text-xl font-bold text-red-700">{metrics.churnRate.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Taxa de cancelamento: % de contratos cancelados sobre o total</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-teal-50 border-teal-200 cursor-help">
                  <CardContent className="p-3">
                    <div className="text-xs text-teal-600">MRR Total</div>
                    <p className="text-lg font-bold text-teal-700">{formatCurrency(metrics.totalMRR)}</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Monthly Recurring Revenue: receita mensal recorrente dos contratos ativos</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-purple-50 border-purple-200 cursor-help">
                  <CardContent className="p-3">
                    <div className="text-xs text-purple-600">LTV Médio (R$)</div>
                    <p className="text-lg font-bold text-purple-700">{formatCurrency(metrics.ltvMedioValor)}</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Lifetime Value: valor médio gerado por cliente ao longo da vida</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-indigo-50 border-indigo-200 cursor-help">
                  <CardContent className="p-3">
                    <div className="text-xs text-indigo-600">LTV (Meses)</div>
                    <p className="text-xl font-bold text-indigo-700">{metrics.ltvMedioMeses.toFixed(1)}</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Tempo médio de permanência dos clientes em meses</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-cyan-50 border-cyan-200 cursor-help">
                  <CardContent className="p-3">
                    <div className="text-xs text-cyan-600">Ticket Médio</div>
                    <p className="text-lg font-bold text-cyan-700">{formatCurrency(metrics.ticketMedio)}</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Valor médio mensal por contrato ativo</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-violet-50 border-violet-200 cursor-help">
                  <CardContent className="p-3">
                    <div className="text-xs text-violet-600">Clientes Únicos</div>
                    <p className="text-xl font-bold text-violet-700">{metrics.clientesUnicos}</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Total de clientes únicos (baseado no email/documento)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-green-50 border-green-200 cursor-help">
                  <CardContent className="p-3">
                    <div className="text-xs text-green-600">Clientes Ativos</div>
                    <p className="text-xl font-bold text-green-700">{metrics.clientesAtivosUnicos}</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Clientes únicos com pelo menos 1 contrato ativo</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
            <TabsTrigger value="analise">Análise & Cohort</TabsTrigger>
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
            <TabsTrigger value="importacoes">Histórico de Importações</TabsTrigger>
          </TabsList>

          <TabsContent value="contratos" className="space-y-4">
            {/* Filters */}
            <Card className="bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por nome, email ou código..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos Status</SelectItem>
                        <SelectItem value="ativa">Ativa</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                        <SelectItem value="suspensa">Suspensa</SelectItem>
                        <SelectItem value="atrasada">Atrasada</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={intervaloFilter} onValueChange={setIntervaloFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Intervalo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos Intervalos</SelectItem>
                        <SelectItem value="Mensal">Mensal</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={plataformaFilter} onValueChange={setPlataformaFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Plataforma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="guru">Guru</SelectItem>
                        <SelectItem value="eduzz">Eduzz</SelectItem>
                        <SelectItem value="galaxypay">GalaxyPay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {temFiltrosDashboard && (
                    <div className="flex items-center gap-2 text-sm">
                      <Filter className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Filtros ativos - Dashboard atualizado</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setStatusFilter("all");
                          setPlataformaFilter("all");
                          setIntervaloFilter("all");
                          setSearchTerm("");
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Limpar filtros
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contracts Table */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Exibindo {contratosFiltrados.length} contratos (com cobranças válidas)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingContratos ? (
                  <TableSkeleton columns={8} rows={10} />
                ) : (
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/50">
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Plataforma</TableHead>
                          <TableHead>Ciclo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">MRR</TableHead>
                          <TableHead className="text-right">LTV</TableHead>
                          <TableHead className="text-center">Cobranças</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Início</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contratosFiltrados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                              Nenhum contrato encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          contratosFiltrados.map((contrato) => (
                            <TableRow key={contrato.id}>
                              <TableCell className="font-mono text-xs">{contrato.codigo_assinatura.slice(0, 20)}...</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{contrato.nome_contato || '-'}</p>
                                  <p className="text-xs text-muted-foreground">{contrato.email_contato || ''}</p>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">{contrato.nome_produto || contrato.nome_assinatura || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{contrato.plataforma}</Badge>
                              </TableCell>
                              <TableCell>{getCicloLabel(contrato.ciclo_dias)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(contrato.valor_assinatura)}</TableCell>
                              <TableCell className="text-right font-medium text-primary">{formatCurrency(contrato.mrr)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(calculateLTV(contrato))}</TableCell>
                              <TableCell className="text-center">{contrato.quantidade_cobrancas || 0}</TableCell>
                              <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                              <TableCell>{formatDate(contrato.data_inicio)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analise" className="space-y-6">
            {/* MRR por Produto e Intervalo - TABELAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    MRR por Produto (Top 10)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mrrPorProduto.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                  ) : (
                    <ScrollArea className="h-[350px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">MRR</TableHead>
                            <TableHead className="text-right">%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mrrPorProduto.map((item, index) => {
                            const totalMRR = mrrPorProduto.reduce((sum, p) => sum + p.mrr, 0);
                            const percent = totalMRR > 0 ? ((item.mrr / totalMRR) * 100).toFixed(1) : '0';
                            return (
                              <TableRow key={item.nome}>
                                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={item.nome}>{item.nome}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.mrr)}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline">{percent}%</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    MRR por Intervalo de Cobrança
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mrrPorIntervalo.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                  ) : (
                    <ScrollArea className="h-[350px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Intervalo</TableHead>
                            <TableHead className="text-right">Contratos</TableHead>
                            <TableHead className="text-right">MRR</TableHead>
                            <TableHead className="text-right">%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mrrPorIntervalo.map((item, index) => {
                            const totalMRR = mrrPorIntervalo.reduce((sum, p) => sum + p.mrr, 0);
                            const percent = totalMRR > 0 ? ((item.mrr / totalMRR) * 100).toFixed(1) : '0';
                            return (
                              <TableRow key={item.nome}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                    />
                                    {item.nome}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline">{item.contratos}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.mrr)}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary">{percent}%</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Cohort Analysis - Matriz de Retenção */}
            <Card className="border-primary/20">
              <CardHeader className="pb-4 bg-secondary/5">
                <div className="flex flex-col gap-4">
                  {/* Header com título e totais */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-secondary">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        <span className="text-2xl font-bold">{cohortMetrics.total.toLocaleString('pt-BR')}</span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {cohortData.length} cohorts • {temFiltrosAtivos ? "Filtros aplicados" : "Todos os dados"}
                      </p>
                    </div>
                    
                    {/* Resumo de métricas */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="text-center px-3 py-2 bg-card rounded-lg border">
                        <div className="text-muted-foreground">Total</div>
                        <div className="font-bold text-secondary">{cohortMetrics.total.toLocaleString('pt-BR')}</div>
                      </div>
                      <div className="text-center px-3 py-2 bg-card rounded-lg border border-primary/30">
                        <div className="text-muted-foreground">Ativos</div>
                        <div className="font-bold text-primary">{cohortMetrics.ativos.toLocaleString('pt-BR')}</div>
                      </div>
                      <div className="text-center px-3 py-2 bg-card rounded-lg border border-destructive/30">
                        <div className="text-muted-foreground">Cancelados</div>
                        <div className="font-bold text-destructive">{cohortMetrics.cancelados.toLocaleString('pt-BR')}</div>
                      </div>
                      <div className="text-center px-3 py-2 bg-card rounded-lg border border-warning/30">
                        <div className="text-muted-foreground">Churn</div>
                        <div className="font-bold text-warning">{cohortMetrics.churn}%</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Filtros */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">De:</Label>
                      <Input
                        type="date"
                        value={cohortDataInicio}
                        onChange={(e) => setCohortDataInicio(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Até:</Label>
                      <Input
                        type="date"
                        value={cohortDataFim}
                        onChange={(e) => setCohortDataFim(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Segmento:</Label>
                      <Select value={cohortSegmento} onValueChange={setCohortSegmento}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="Mensal">Mensal</SelectItem>
                          <SelectItem value="Trimestral">Trimestral</SelectItem>
                          <SelectItem value="Semestral">Semestral</SelectItem>
                          <SelectItem value="Anual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Produto:</Label>
                      <Select value={cohortProduto} onValueChange={setCohortProduto}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {produtosUnicos.slice(0, 20).map(p => (
                            <SelectItem key={p} value={p}>{p.length > 30 ? p.slice(0, 30) + '...' : p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Plataforma:</Label>
                      <Select value={cohortPlataforma} onValueChange={setCohortPlataforma}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {plataformasUnicas.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={limparFiltrosCohort}
                        className="h-9 w-full"
                        disabled={!temFiltrosAtivos}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Limpar
                      </Button>
                    </div>
                  </div>
                  
                  {/* Cards de Métricas LTV */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-secondary to-secondary/80 rounded-lg p-3 text-secondary-foreground">
                      <div className="text-xs opacity-80">LTV Valor</div>
                      <div className="text-lg font-bold">{formatCurrency(cohortMetrics.ltvMedio)}</div>
                    </div>
                    <div className="bg-gradient-to-br from-primary to-primary/80 rounded-lg p-3 text-primary-foreground">
                      <div className="text-xs opacity-80">LTV Meses</div>
                      <div className="text-lg font-bold">{cohortMetrics.ltvMesesMedio.toFixed(1)}</div>
                    </div>
                    <div className="bg-gradient-to-br from-info to-info/80 rounded-lg p-3 text-info-foreground">
                      <div className="text-xs opacity-80">MRR Est.</div>
                      <div className="text-lg font-bold">{formatCurrency(cohortMetrics.mrrEstimado)}</div>
                    </div>
                    <div className="bg-gradient-to-br from-success to-success/80 rounded-lg p-3 text-success-foreground">
                      <div className="text-xs opacity-80">Receita</div>
                      <div className="text-lg font-bold">{formatCurrency(cohortMetrics.receitaTotal)}</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {cohortData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                ) : (
                  <>
                    {/* Legenda de cores */}
                    <div className="flex flex-wrap gap-1 text-xs mb-4 justify-end">
                      <span className="px-2 py-1 rounded bg-primary text-primary-foreground font-semibold">≥70%</span>
                      <span className="px-2 py-1 rounded bg-primary/70 text-primary-foreground font-semibold">50-69%</span>
                      <span className="px-2 py-1 rounded bg-warning text-warning-foreground font-semibold">30-49%</span>
                      <span className="px-2 py-1 rounded bg-warning/70 text-warning-foreground font-semibold">15-29%</span>
                      <span className="px-2 py-1 rounded bg-destructive text-destructive-foreground font-semibold">1-14%</span>
                      <span className="px-2 py-1 rounded bg-muted text-muted-foreground font-semibold">0%</span>
                    </div>
                    
                    <ScrollArea className="h-[400px]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead className="bg-secondary text-secondary-foreground sticky top-0">
                            <tr>
                              <th className="p-2 text-left sticky left-0 bg-secondary z-10">Cohort</th>
                              <th className="p-1 text-center">N</th>
                              <th className="p-1 text-center">Atv</th>
                              <th className="p-1 text-center">Churn</th>
                              <th className="p-1 text-center">M0</th>
                              <th className="p-1 text-center">M1</th>
                              <th className="p-1 text-center">M2</th>
                              <th className="p-1 text-center">M3</th>
                              <th className="p-1 text-center">M4</th>
                              <th className="p-1 text-center">M5</th>
                              <th className="p-1 text-center">M6</th>
                              <th className="p-1 text-center">M7</th>
                              <th className="p-1 text-center">M8</th>
                              <th className="p-1 text-center">M9</th>
                              <th className="p-1 text-center">M10</th>
                              <th className="p-1 text-center">M11</th>
                              <th className="p-1 text-center">M12</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cohortData.map((cohort, idx) => {
                              const getRetentionClass = (value: number) => {
                                if (value >= 70) return 'bg-primary text-primary-foreground';
                                if (value >= 50) return 'bg-primary/70 text-primary-foreground';
                                if (value >= 30) return 'bg-warning text-warning-foreground';
                                if (value >= 15) return 'bg-warning/70 text-warning-foreground';
                                if (value >= 1) return 'bg-destructive text-destructive-foreground';
                                return 'bg-muted text-muted-foreground';
                              };

                              const churnNum = parseFloat(cohort.churn);
                              const churnClass = churnNum > 70 ? 'bg-destructive/20 text-destructive' : 
                                                 churnNum > 50 ? 'bg-warning/20 text-warning' : 
                                                 'bg-success/20 text-success';
                              
                              // Cores por ano usando design system
                              const getAnoColor = (mes: string) => {
                                if (mes.startsWith('2025')) return 'hsl(var(--primary))';
                                if (mes.startsWith('2024')) return 'hsl(var(--info))';
                                if (mes.startsWith('2023')) return 'hsl(var(--warning))';
                                return 'hsl(var(--muted-foreground))';
                              };
                              
                              return (
                                <tr key={cohort.mes} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                                  <td className={`p-1 sticky left-0 font-medium border-r border-border ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                                    <span 
                                      className="inline-block w-2 h-2 rounded-full mr-1" 
                                      style={{ backgroundColor: getAnoColor(cohort.mes) }} 
                                    />
                                    {cohort.mesFormatado}
                                  </td>
                                  <td className="p-1 text-center font-medium">{cohort.total}</td>
                                  <td className="p-1 text-center">
                                    <span className={`px-1 rounded ${cohort.ativos > 0 ? 'bg-success/20 text-success' : 'bg-muted'}`}>
                                      {cohort.ativos}
                                    </span>
                                  </td>
                                  <td className="p-1 text-center">
                                    <span className={`px-1 rounded text-xs font-medium ${churnClass}`}>
                                      {cohort.churn}%
                                    </span>
                                  </td>
                                  {cohort.retencaoMeses.map((ret, mIdx) => (
                                    <td key={mIdx} className="p-0.5">
                                      <div className={`min-w-[36px] text-center p-0.5 rounded text-[10px] font-semibold ${getRetentionClass(ret)}`}>
                                        {ret}%
                                      </div>
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timeline de Aquisição */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-secondary">
                  <Calendar className="w-5 h-5 text-primary" />
                  📈 Timeline de Aquisição
                </CardTitle>
                <p className="text-sm text-muted-foreground">Total de assinaturas por ano com churn acumulado</p>
              </CardHeader>
              <CardContent>
                {timelineData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="ano" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <RechartsTooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number, name: string) => {
                            const labels: Record<string, string> = {
                              total: 'Total',
                              ativos: 'Ativos',
                              cancelados: 'Cancelados',
                              churnAcumulado: 'Churn Acum.'
                            };
                            return [value, labels[name] || name];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="total" name="Total" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="ativos" name="Ativos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cancelados" name="Cancelados" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                        <Line type="monotone" dataKey="churnAcumulado" name="Churn Acum." stroke="hsl(var(--warning))" strokeWidth={3} dot={{ fill: 'hsl(var(--warning))' }} />
                      </BarChart>
                    </ResponsiveContainer>
                    
                    {/* Tabela de resumo por ano */}
                    <div className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-secondary/10">
                            <TableHead>Ano</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Ativos</TableHead>
                            <TableHead className="text-center">Cancelados</TableHead>
                            <TableHead className="text-center">Taxa Churn</TableHead>
                            <TableHead className="text-center">Churn Acumulado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {timelineData.map((item) => (
                            <TableRow key={item.ano}>
                              <TableCell className="font-bold">{item.ano}</TableCell>
                              <TableCell className="text-center font-medium">{item.total}</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-primary/20 text-primary border-0">{item.ativos}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-destructive/20 text-destructive border-0">{item.cancelados}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{item.taxaChurn}%</Badge>
                              </TableCell>
                              <TableCell className="text-center font-bold text-warning">{item.churnAcumulado}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Insights */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <h4 className="font-bold text-secondary mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  💡 Insights de LTV
                </h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <strong className="text-secondary">Oportunidade:</strong> Se aumentar LTV de {cohortMetrics.ltvMesesMedio.toFixed(1)} para 12 meses, o valor sobe de {formatCurrency(cohortMetrics.ltvMedio)} para {formatCurrency(metrics.ticketMedio * 12)} (+{((metrics.ticketMedio * 12 / Math.max(cohortMetrics.ltvMedio, 1) - 1) * 100).toFixed(0)}%)
                  </div>
                  <div>
                    <strong className="text-secondary">Foco:</strong> Clientes cancelados têm LTV curto. Onboarding nos primeiros 3 meses é crítico para retenção.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nova aba de Gráficos */}
          <TabsContent value="graficos" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico MRR por Produto */}
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    MRR por Produto (Top 10)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mrrPorProduto.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={mrrPorProduto} layout="vertical" margin={{ left: 10, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} className="stroke-muted/50" />
                        <XAxis 
                          type="number" 
                          tickFormatter={(v) => formatCurrency(v)} 
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis 
                          dataKey="nome" 
                          type="category" 
                          width={150} 
                          tick={{ fontSize: 11 }} 
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <RechartsTooltip 
                          formatter={(v: number) => formatCurrency(v)} 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="mrr" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Gráfico MRR por Intervalo */}
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    MRR por Intervalo de Cobrança
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mrrPorIntervalo.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsPie>
                          <Pie
                            data={mrrPorIntervalo}
                            dataKey="mrr"
                            nameKey="nome"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={({ nome, percent }) => `${nome} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {mrrPorIntervalo.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                        </RechartsPie>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-2">
                        {mrrPorIntervalo.map((item, index) => (
                          <div key={item.nome} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span>{item.nome}</span>
                            </div>
                            <span className="font-medium">{formatCurrency(item.mrr)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Timeline de Aquisição - Gráfico */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Timeline de Aquisição (por Ano)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timelineData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={timelineData} margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                      <XAxis 
                        dataKey="ano" 
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ativos" name="Ativos" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cancelados" name="Cancelados" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="churnAcumulado" name="Churn Acumulado" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="importacoes" className="space-y-4">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-0">
                {isLoadingImportacoes ? (
                  <TableSkeleton columns={7} rows={5} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Plataforma</TableHead>
                        <TableHead className="text-center">Registros</TableHead>
                        <TableHead className="text-center">Novos</TableHead>
                        <TableHead className="text-center">Atualizados</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importacoes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhuma importação realizada
                          </TableCell>
                        </TableRow>
                      ) : (
                        importacoes.map((imp) => (
                          <TableRow key={imp.id}>
                            <TableCell>{new Date(imp.created_at).toLocaleString("pt-BR")}</TableCell>
                            <TableCell className="font-medium">{imp.arquivo_nome}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{imp.plataforma}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{imp.total_registros}</TableCell>
                            <TableCell className="text-center text-emerald-600">{imp.registros_novos}</TableCell>
                            <TableCell className="text-center text-blue-600">{imp.registros_atualizados}</TableCell>
                            <TableCell>
                              {imp.status === 'concluido' ? (
                                <Badge className="bg-emerald-500">Concluído</Badge>
                              ) : imp.status === 'erro' ? (
                                <Badge variant="destructive">Erro</Badge>
                              ) : (
                                <Badge variant="secondary">Processando</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteImportMutation.mutate(imp.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Import Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
          setIsImportDialogOpen(open);
          if (!open) {
            setPreviewData(null);
            setSelectedFile(null);
          }
        }}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Importar Arquivo de Assinaturas</DialogTitle>
              <DialogDescription>
                {previewData ? "Verifique as datas antes de confirmar a importação." : "Selecione a plataforma e o arquivo Excel (.xlsx) para importar os contratos."}
              </DialogDescription>
            </DialogHeader>
            
            {!previewData ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Plataforma</Label>
                  <Select value={selectedPlataforma} onValueChange={(v) => setSelectedPlataforma(v as Plataforma)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guru">Guru</SelectItem>
                      <SelectItem value="eduzz">Eduzz</SelectItem>
                      <SelectItem value="galaxypay">GalaxyPay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Arquivo Excel</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
                        <div className="text-left">
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedFile(null)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Arraste um arquivo ou clique para selecionar
                        </p>
                        <Input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <div className="mb-3 p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4 text-primary" />
                    <span className="font-medium">Preview dos primeiros 10 registros</span>
                    <Badge variant="outline">{previewData.length} registros</Badge>
                  </div>
                </div>
                
                <ScrollArea className="h-[350px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[80px]">Código</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-center">Data Início</TableHead>
                        <TableHead className="text-center">Ult. Pgto/Status</TableHead>
                        <TableHead className="text-center">Próx. Venc.</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Ciclo</TableHead>
                        <TableHead className="text-right">MRR</TableHead>
                        <TableHead className="text-center">Cobr.</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                          <TableCell className="text-sm">{item.nome}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={item.data_inicio ? "outline" : "secondary"} className="font-mono text-xs">
                              {item.data_inicio || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={item.data_status ? "outline" : "secondary"} className="font-mono text-xs">
                              {item.data_status || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={item.data_proximo_ciclo ? "outline" : "secondary"} className="font-mono text-xs">
                              {item.data_proximo_ciclo || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.valor)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {getCicloLabel(item.ciclo_dias)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">
                            {formatCurrency(item.mrr)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-blue-100 text-blue-700">
                              {item.quantidade_cobrancas}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2 text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Verifique as datas e cálculos acima</p>
                      <p className="text-xs mt-1">
                        {selectedPlataforma === 'eduzz' 
                          ? 'Eduzz: MRR calculado = (Valor da cobrança / ciclo) × 30. Ciclo detectado pelas datas. Registros com 0 cobranças serão ignorados.'
                          : 'Confirme se as datas estão corretas antes de importar. Formato esperado: YYYY-MM-DD'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              {previewData ? (
                <>
                  <Button variant="outline" onClick={() => setPreviewData(null)}>
                    Voltar
                  </Button>
                  <Button
                    onClick={() => importMutation.mutate()}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirmar Importação
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={generatePreview}
                    disabled={!selectedFile || isLoadingPreview}
                  >
                    {isLoadingPreview ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Preview
                      </>
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
