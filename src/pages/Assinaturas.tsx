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
} from "lucide-react";

type Plataforma = "guru" | "eduzz" | "galaxypay";

interface ContratoAssinatura {
  id: string;
  codigo_assinatura: string;
  plataforma: string;
  nome_produto: string | null;
  nome_assinatura: string | null;
  nome_contato: string | null;
  email_contato: string | null;
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

const calculateLTV = (contrato: ContratoAssinatura): number => {
  if (!contrato.data_inicio || contrato.mrr <= 0) return 0;
  
  const dataInicio = new Date(contrato.data_inicio);
  const dataFim = contrato.data_cancelamento 
    ? new Date(contrato.data_cancelamento)
    : contrato.data_status 
      ? new Date(contrato.data_status)
      : new Date();
  
  const meses = Math.max(1, Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  return contrato.mrr * meses;
};

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

  // Fetch contratos
  const { data: contratos = [], isLoading: isLoadingContratos } = useQuery({
    queryKey: ["contratos-assinatura"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos_assinatura")
        .select("*")
        .order("data_inicio", { ascending: false });

      if (error) throw error;
      return data as ContratoAssinatura[];
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

  // Filter contratos
  const contratosFiltrados = useMemo(() => {
    return contratos.filter((c) => {
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

  // Calculate metrics
  const metrics = useMemo(() => {
    const ativos = contratosFiltrados.filter(c => c.status.toLowerCase() === "ativa" || c.status.toLowerCase() === "active");
    const totalMRR = ativos.reduce((sum, c) => sum + (c.mrr || 0), 0);
    const totalLTV = contratosFiltrados.reduce((sum, c) => sum + calculateLTV(c), 0);
    const churn = contratos.length > 0 
      ? (contratos.filter(c => c.status.toLowerCase() === "cancelada").length / contratos.length) * 100
      : 0;
    
    return {
      totalContratos: contratosFiltrados.length,
      contratosAtivos: ativos.length,
      totalMRR,
      totalLTV,
      ticketMedio: ativos.length > 0 ? totalMRR / ativos.length : 0,
      churnRate: churn,
    };
  }, [contratosFiltrados, contratos]);

  // Parse Excel file based on platform
  const parseExcelFile = useCallback(async (file: File, plataforma: Plataforma) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    const parseDate = (dateStr: string | number | Date | null | undefined): string | null => {
      if (!dateStr) return null;
      if (dateStr instanceof Date) {
        return dateStr.toISOString().split('T')[0];
      }
      if (typeof dateStr === 'number') {
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
      if (!val) return 0;
      if (typeof val === 'number') return val;
      const cleaned = String(val).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
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

      // Upsert contracts
      let novos = 0;
      let atualizados = 0;

      for (const contrato of contratos) {
        const { data: existing } = await supabase
          .from("contratos_assinatura")
          .select("id")
          .eq("codigo_assinatura", contrato.codigo_assinatura)
          .single();

        if (existing) {
          const { error } = await supabase
            .from("contratos_assinatura")
            .update({ ...contrato, importacao_id: importacao.id })
            .eq("id", existing.id);
          if (!error) atualizados++;
        } else {
          const { error } = await supabase
            .from("contratos_assinatura")
            .insert({ ...contrato, importacao_id: importacao.id });
          if (!error) novos++;
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.totalMRR)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Ticket Médio</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(metrics.ticketMedio)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">LTV Total</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(metrics.totalLTV)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Churn Rate</span>
              </div>
              <p className={`text-2xl font-bold ${metrics.churnRate > 5 ? 'text-destructive' : 'text-foreground'}`}>
                {metrics.churnRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
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
                          <TableHead>Status</TableHead>
                          <TableHead>Início</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contratosFiltrados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
