import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  List, 
  CalendarIcon,
  Search,
  X,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download
} from "lucide-react";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
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

interface ExtratoAsaas {
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

const ITEMS_PER_PAGE = 20;

const CHART_COLORS = [
  "#45E5E5", "#FFB800", "#22C55E", "#EF4444", "#8B5CF6", 
  "#F97316", "#06B6D4", "#EC4899", "#10B981", "#6366F1"
];

export default function ExtratoAsaasDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Filter states
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [tiposSelecionados, setTiposSelecionados] = useState<string[]>([]);
  const [lancamentoFiltro, setLancamentoFiltro] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  
  // Sorting & pagination
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch importação
  const { data: importacao, isLoading: isLoadingImportacao } = useQuery({
    queryKey: ["importacao-extrato", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes_extrato")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as ImportacaoExtrato | null;
    },
    enabled: !!id,
  });

  // Fetch transações
  const { data: transacoes = [], isLoading: isLoadingTransacoes } = useQuery({
    queryKey: ["extrato-asaas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extrato_asaas")
        .select("*")
        .eq("importacao_id", id)
        .order("data", { ascending: false });
      
      if (error) throw error;
      return data as ExtratoAsaas[];
    },
    enabled: !!id,
  });

  // Get unique tipos for filter
  const tiposUnicos = useMemo(() => {
    const tipos = new Set(transacoes.map(t => t.tipo_transacao));
    return Array.from(tipos).sort();
  }, [transacoes]);

  // Filtered and sorted transações
  const transacoesFiltradas = useMemo(() => {
    let filtered = [...transacoes];

    // Filter by date range
    if (dataInicio) {
      filtered = filtered.filter(t => new Date(t.data + "T12:00:00") >= dataInicio);
    }
    if (dataFim) {
      filtered = filtered.filter(t => new Date(t.data + "T12:00:00") <= dataFim);
    }

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

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "data":
          aVal = new Date(a.data);
          bVal = new Date(b.data);
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
  }, [transacoes, dataInicio, dataFim, tiposSelecionados, lancamentoFiltro, busca, sortField, sortOrder]);

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

  // Pie chart data - group by tipo_transacao
  const pieData = useMemo(() => {
    const grouped = transacoesFiltradas.reduce((acc, t) => {
      const key = t.tipo_transacao;
      if (!acc[key]) acc[key] = 0;
      acc[key] += Math.abs(t.valor);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [transacoesFiltradas]);

  // Bar chart data - group by date
  const barData = useMemo(() => {
    const grouped = transacoesFiltradas.reduce((acc, t) => {
      const dateKey = t.data;
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, creditos: 0, debitos: 0 };
      }
      if (t.tipo_lancamento === "Crédito") {
        acc[dateKey].creditos += Math.abs(t.valor);
      } else {
        acc[dateKey].debitos += Math.abs(t.valor);
      }
      return acc;
    }, {} as Record<string, { date: string; creditos: number; debitos: number }>);

    return Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        dateFormatted: format(new Date(d.date + "T12:00:00"), "dd/MM"),
      }));
  }, [transacoesFiltradas]);

  // Pagination
  const totalPages = Math.ceil(transacoesFiltradas.length / ITEMS_PER_PAGE);
  const paginatedTransacoes = transacoesFiltradas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [dataInicio, dataFim, tiposSelecionados, lancamentoFiltro, busca]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const clearFilters = () => {
    setDataInicio(undefined);
    setDataFim(undefined);
    setTiposSelecionados([]);
    setLancamentoFiltro("todos");
    setBusca("");
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? 
      <ChevronUp className="w-4 h-4 inline ml-1" /> : 
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  if (isLoadingImportacao || isLoadingTransacoes) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!importacao) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] p-6">
        <div className="max-w-7xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/extrato-asaas")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="text-center py-16 text-muted-foreground">
            Importação não encontrada.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/extrato-asaas")}
              className="mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Extrato: {importacao.arquivo_nome}
              </h1>
              <p className="text-muted-foreground">
                Período: {formatDate(importacao.periodo_inicio)} a {formatDate(importacao.periodo_fim)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const exportData = transacoesFiltradas.map(t => ({
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
              XLSX.writeFile(wb, `extrato_asaas_${today}.xlsx`);
            }}
            disabled={transacoesFiltradas.length === 0}
            className="border-[#45E5E5] text-[#45E5E5] hover:bg-[#45E5E5] hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Recebido */}
          <Card className="bg-white shadow-sm border-l-4 border-l-emerald-500">
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

          {/* Total Taxas */}
          <Card className="bg-white shadow-sm border-l-4 border-l-red-500">
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

          {/* Resultado Líquido */}
          <Card className="bg-white shadow-sm border-l-4 border-l-[#45E5E5]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#45E5E5]/20">
                  <Calculator className="w-6 h-6 text-[#45E5E5]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resultado Líquido</p>
                  <p className="text-2xl font-bold text-[#10293F]">
                    {formatCurrency(metrics.resultado)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transações */}
          <Card className="bg-white shadow-sm border-l-4 border-l-[#FFB800]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#FFB800]/20">
                  <List className="w-6 h-6 text-[#FFB800]" />
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

        {/* Filters */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Data Inicial */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[160px] justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={setDataInicio}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              {/* Data Final */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[160px] justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy") : "Data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              {/* Tipo de Transação */}
              <Select 
                value={tiposSelecionados.length === 1 ? tiposSelecionados[0] : ""}
                onValueChange={(val) => setTiposSelecionados(val ? [val] : [])}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tipo de transação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os tipos</SelectItem>
                  {tiposUnicos.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Lançamento */}
              <Select value={lancamentoFiltro} onValueChange={setLancamentoFiltro}>
                <SelectTrigger className="w-[150px]">
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
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
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
                      label={({ name, percent }) => 
                        `${name.substring(0, 15)}${name.length > 15 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Movimentação Diária</CardTitle>
            </CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateFormatted" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                    <RechartsTooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="creditos" name="Créditos" fill="#22C55E" />
                    <Bar dataKey="debitos" name="Débitos" fill="#EF4444" />
                  </BarChart>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransacoes.map((t, idx) => (
                      <TableRow 
                        key={t.id} 
                        className={idx % 2 === 0 ? "bg-white" : "bg-muted/30"}
                      >
                        <TableCell>{formatDate(t.data)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {t.tipo_transacao}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[250px]">
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, transacoesFiltradas.length)} de{" "}
                  {transacoesFiltradas.length} transações
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
