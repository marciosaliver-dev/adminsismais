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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

// Calculate LTV based on ciclo_dias and quantidade_cobrancas
// For annual (365 days) with 1 charge = 12 months
// For monthly (30 days) with N charges = N months
const calculateLTV = (contrato: ContratoAssinatura): number => {
  if (!contrato.mrr || contrato.mrr <= 0) return 0;
  
  const qtdCobrancas = contrato.quantidade_cobrancas || 0;
  if (qtdCobrancas <= 0) return 0;
  
  // Calculate months based on cycle and quantity of charges
  const ciclo = contrato.ciclo_dias || 30;
  const mesesPorCiclo = ciclo / 30; // 365 days = ~12 months, 30 days = 1 month
  const totalMeses = qtdCobrancas * mesesPorCiclo;
  
  return contrato.mrr * totalMeses;
};

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Assinaturas() {
  const queryClient = useQueryClient();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPlataforma, setSelectedPlataforma] = useState<Plataforma>("guru");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("contratos");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [plataformaFilter, setPlataformaFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

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
      const matchSearch = searchTerm === "" || 
        c.nome_contato?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email_contato?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.codigo_assinatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.nome_produto?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchStatus && matchPlataforma && matchSearch;
    });
  }, [contratos, statusFilter, plataformaFilter, searchTerm]);

  // Contratos válidos (com cobranças > 0) para métricas
  const contratosValidos = useMemo(() => {
    return contratos.filter(c => (c.quantidade_cobrancas || 0) > 0);
  }, [contratos]);

  // Calculate unique clients using email/phone
  const clientesUnicos = useMemo(() => {
    const uniqueClients = new Set<string>();
    contratosValidos.forEach(c => {
      const key = c.email_contato?.toLowerCase() || c.telefone_contato || c.codigo_assinatura;
      if (key) uniqueClients.add(key);
    });
    return uniqueClients.size;
  }, [contratosValidos]);

  // Clientes ativos únicos
  const clientesAtivosUnicos = useMemo(() => {
    const uniqueClients = new Set<string>();
    contratosValidos
      .filter(c => c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active")
      .forEach(c => {
        const key = c.email_contato?.toLowerCase() || c.telefone_contato || c.codigo_assinatura;
        if (key) uniqueClients.add(key);
      });
    return uniqueClients.size;
  }, [contratosValidos]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const ativos = contratosValidos.filter(c => c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active");
    const totalMRR = ativos.reduce((sum, c) => sum + (c.mrr || 0), 0);
    const totalLTV = contratosValidos.reduce((sum, c) => sum + calculateLTV(c), 0);
    const cancelados = contratosValidos.filter(c => c.status.toLowerCase() === "cancelada");
    const churn = contratosValidos.length > 0 
      ? (cancelados.length / contratosValidos.length) * 100
      : 0;
    
    return {
      totalContratos: contratosValidos.length,
      contratosAtivos: ativos.length,
      totalMRR,
      totalLTV,
      ticketMedio: ativos.length > 0 ? totalMRR / ativos.length : 0,
      churnRate: churn,
      clientesUnicos,
      clientesAtivosUnicos,
    };
  }, [contratosValidos, clientesUnicos, clientesAtivosUnicos]);

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

  // Cohort Analysis (by month of signup)
  const cohortData = useMemo(() => {
    const cohortMap = new Map<string, { 
      total: number; 
      ativos: number; 
      cancelados: number;
      mrr: number;
      ltv: number;
    }>();
    
    contratosValidos.forEach(c => {
      if (!c.data_inicio) return;
      const mes = c.data_inicio.substring(0, 7); // YYYY-MM
      const current = cohortMap.get(mes) || { total: 0, ativos: 0, cancelados: 0, mrr: 0, ltv: 0 };
      
      current.total++;
      current.ltv += calculateLTV(c);
      
      if (c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active") {
        current.ativos++;
        current.mrr += c.mrr || 0;
      } else if (c.status.toLowerCase() === "cancelada") {
        current.cancelados++;
      }
      
      cohortMap.set(mes, current);
    });
    
    return Array.from(cohortMap.entries())
      .map(([mes, data]) => ({
        mes,
        mesFormatado: new Date(mes + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        total: data.total,
        ativos: data.ativos,
        cancelados: data.cancelados,
        retencao: data.total > 0 ? ((data.ativos / data.total) * 100).toFixed(1) : 0,
        mrr: data.mrr,
        ltv: data.ltv,
        ltvMedio: data.total > 0 ? data.ltv / data.total : 0,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [contratosValidos]);

  // Parse Excel file based on platform
  const parseExcelFile = useCallback(async (file: File, plataforma: Plataforma) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });

    const parseDate = (dateStr: string | number | Date | null | undefined): string | null => {
      if (!dateStr) return null;
      if (dateStr instanceof Date) {
        return dateStr.toISOString().split('T')[0];
      }
      if (typeof dateStr === 'number') {
        // Excel serial date
        const excelDate = new Date((dateStr - 25569) * 86400 * 1000);
        return excelDate.toISOString().split('T')[0];
      }
      // Try DD/MM/YYYY HH:mm:ss format
      const match = String(dateStr).match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
      // Try YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(String(dateStr))) {
        return String(dateStr).split('T')[0];
      }
      return null;
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

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Contratos</span>
              </div>
              <p className="text-2xl font-bold">{metrics.totalContratos}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Ativos</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{metrics.contratosAtivos}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">MRR Total</span>
              </div>
              <p className="text-xl font-bold text-primary">{formatCurrency(metrics.totalMRR)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Ticket Médio</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(metrics.ticketMedio)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">LTV Total</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(metrics.totalLTV)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Churn Rate</span>
              </div>
              <p className={`text-xl font-bold ${metrics.churnRate > 5 ? 'text-destructive' : 'text-foreground'}`}>
                {metrics.churnRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-violet-500" />
                <span className="text-xs text-muted-foreground">Clientes Únicos</span>
              </div>
              <p className="text-2xl font-bold text-violet-600">{metrics.clientesUnicos}</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Clientes Ativos</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{metrics.clientesAtivosUnicos}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
            <TabsTrigger value="analise">Análise & Cohort</TabsTrigger>
            <TabsTrigger value="importacoes">Histórico de Importações</TabsTrigger>
          </TabsList>

          <TabsContent value="contratos" className="space-y-4">
            {/* Filters */}
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
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
            {/* MRR by Product */}
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
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={mrrPorProduto} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis dataKey="nome" type="category" width={150} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="mrr" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
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
                    <div className="flex flex-col gap-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <RechartsPie>
                          <Pie
                            data={mrrPorIntervalo}
                            dataKey="mrr"
                            nameKey="nome"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ nome, percent }) => `${nome} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {mrrPorIntervalo.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        </RechartsPie>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {mrrPorIntervalo.map((item, index) => (
                          <div key={item.nome} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span>{item.nome}</span>
                              <Badge variant="outline" className="text-xs">{item.contratos} contratos</Badge>
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

            {/* Cohort Analysis */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Análise de Cohort (por mês de início)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cohortData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                ) : (
                  <>
                    <div className="mb-6">
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={cohortData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mesFormatado" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                          <Tooltip 
                            formatter={(value: number, name: string) => {
                              if (name === 'retencao') return [`${value}%`, 'Retenção'];
                              if (name === 'mrr') return [formatCurrency(value), 'MRR Ativo'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="total" name="Total Contratos" stroke="#8b5cf6" strokeWidth={2} />
                          <Line yAxisId="left" type="monotone" dataKey="ativos" name="Ativos" stroke="#10b981" strokeWidth={2} />
                          <Line yAxisId="right" type="monotone" dataKey="retencao" name="Retenção %" stroke="#f59e0b" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted/50">
                          <TableRow>
                            <TableHead>Mês Cohort</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Ativos</TableHead>
                            <TableHead className="text-center">Cancelados</TableHead>
                            <TableHead className="text-center">Retenção</TableHead>
                            <TableHead className="text-right">MRR Ativo</TableHead>
                            <TableHead className="text-right">LTV Total</TableHead>
                            <TableHead className="text-right">LTV Médio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cohortData.map((cohort) => (
                            <TableRow key={cohort.mes}>
                              <TableCell className="font-medium">{cohort.mesFormatado}</TableCell>
                              <TableCell className="text-center">{cohort.total}</TableCell>
                              <TableCell className="text-center text-emerald-600">{cohort.ativos}</TableCell>
                              <TableCell className="text-center text-destructive">{cohort.cancelados}</TableCell>
                              <TableCell className="text-center">
                                <Badge 
                                  variant={Number(cohort.retencao) >= 80 ? 'default' : Number(cohort.retencao) >= 50 ? 'secondary' : 'destructive'}
                                  className={Number(cohort.retencao) >= 80 ? 'bg-emerald-500' : ''}
                                >
                                  {cohort.retencao}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-primary font-medium">{formatCurrency(cohort.mrr)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(cohort.ltv)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(cohort.ltvMedio)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </>
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
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Importar Arquivo de Assinaturas</DialogTitle>
              <DialogDescription>
                Selecione a plataforma e o arquivo Excel (.xlsx) para importar os contratos.
              </DialogDescription>
            </DialogHeader>
            
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

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={!selectedFile || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
