import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  XCircle,
  Clock,
  DollarSign,
  CalendarIcon,
  Filter,
  RefreshCw,
  Search,
  TrendingDown,
  Users,
  BarChart3,
  PieChart as PieIcon,
} from "lucide-react";
import { format, differenceInDays, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import { datePickerToString } from "@/lib/extratoUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Line,
  ComposedChart,
} from "recharts";

type ContratoAssinatura = Tables<"contratos_assinatura">;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return format(parseISO(dateStr + "T12:00:00"), "dd/MM/yyyy");
};

const CHART_COLORS = [
  'hsl(180, 67%, 59%)',   // primary - turquoise
  'hsl(205, 60%, 15%)',   // secondary - dark blue
  'hsl(0, 84%, 60%)',     // destructive - red
  'hsl(38, 92%, 50%)',    // warning - orange
  'hsl(142, 71%, 45%)',   // success - green
  'hsl(199, 89%, 48%)',   // info - blue
  'hsl(280, 60%, 50%)',   // purple
];

export default function Cancelamentos() {
  const [plataformaFilter, setPlataformaFilter] = useState<string>("all");
  const [planoFilter, setPlanoFilter] = useState<string>("all");
  const [produtoFilter, setProdutoFilter] = useState<string>("all");
  const [dataInicioFilter, setDataInicioFilter] = useState<Date | undefined>();
  const [dataFimFilter, setDataFimFilter] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch ALL contratos cancelados
  const { data: contratos = [], isLoading: isLoadingContratos, refetch } = useQuery({
    queryKey: ["contratos-cancelados"],
    queryFn: async () => {
      const allContratos: ContratoAssinatura[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("contratos_assinatura")
          .select("*")
          .ilike("status", "%cancelada%")
          .order("data_cancelamento", { ascending: false })
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

  // Listas de opções para filtros
  const { plataformas, planos, produtos } = useMemo(() => {
    const p = new Set<string>();
    const pl = new Set<string>();
    const pr = new Set<string>();
    
    contratos.forEach(c => {
      if (c.plataforma) p.add(c.plataforma);
      if (c.nome_assinatura) pl.add(c.nome_assinatura);
      if (c.nome_produto) pr.add(c.nome_produto);
    });

    return {
      plataformas: Array.from(p).sort(),
      planos: Array.from(pl).sort(),
      produtos: Array.from(pr).sort(),
    };
  }, [contratos]);

  // Contratos filtrados
  const contratosFiltrados = useMemo(() => {
    const inicioStr = datePickerToString(dataInicioFilter);
    const fimStr = datePickerToString(dataFimFilter);

    return contratos.filter(c => {
      if (plataformaFilter !== "all" && c.plataforma !== plataformaFilter) return false;
      if (planoFilter !== "all" && c.nome_assinatura !== planoFilter) return false;
      if (produtoFilter !== "all" && c.nome_produto !== produtoFilter) return false;

      if (c.data_cancelamento) {
        if (inicioStr && c.data_cancelamento < inicioStr) return false;
        if (fimStr && c.data_cancelamento > fimStr) return false;
      } else {
        return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchCliente = c.nome_contato?.toLowerCase().includes(term);
        const matchCodigo = c.codigo_assinatura.toLowerCase().includes(term);
        if (!matchCliente && !matchCodigo) return false;
      }

      return true;
    });
  }, [contratos, plataformaFilter, planoFilter, produtoFilter, dataInicioFilter, dataFimFilter, searchTerm]);

  // Dados para Gráficos
  const chartData = useMemo(() => {
    // 1. Evolução Mensal
    const mensalMap = new Map<string, { month: string; qtd: number; mrr: number }>();
    
    // 2. Por Plataforma
    const plataformaMap = new Map<string, number>();
    
    // 3. Top Produtos
    const produtoMap = new Map<string, number>();

    contratosFiltrados.forEach(c => {
      if (c.data_cancelamento) {
        const monthKey = c.data_cancelamento.substring(0, 7); // YYYY-MM
        const current = mensalMap.get(monthKey) || { month: monthKey, qtd: 0, mrr: 0 };
        current.qtd++;
        current.mrr += c.mrr || 0;
        mensalMap.set(monthKey, current);
      }

      const plat = c.plataforma || "Outros";
      plataformaMap.set(plat, (plataformaMap.get(plat) || 0) + 1);

      const prod = c.nome_produto || c.nome_assinatura || "Sem Nome";
      produtoMap.set(prod, (produtoMap.get(prod) || 0) + 1);
    });

    const mensal = Array.from(mensalMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({
        ...d,
        label: format(parseISO(d.month + "-01T12:00:00"), "MMM/yy", { locale: ptBR })
      }));

    const plataformas = Array.from(plataformaMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const topProdutos = Array.from(produtoMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { mensal, plataformas, topProdutos };
  }, [contratosFiltrados]);

  // Métricas de Cancelamento
  const metrics = useMemo(() => {
    const totalCancelamentos = contratosFiltrados.length;
    let totalMrrPerdido = 0;
    let totalDiasAtivo = 0;
    let contratosComDataValida = 0;

    contratosFiltrados.forEach(c => {
      totalMrrPerdido += c.mrr || 0;
      if (c.data_inicio && c.data_cancelamento) {
        try {
          const inicio = parseISO(c.data_inicio + "T12:00:00");
          const cancelamento = parseISO(c.data_cancelamento + "T12:00:00");
          const diasAtivo = differenceInDays(cancelamento, inicio);
          if (diasAtivo >= 0) {
            totalDiasAtivo += diasAtivo;
            contratosComDataValida++;
          }
        } catch (e) {}
      }
    });

    const tempoMedioDias = contratosComDataValida > 0 ? Math.round(totalDiasAtivo / contratosComDataValida) : 0;
    const tempoMedioMeses = tempoMedioDias > 0 ? (tempoMedioDias / 30.44).toFixed(1) : "0";

    return {
      totalCancelamentos,
      totalMrrPerdido,
      tempoMedioDias,
      tempoMedioMeses,
    };
  }, [contratosFiltrados]);

  const clearFilters = () => {
    setPlataformaFilter("all");
    setPlanoFilter("all");
    setProdutoFilter("all");
    setDataInicioFilter(undefined);
    setDataFimFilter(undefined);
    setSearchTerm("");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <XCircle className="w-7 h-7 text-destructive" />
            Análise de Cancelamentos
          </h1>
          <p className="text-muted-foreground mt-1">Métricas de churn e tempo de vida dos contratos cancelados.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" disabled={isLoadingContratos}>
          <RefreshCw className={isLoadingContratos ? "w-4 h-4 mr-2 animate-spin" : "w-4 h-4 mr-2"} />
          Atualizar Dados
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-50/50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100"><Users className="w-6 h-6 text-red-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cancelamentos</p>
                <p className="text-2xl font-bold text-red-600">{metrics.totalCancelamentos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100"><DollarSign className="w-6 h-6 text-red-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">MRR Perdido (Mensal)</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalMrrPerdido)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-100"><Clock className="w-6 h-6 text-amber-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio de Vida</p>
                <p className="text-2xl font-bold text-amber-600">{metrics.tempoMedioMeses} meses</p>
                <p className="text-xs text-muted-foreground">({metrics.tempoMedioDias} dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Filter className="w-5 h-5 text-primary" /> Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-sm">Plataforma</Label>
              <Select value={plataformaFilter} onValueChange={setPlataformaFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todas</SelectItem>{plataformas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Plano</Label>
              <Select value={planoFilter} onValueChange={setPlanoFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem>{planos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Produto</Label>
              <Select value={produtoFilter} onValueChange={setProdutoFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem>{produtos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Cancelado De</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[160px] justify-start"><CalendarIcon className="mr-2 h-4 w-4" /> {dataInicioFilter ? format(dataInicioFilter, "dd/MM/yyyy") : "Data inicial"}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataInicioFilter} onSelect={setDataInicioFilter} locale={ptBR} className="pointer-events-auto" /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Cancelado Até</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[160px] justify-start"><CalendarIcon className="mr-2 h-4 w-4" /> {dataFimFilter ? format(dataFimFilter, "dd/MM/yyyy") : "Data final"}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataFimFilter} onSelect={setDataFimFilter} locale={ptBR} className="pointer-events-auto" /></PopoverContent>
              </Popover>
            </div>
            <Button variant="ghost" onClick={clearFilters} size="sm"><RefreshCw className="w-4 h-4 mr-1" /> Limpar filtros</Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Evolução de Cancelamentos</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData.mensal}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--destructive))" />
                <RechartsTooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="qtd" name="Qtd Cancelamentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="mrr" name="MRR Perdido" stroke="hsl(var(--destructive))" strokeWidth={2} dot />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><PieIcon className="w-5 h-5 text-primary" /> Por Plataforma</CardTitle></CardHeader>
              <CardContent className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData.plataformas} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {chartData.plataformas.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Top 5 Produtos</CardTitle></CardHeader>
              <CardContent className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.topProdutos} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" name="Cancelamentos" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><TrendingDown className="w-5 h-5 text-destructive" /> Contratos Cancelados <Badge variant="secondary">{contratosFiltrados.length}</Badge></CardTitle>
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente ou código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingContratos ? <TableSkeleton columns={9} rows={10} /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50">
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto/Plano</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead className="text-center">Início</TableHead>
                    <TableHead className="text-center">Cancelamento</TableHead>
                    <TableHead className="text-right">MRR Perdido</TableHead>
                    <TableHead className="text-right">Tempo Vida</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratosFiltrados.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum contrato cancelado encontrado.</TableCell></TableRow> : (
                    contratosFiltrados.map((c) => {
                      let diasAtivo = 0;
                      if (c.data_inicio && c.data_cancelamento) {
                        try {
                          const inicio = parseISO(c.data_inicio + "T12:00:00");
                          const cancelamento = parseISO(c.data_cancelamento + "T12:00:00");
                          diasAtivo = differenceInDays(cancelamento, inicio);
                        } catch (e) { diasAtivo = 0; }
                      }
                      const tempoVidaBadge = diasAtivo > 0 ? (diasAtivo / 30.44).toFixed(1) : "-";
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs">{c.codigo_assinatura.slice(0, 15)}...</TableCell>
                          <TableCell className="font-medium">{c.nome_contato || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={c.nome_produto || c.nome_assinatura || ''}>
                            <p className="font-medium text-xs">{c.nome_produto || c.nome_assinatura || '-'}</p>
                            <p className="text-[10px] text-muted-foreground">{c.nome_assinatura || ''}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="capitalize text-[10px]">{c.plataforma}</Badge></TableCell>
                          <TableCell className="text-center text-xs">{formatDate(c.data_inicio)}</TableCell>
                          <TableCell className="text-center text-xs">{formatDate(c.data_cancelamento)}</TableCell>
                          <TableCell className="text-right font-medium text-destructive">{formatCurrency(c.mrr || 0)}</TableCell>
                          <TableCell className="text-right"><Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">{tempoVidaBadge} meses</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={c.motivo_cancelamento || ''}>{c.motivo_cancelamento || '-'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}