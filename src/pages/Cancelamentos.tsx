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
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import { datePickerToString } from "@/lib/extratoUtils";

type ContratoAssinatura = Tables<"contratos_assinatura">;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  // Adiciona T12:00:00 para evitar problemas de timezone ao parsear datas ISO
  return format(parseISO(dateStr + "T12:00:00"), "dd/MM/yyyy");
};

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
      // Filtro Plataforma
      if (plataformaFilter !== "all" && c.plataforma !== plataformaFilter) return false;
      
      // Filtro Plano
      if (planoFilter !== "all" && c.nome_assinatura !== planoFilter) return false;
      
      // Filtro Produto
      if (produtoFilter !== "all" && c.nome_produto !== produtoFilter) return false;

      // Filtro Período de Cancelamento
      if (c.data_cancelamento) {
        if (inicioStr && c.data_cancelamento < inicioStr) return false;
        if (fimStr && c.data_cancelamento > fimStr) return false;
      } else {
        // Se não tem data de cancelamento, ignora (embora o fetch já filtre por status cancelado)
        return false;
      }

      // Filtro Busca
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchCliente = c.nome_contato?.toLowerCase().includes(term);
        const matchCodigo = c.codigo_assinatura.toLowerCase().includes(term);
        if (!matchCliente && !matchCodigo) return false;
      }

      return true;
    });
  }, [contratos, plataformaFilter, planoFilter, produtoFilter, dataInicioFilter, dataFimFilter, searchTerm]);

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
          // Adiciona T12:00:00 para garantir que as datas sejam tratadas como UTC ou local consistente
          const inicio = parseISO(c.data_inicio + "T12:00:00");
          const cancelamento = parseISO(c.data_cancelamento + "T12:00:00");
          
          const diasAtivo = differenceInDays(cancelamento, inicio);
          if (diasAtivo >= 0) {
            totalDiasAtivo += diasAtivo;
            contratosComDataValida++;
          }
        } catch (e) {
          // Ignora contratos com datas inválidas
        }
      }
    });

    const tempoMedioDias = contratosComDataValida > 0 
      ? Math.round(totalDiasAtivo / contratosComDataValida) 
      : 0;
      
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <XCircle className="w-7 h-7 text-destructive" />
            Análise de Cancelamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Métricas de churn e tempo de vida dos contratos cancelados.
          </p>
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
              <div className="p-3 rounded-full bg-red-100">
                <Users className="w-6 h-6 text-red-600" />
              </div>
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
              <div className="p-3 rounded-full bg-red-100">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
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
              <div className="p-3 rounded-full bg-amber-100">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Plataforma */}
            <div className="space-y-2">
              <Label className="text-sm">Plataforma</Label>
              <Select value={plataformaFilter} onValueChange={setPlataformaFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {plataformas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Plano */}
            <div className="space-y-2">
              <Label className="text-sm">Plano</Label>
              <Select value={planoFilter} onValueChange={setPlanoFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {planos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Produto */}
            <div className="space-y-2">
              <Label className="text-sm">Produto</Label>
              <Select value={produtoFilter} onValueChange={setProdutoFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {produtos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Data Início Cancelamento */}
            <div className="space-y-2">
              <Label className="text-sm">Cancelado De</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[160px] justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dataInicioFilter ? format(dataInicioFilter, "dd/MM/yyyy") : "Data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataInicioFilter}
                    onSelect={setDataInicioFilter}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Fim Cancelamento */}
            <div className="space-y-2">
              <Label className="text-sm">Cancelado Até</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[160px] justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dataFimFilter ? format(dataFimFilter, "dd/MM/yyyy") : "Data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataFimFilter}
                    onSelect={setDataFimFilter}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button variant="ghost" onClick={clearFilters} size="sm">
              <RefreshCw className="w-4 h-4 mr-1" />
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-destructive" />
              Contratos Cancelados
              <Badge variant="secondary">{contratosFiltrados.length}</Badge>
            </CardTitle>
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingContratos ? (
            <TableSkeleton columns={7} rows={10} />
          ) : (
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
                    <TableHead className="text-right">Dias Ativo</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhum contrato cancelado encontrado com os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contratosFiltrados.map((c) => {
                      let diasAtivo = 0;
                      if (c.data_inicio && c.data_cancelamento) {
                        try {
                          const inicio = parseISO(c.data_inicio + "T12:00:00");
                          const cancelamento = parseISO(c.data_cancelamento + "T12:00:00");
                          diasAtivo = differenceInDays(cancelamento, inicio);
                        } catch (e) {
                          diasAtivo = 0;
                        }
                      }
                      
                      const tempoVidaBadge = diasAtivo > 0 ? (diasAtivo / 30.44).toFixed(1) : "-";

                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs">{c.codigo_assinatura.slice(0, 20)}...</TableCell>
                          <TableCell>{c.nome_contato || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={c.nome_produto || c.nome_assinatura || ''}>
                            <p className="font-medium">{c.nome_produto || c.nome_assinatura || '-'}</p>
                            <p className="text-xs text-muted-foreground">{c.nome_assinatura || ''}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{c.plataforma}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{formatDate(c.data_inicio)}</TableCell>
                          <TableCell className="text-center">{formatDate(c.data_cancelamento)}</TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            {formatCurrency(c.mrr || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300">
                              {tempoVidaBadge} meses
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={c.motivo_cancelamento || ''}>
                            {c.motivo_cancelamento || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  }
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}