import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  TrendingUp, 
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
  Download,
  Hash,
  DollarSign
} from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
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

interface ExtratoEduzz {
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

const ITEMS_PER_PAGE = 100;

const CHART_COLORS = [
  "#45E5E5", "#FFB800", "#22C55E", "#EF4444", "#8B5CF6", 
  "#F97316", "#06B6D4", "#EC4899", "#10B981", "#6366F1"
];

export default function ExtratoEduzzDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Filter states
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [tiposSelecionados, setTiposSelecionados] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  
  // Sorting & pagination
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch importação
  const { data: importacao, isLoading: isLoadingImportacao } = useQuery({
    queryKey: ["importacao-extrato-eduzz", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes_extrato_eduzz")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as ImportacaoEduzz | null;
    },
    enabled: !!id,
  });

  // Fetch transações
  const { data: transacoes = [], isLoading: isLoadingTransacoes } = useQuery({
    queryKey: ["extrato-eduzz-detalhe", id],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: ExtratoEduzz[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("extrato_eduzz")
          .select("*")
          .eq("importacao_id", id)
          .order("data", { ascending: false })
          .range(from, to);

        if (error) throw error;

        allData = [...allData, ...(data || [])];
        hasMore = (data?.length || 0) === PAGE_SIZE;
        page++;
      }

      return allData as ExtratoEduzz[];
    },
    enabled: !!id,
  });

  // Get unique tipos for filter
  const tiposUnicos = useMemo(() => {
    const tipos = new Set(transacoes.map(t => t.tipo_transacao));
    return Array.from(tipos).sort();
  }, [transacoes]);

  const datePickerToString = (date: Date | undefined): string | null => {
    if (!date) return null;
    return format(date, "yyyy-MM-dd");
  };

  // Filtered and sorted transações
  const transacoesFiltradas = useMemo(() => {
    let filtered = [...transacoes];

    if (dataInicio) {
      const inicioStr = datePickerToString(dataInicio);
      if (inicioStr) {
        filtered = filtered.filter(t => t.data >= inicioStr);
      }
    }
    if (dataFim) {
      const fimStr = datePickerToString(dataFim);
      if (fimStr) {
        filtered = filtered.filter(t => t.data <= fimStr);
      }
    }

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
  }, [transacoes, dataInicio, dataFim, tiposSelecionados, busca, sortField, sortOrder]);

  // Calculate metrics from filtered data
  const metrics = useMemo(() => {
    const totalVendas = transacoesFiltradas.reduce((sum, t) => sum + t.valor, 0);
    const totalTransacoes = transacoesFiltradas.length;
    const ticketMedio = totalTransacoes > 0 ? totalVendas / totalTransacoes : 0;
    
    return {
      totalVendas,
      totalTransacoes,
      ticketMedio,
    };
  }, [transacoesFiltradas]);

  // Resumo por tipo de transação
  const resumoPorTipo = useMemo(() => {
    const grouped = transacoesFiltradas.reduce((acc, t) => {
      const key = t.tipo_transacao;
      if (!acc[key]) acc[key] = { tipo: key, qtd: 0, valor: 0 };
      acc[key].qtd += 1;
      acc[key].valor += t.valor;
      return acc;
    }, {} as Record<string, { tipo: string; qtd: number; valor: number }>);

    return Object.values(grouped).sort((a, b) => b.valor - a.valor);
  }, [transacoesFiltradas]);

  // Resumo por período do mês
  const resumoPorPeriodo = useMemo(() => {
    const periodos = {
      "Dias 1 a 10": { qtd: 0, valor: 0 },
      "Dias 11 a 20": { qtd: 0, valor: 0 },
      "Dias 21 a 30/31": { qtd: 0, valor: 0 },
    };

    transacoesFiltradas.forEach(t => {
      const day = parseInt(t.data.split("-")[2], 10);
      if (day >= 1 && day <= 10) {
        periodos["Dias 1 a 10"].qtd += 1;
        periodos["Dias 1 a 10"].valor += t.valor;
      } else if (day >= 11 && day <= 20) {
        periodos["Dias 11 a 20"].qtd += 1;
        periodos["Dias 11 a 20"].valor += t.valor;
      } else {
        periodos["Dias 21 a 30/31"].qtd += 1;
        periodos["Dias 21 a 30/31"].valor += t.valor;
      }
    });

    return Object.entries(periodos).map(([periodo, dados]) => ({
      periodo,
      ...dados,
    }));
  }, [transacoesFiltradas]);

  // Pie chart data
  const pieData = useMemo(() => {
    return resumoPorTipo.slice(0, 10).map(r => ({
      name: r.tipo,
      value: r.valor,
    }));
  }, [resumoPorTipo]);

  // Bar chart data - group by date
  const barData = useMemo(() => {
    const grouped = transacoesFiltradas.reduce((acc, t) => {
      const dateKey = t.data;
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, vendas: 0 };
      }
      acc[dateKey].vendas += t.valor;
      return acc;
    }, {} as Record<string, { date: string; vendas: number }>);

    return Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        dateFormatted: formatDateBR(d.date).substring(0, 5),
      }));
  }, [transacoesFiltradas]);

  // Pagination
  const totalPages = Math.ceil(transacoesFiltradas.length / ITEMS_PER_PAGE);
  const paginatedTransacoes = transacoesFiltradas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [dataInicio, dataFim, tiposSelecionados, busca]);

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
    setBusca("");
  };

  const toggleTipo = (tipo: string) => {
    setTiposSelecionados(prev => 
      prev.includes(tipo) 
        ? prev.filter(t => t !== tipo)
        : [...prev, tipo]
    );
  };

  const selectAllTipos = () => {
    if (tiposSelecionados.length === tiposUnicos.length) {
      setTiposSelecionados([]);
    } else {
      setTiposSelecionados([...tiposUnicos]);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDateBR = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
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
          <Button variant="ghost" onClick={() => navigate("/extrato-eduzz")}>
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
              onClick={() => navigate("/extrato-eduzz")}
              className="mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Extrato Eduzz: {importacao.arquivo_nome}
              </h1>
              <p className="text-muted-foreground">
                Período: {formatDateBR(importacao.periodo_inicio)} a {formatDateBR(importacao.periodo_fim)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const exportData = transacoesFiltradas.map(t => ({
                "Data": formatDateBR(t.data),
                "Tipo Transação": t.tipo_transacao,
                "Descrição": t.descricao,
                "Fatura": t.fatura_id,
                "Valor": t.valor,
              }));
              const ws = XLSX.utils.json_to_sheet(exportData);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Extrato");
              const today = format(new Date(), "yyyy-MM-dd");
              XLSX.writeFile(wb, `extrato_eduzz_${today}.xlsx`);
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
          <Card className="bg-white shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-emerald-100">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendas</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(metrics.totalVendas)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-l-4 border-l-[#45E5E5]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#45E5E5]/20">
                  <Calculator className="w-6 h-6 text-[#45E5E5]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold text-[#10293F]">
                    {formatCurrency(metrics.ticketMedio)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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

          <Card className="bg-white shadow-sm border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-100">
                  <Hash className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipos de Transação</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {tiposUnicos.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
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
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

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
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Button variant="ghost" onClick={clearFilters} size="sm">
                <X className="w-4 h-4 mr-1" />
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grid de Resumo + Looker Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Resumo por Tipo de Transação</CardTitle>
                  <Button variant="outline" size="sm" onClick={selectAllTipos}>
                    {tiposSelecionados.length === tiposUnicos.length ? "Limpar todos" : "Selecionar todos"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="w-10">
                        <Checkbox 
                          checked={tiposSelecionados.length === tiposUnicos.length && tiposUnicos.length > 0}
                          onCheckedChange={selectAllTipos}
                        />
                      </TableHead>
                      <TableHead>Tipo de transação</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumoPorTipo.map((r, idx) => (
                      <TableRow key={r.tipo} className={idx % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <Checkbox 
                            checked={tiposSelecionados.includes(r.tipo)}
                            onCheckedChange={() => toggleTipo(r.tipo)}
                          />
                        </TableCell>
                        <TableCell>{r.tipo}</TableCell>
                        <TableCell className="text-center">{r.qtd}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">
                          {formatCurrency(r.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>Total Geral</TableCell>
                      <TableCell className="text-center">{metrics.totalTransacoes}</TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {formatCurrency(metrics.totalVendas)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Hash className="w-5 h-5 text-[#45E5E5]" />
                  <span className="text-sm text-muted-foreground">Record Count</span>
                </div>
                <p className="text-3xl font-bold text-[#10293F]">
                  {transacoesFiltradas.length.toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm text-muted-foreground">Valor Total</span>
                </div>
                <p className="text-3xl font-bold text-emerald-600">
                  {formatCurrency(transacoesFiltradas.reduce((sum, t) => sum + t.valor, 0))}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Resumo por Período do Mês */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              📅 Resumo por Período do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-center">Qtd Vendas</TableHead>
                  <TableHead className="text-right">Total Vendas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumoPorPeriodo.map((r, idx) => (
                  <TableRow key={r.periodo} className={idx % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                    <TableCell className="font-medium">{r.periodo}</TableCell>
                    <TableCell className="text-center">{r.qtd}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {formatCurrency(r.valor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Total Geral</TableCell>
                  <TableCell className="text-center">{metrics.totalTransacoes}</TableCell>
                  <TableCell className="text-right text-emerald-600">
                    {formatCurrency(metrics.totalVendas)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Active Filters Bar */}
        {tiposSelecionados.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtros ativos:</span>
            {tiposSelecionados.map(tipo => (
              <Badge 
                key={tipo} 
                variant="secondary" 
                className="cursor-pointer hover:bg-muted"
                onClick={() => toggleTipo(tipo)}
              >
                {tipo}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setTiposSelecionados([])}>
              Limpar todos
            </Button>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Vendas por Dia</CardTitle>
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
                    <Bar dataKey="vendas" name="Vendas" fill="#22C55E" />
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
                    <TableHead 
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("descricao")}
                    >
                      Descrição <SortIcon field="descricao" />
                    </TableHead>
                    <TableHead>Fatura</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("valor")}
                    >
                      Valor <SortIcon field="valor" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransacoes.map((t, idx) => (
                      <TableRow 
                        key={t.id} 
                        className={idx % 2 === 0 ? "bg-card" : "bg-muted/30"}
                      >
                        <TableCell>{formatDateBR(t.data)}</TableCell>
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
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          {t.fatura_id}
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">
                          {formatCurrency(t.valor)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4}>Total geral</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {formatCurrency(transacoesFiltradas.reduce((sum, t) => sum + t.valor, 0))}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

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
