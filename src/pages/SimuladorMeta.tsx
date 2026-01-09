import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { format, differenceInMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Target,
  TrendingUp,
  Users,
  DollarSign,
  RefreshCw,
  Database,
  CalendarIcon,
  ShoppingCart,
  UserPlus,
  Megaphone,
  Clock,
  Percent,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Loader2,
  Sparkles,
  Brain,
  BarChart3,
  Info,
  ArrowUpRight,
  Zap,
  LineChart as LineChartIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";

interface SimuladorInputs {
  mrrAtual: number;
  mrrMeta: number;
  dataMeta: Date | undefined;
  ticketMedio: number;
  churnMensal: number;
  taxaConversao: number;
  custoPorLead: number;
  leadsVendedorMes: number;
  custoFixoVendedor: number;
  comissaoVenda: number;
  vendedoresAtuais: number;
  ltvMeses: number;
  clientesAtivos: number;
}

interface SimuladorOutputs {
  receitaNecessaria: number;
  novasVendas: number;
  leadsNecessarios: number;
  investimentoMarketing: number;
  vendedoresNecessarios: number;
  vendedoresAdicionais: number;
  custoVendedores: number;
  custoTotal: number;
  roi: number;
  paybackMeses: number;
  mesesAteData: number;
  vendasPorMes: number;
  leadsPorMes: number;
  ltv: number;
  cac: number;
  ltvCacRatio: number;
  clientesNecessarios: number;
  taxaCrescimentoClientes: number;
  // Novos cálculos
  taxaCrescimentoMrr: number;
  crescimentoMensalMrr: number;
  faturamentoAnualProjetado: number;
  arProjetado: number;
}

// Benchmarks SaaS B2B Brasil
const BENCHMARKS = {
  churnMensal: { excelente: 2, bom: 3, medio: 5, ruim: 8 },
  taxaConversao: { excelente: 7, bom: 5, medio: 2.5, ruim: 1 },
  ltvCacRatio: { excelente: 5, bom: 3, medio: 2, ruim: 1 },
  paybackMeses: { excelente: 4, bom: 6, medio: 12, ruim: 18 },
  ticketMedio: { baixo: 100, medio: 300, alto: 800, enterprise: 2000 },
  crescimentoMensal: { acelerado: 15, rapido: 10, saudavel: 5, lento: 2 },
  custoPorLead: { barato: 5, medio: 15, caro: 40, muitoCaro: 80 },
};

const getBenchmarkStatus = (value: number, benchmark: { excelente?: number; bom: number; medio: number; ruim: number }, higherIsBetter = true) => {
  if (higherIsBetter) {
    if (benchmark.excelente && value >= benchmark.excelente) return { status: "excelente", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" };
    if (value >= benchmark.bom) return { status: "bom", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" };
    if (value >= benchmark.medio) return { status: "médio", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" };
    return { status: "ruim", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" };
  } else {
    if (benchmark.excelente && value <= benchmark.excelente) return { status: "excelente", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" };
    if (value <= benchmark.bom) return { status: "bom", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" };
    if (value <= benchmark.medio) return { status: "médio", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" };
    return { status: "ruim", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" };
  }
};

const defaultInputs: SimuladorInputs = {
  mrrAtual: 0,
  mrrMeta: 50000,
  dataMeta: addMonths(new Date(), 12),
  ticketMedio: 100,
  churnMensal: 5,
  taxaConversao: 2.5,
  custoPorLead: 5,
  leadsVendedorMes: 300,
  custoFixoVendedor: 3000,
  comissaoVenda: 5,
  vendedoresAtuais: 1,
  ltvMeses: 12,
  clientesAtivos: 0,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value) + "%";

export default function SimuladorMeta() {
  const [inputs, setInputs] = useState<SimuladorInputs>(defaultInputs);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [mrrManual, setMrrManual] = useState(false); // Flag para MRR manual

  // Buscar dados reais para carregar
  const { data: dadosReais, refetch: refetchDados } = useQuery({
    queryKey: ["dados-simulador"],
    queryFn: async () => {
      // Buscar último fechamento
      const { data: fechamento } = await supabase
        .from("fechamento_comissao")
        .select("total_mrr, total_vendas")
        .order("mes_referencia", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Buscar colaboradores vendedores
      const { data: vendedores, count } = await supabase
        .from("colaboradores")
        .select("*", { count: "exact", head: true })
        .eq("ativo", true)
        .eq("eh_vendedor_direto", true);

      // Buscar última meta configurada
      const { data: meta } = await supabase
        .from("meta_mensal")
        .select("*")
        .order("mes_referencia", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        mrrAtual: fechamento?.total_mrr || 0,
        ticketMedio: fechamento?.total_mrr && fechamento?.total_vendas 
          ? fechamento.total_mrr / fechamento.total_vendas 
          : 100,
        vendedoresAtuais: count || 1,
        churnMensal: meta?.limite_churn || 5,
      };
    },
    enabled: false,
  });

  const carregarDadosReais = async () => {
    setIsLoadingData(true);
    try {
      const result = await refetchDados();
      if (result.data) {
        setInputs(prev => ({
          ...prev,
          mrrAtual: result.data.mrrAtual,
          ticketMedio: Math.round(result.data.ticketMedio),
          vendedoresAtuais: result.data.vendedoresAtuais,
          churnMensal: result.data.churnMensal,
        }));
        toast({
          title: "✅ Dados carregados",
          description: "Valores atualizados com dados do sistema.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados reais.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Cálculos automáticos
  const outputs = useMemo<SimuladorOutputs>(() => {
    const mesesAteData = inputs.dataMeta 
      ? Math.max(1, differenceInMonths(inputs.dataMeta, new Date()))
      : 12;

    // Receita adicional necessária
    const receitaNecessaria = Math.max(0, inputs.mrrMeta - inputs.mrrAtual);

    // Considerar churn ao longo do período
    const churnAcumulado = inputs.mrrAtual * (inputs.churnMensal / 100) * mesesAteData;
    
    // Vendas necessárias para cobrir diferença + churn
    const receitaTotalNecessaria = receitaNecessaria + churnAcumulado;
    const novasVendas = inputs.ticketMedio > 0 
      ? Math.ceil(receitaTotalNecessaria / inputs.ticketMedio)
      : 0;

    // Leads necessários baseado na taxa de conversão
    const leadsNecessarios = inputs.taxaConversao > 0
      ? Math.ceil(novasVendas / (inputs.taxaConversao / 100))
      : 0;

    // Investimento em marketing
    const investimentoMarketing = leadsNecessarios * inputs.custoPorLead;

    // Vendedores necessários
    const leadsPorMes = leadsNecessarios / mesesAteData;
    const vendedoresNecessarios = inputs.leadsVendedorMes > 0
      ? Math.ceil(leadsPorMes / inputs.leadsVendedorMes)
      : 1;

    const vendedoresAdicionais = Math.max(0, vendedoresNecessarios - inputs.vendedoresAtuais);

    // Custos com vendedores (período total)
    const custoFixoTotal = vendedoresNecessarios * inputs.custoFixoVendedor * mesesAteData;
    const comissaoTotal = novasVendas * inputs.ticketMedio * (inputs.comissaoVenda / 100);
    const custoVendedores = custoFixoTotal + comissaoTotal;

    // Custo total
    const custoTotal = investimentoMarketing + custoVendedores;

    // LTV e CAC
    const ltv = inputs.ticketMedio * inputs.ltvMeses;
    const cac = inputs.taxaConversao > 0 
      ? (inputs.custoPorLead / (inputs.taxaConversao / 100)) + (inputs.custoFixoVendedor / inputs.leadsVendedorMes / (inputs.taxaConversao / 100))
      : 0;
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;

    // ROI
    const receitaGerada = novasVendas * inputs.ticketMedio * inputs.ltvMeses;
    const roi = custoTotal > 0 ? ((receitaGerada - custoTotal) / custoTotal) * 100 : 0;

    // Payback em meses
    const receitaMensal = novasVendas * inputs.ticketMedio / mesesAteData;
    const paybackMeses = receitaMensal > 0 ? Math.ceil(custoTotal / receitaMensal) : 0;

    // Clientes necessários para atingir a meta
    const clientesNecessarios = inputs.ticketMedio > 0 
      ? Math.ceil(inputs.mrrMeta / inputs.ticketMedio)
      : 0;

    // Taxa de crescimento de clientes necessária
    const taxaCrescimentoClientes = inputs.clientesAtivos > 0 
      ? ((clientesNecessarios - inputs.clientesAtivos) / inputs.clientesAtivos) * 100
      : clientesNecessarios > 0 ? 100 : 0;

    // Taxa de crescimento MRR total
    const taxaCrescimentoMrr = inputs.mrrAtual > 0 
      ? ((inputs.mrrMeta - inputs.mrrAtual) / inputs.mrrAtual) * 100
      : inputs.mrrMeta > 0 ? 100 : 0;

    // Taxa de crescimento mensal composto (CAGR mensal)
    const crescimentoMensalMrr = inputs.mrrAtual > 0 && mesesAteData > 0
      ? (Math.pow(inputs.mrrMeta / inputs.mrrAtual, 1 / mesesAteData) - 1) * 100
      : 0;

    // Faturamento Anual Projetado (AR) considerando crescimento mensal e LTV
    // Projeção: soma do MRR de 12 meses com crescimento composto
    const vendasPorMes = mesesAteData > 0 ? Math.ceil(novasVendas / mesesAteData) : 0;
    let faturamentoAnualProjetado = 0;
    let mrrProjetado = inputs.mrrMeta;
    for (let i = 0; i < 12; i++) {
      faturamentoAnualProjetado += mrrProjetado;
      // Aplica churn e crescimento líquido
      const clientesMes = mrrProjetado / Math.max(inputs.ticketMedio, 1);
      const novosClientesMes = vendasPorMes;
      const churnClientesMes = clientesMes * (inputs.churnMensal / 100);
      const clientesFinais = clientesMes + novosClientesMes - churnClientesMes;
      mrrProjetado = clientesFinais * inputs.ticketMedio;
    }

    // AR projetado com base no LTV (receita total esperada dos clientes adquiridos)
    const arProjetado = novasVendas * inputs.ticketMedio * inputs.ltvMeses;

    return {
      receitaNecessaria,
      novasVendas,
      leadsNecessarios,
      investimentoMarketing,
      vendedoresNecessarios,
      vendedoresAdicionais,
      custoVendedores,
      custoTotal,
      roi,
      paybackMeses,
      mesesAteData,
      vendasPorMes: Math.ceil(novasVendas / mesesAteData),
      leadsPorMes: Math.ceil(leadsNecessarios / mesesAteData),
      ltv,
      cac,
      ltvCacRatio,
      clientesNecessarios,
      taxaCrescimentoClientes,
      taxaCrescimentoMrr,
      crescimentoMensalMrr,
      faturamentoAnualProjetado,
      arProjetado,
    };
  }, [inputs]);

  // Dados para o gráfico de projeção de MRR
  const chartData = useMemo(() => {
    const meses = outputs.mesesAteData;
    const taxaCrescimento = outputs.crescimentoMensalMrr / 100;
    const vendasMensais = outputs.vendasPorMes;
    const churnRate = inputs.churnMensal / 100;
    const data = [];
    
    let clientesAcumulados = inputs.clientesAtivos;
    
    for (let i = 0; i <= meses; i++) {
      const mesData = addMonths(new Date(), i);
      const mrrProjetado = inputs.mrrAtual * Math.pow(1 + taxaCrescimento, i);
      const mrrMeta = inputs.mrrMeta;
      
      // Calcular novas vendas e clientes acumulados
      const novasVendasMes = i === 0 ? 0 : vendasMensais;
      const churnMes = i === 0 ? 0 : Math.round(clientesAcumulados * churnRate);
      clientesAcumulados = i === 0 ? clientesAcumulados : clientesAcumulados + novasVendasMes - churnMes;
      
      data.push({
        mes: format(mesData, "MMM/yy", { locale: ptBR }),
        mesCompleto: format(mesData, "MMMM 'de' yyyy", { locale: ptBR }),
        mrrProjetado: Math.round(mrrProjetado),
        mrrMeta: mrrMeta,
        percentualMeta: Math.round((mrrProjetado / mrrMeta) * 100),
        novasVendas: novasVendasMes,
        churn: churnMes,
        clientesAcumulados: Math.max(0, clientesAcumulados),
      });
    }
    
    return data;
  }, [inputs.mrrAtual, inputs.mrrMeta, inputs.clientesAtivos, inputs.churnMensal, outputs.mesesAteData, outputs.crescimentoMensalMrr, outputs.vendasPorMes]);

  // Efeito para calcular MRR automaticamente baseado em clientes ativos e ticket médio
  // Só calcula se não estiver em modo manual
  useEffect(() => {
    if (!mrrManual && inputs.clientesAtivos > 0 && inputs.ticketMedio > 0) {
      const mrrCalculado = inputs.clientesAtivos * inputs.ticketMedio;
      if (mrrCalculado !== inputs.mrrAtual) {
        setInputs(prev => ({ ...prev, mrrAtual: mrrCalculado }));
      }
    }
  }, [inputs.clientesAtivos, inputs.ticketMedio, mrrManual]);

  const updateInput = (field: keyof SimuladorInputs, value: number | Date | undefined) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleMrrChange = (value: number) => {
    setMrrManual(true); // Ativa modo manual quando usuário edita MRR diretamente
    setInputs(prev => ({ ...prev, mrrAtual: value }));
  };

  const enableAutoMrr = () => {
    setMrrManual(false);
    // Recalcular imediatamente
    if (inputs.clientesAtivos > 0 && inputs.ticketMedio > 0) {
      setInputs(prev => ({
        ...prev,
        mrrAtual: inputs.clientesAtivos * inputs.ticketMedio,
      }));
    }
  };

  const resetar = () => {
    setInputs(defaultInputs);
    setMrrManual(false);
    setAiAnalysis(null);
    toast({ title: "Valores resetados", description: "Todos os campos voltaram aos valores padrão." });
  };

  const analisarComIA = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analisar-simulacao", {
        body: {
          ...inputs,
          ...outputs,
          ltv: outputs.ltv,
          cac: outputs.cac,
          ltvCacRatio: outputs.ltvCacRatio,
        },
      });

      if (error) throw error;
      if (data?.analysis) {
        setAiAnalysis(data.analysis);
        toast({
          title: "✅ Análise concluída",
          description: "A IA gerou insights baseados em benchmarks de mercado.",
        });
      }
    } catch (error) {
      console.error("Erro na análise:", error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível gerar a análise com IA.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Status de viabilidade
  const isViavel = outputs.roi > 0;
  const isAltoRisco = outputs.vendedoresAdicionais > 5;
  const isInvestimentoAlto = outputs.custoTotal > outputs.receitaNecessaria;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
            <Calculator className="w-8 h-8 text-primary" />
            Simulador de Meta de Vendas
          </h1>
          <p className="text-muted-foreground mt-1">
            Calcule quantas vendas, leads e investimento são necessários para atingir sua meta
          </p>
        </div>
        <Button variant="outline" onClick={resetar}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Resetar
        </Button>
      </div>

      {/* Carregar Dados Reais */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Usar Dados Reais</p>
              <p className="text-sm text-muted-foreground">
                Carregue MRR, ticket médio e vendedores do sistema
              </p>
            </div>
          </div>
          <Button onClick={carregarDadosReais} disabled={isLoadingData}>
            {isLoadingData ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Database className="w-4 h-4 mr-2" />
            )}
            Carregar Dados
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna de Inputs */}
        <div className="space-y-4">
          {/* Seção 1: Defina sua Meta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-primary" />
                1. Defina sua Meta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>MRR Atual (R$)</Label>
                    {mrrManual ? (
                      <button
                        onClick={enableAutoMrr}
                        className="text-xs text-primary hover:underline"
                      >
                        Ativar auto
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Auto</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    value={inputs.mrrAtual}
                    onChange={e => handleMrrChange(Number(e.target.value))}
                    min={0}
                    className={cn(mrrManual && "border-amber-500")}
                  />
                  {mrrManual && (
                    <p className="text-xs text-amber-600">Modo manual ativo</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>MRR Meta (R$)</Label>
                  <Input
                    type="number"
                    value={inputs.mrrMeta}
                    onChange={e => updateInput("mrrMeta", Number(e.target.value))}
                    min={0}
                    className="border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data para Atingir</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !inputs.dataMeta && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {inputs.dataMeta ? format(inputs.dataMeta, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={inputs.dataMeta}
                        onSelect={date => updateInput("dataMeta", date)}
                        disabled={date => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {inputs.mrrMeta < inputs.mrrAtual && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Meta deve ser maior que o MRR atual
                </p>
              )}
            </CardContent>
          </Card>

          {/* Seção 2: Métricas Base */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                2. Métricas Base
              </CardTitle>
              <CardDescription>Benchmarks SaaS B2B Brasil em cada campo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Clientes Ativos</Label>
                  <Input
                    type="number"
                    value={inputs.clientesAtivos}
                    onChange={e => updateInput("clientesAtivos", Number(e.target.value))}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">Base atual de clientes</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Ticket Médio (R$)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3.5 h-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Benchmark SaaS B2B Brasil:</p>
                          <ul className="text-xs space-y-1">
                            <li>• SMB: R$ 100-300/mês</li>
                            <li>• Mid-Market: R$ 300-800/mês</li>
                            <li>• Enterprise: R$ 2.000+/mês</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    type="number"
                    value={inputs.ticketMedio}
                    onChange={e => updateInput("ticketMedio", Number(e.target.value))}
                    min={1}
                  />
                  <div className={cn(
                    "text-xs px-2 py-0.5 rounded inline-block",
                    inputs.ticketMedio >= 800 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    inputs.ticketMedio >= 300 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    inputs.ticketMedio >= 100 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}>
                    {inputs.ticketMedio >= 2000 ? "Enterprise" : inputs.ticketMedio >= 800 ? "Mid-High" : inputs.ticketMedio >= 300 ? "Mid-Market" : inputs.ticketMedio >= 100 ? "SMB" : "Muito baixo"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>LTV (meses)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3.5 h-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Benchmark SaaS B2B Brasil:</p>
                          <ul className="text-xs space-y-1">
                            <li>• Excelente: 24+ meses</li>
                            <li>• Bom: 12-24 meses</li>
                            <li>• Médio: 6-12 meses</li>
                            <li>• Ruim: {"<"}6 meses</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    type="number"
                    value={inputs.ltvMeses}
                    onChange={e => updateInput("ltvMeses", Number(e.target.value))}
                    min={1}
                    max={60}
                  />
                  <div className={cn(
                    "text-xs px-2 py-0.5 rounded inline-block",
                    inputs.ltvMeses >= 24 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" :
                    inputs.ltvMeses >= 12 ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                    inputs.ltvMeses >= 6 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30" :
                    "bg-red-100 text-red-700 dark:bg-red-900/30"
                  )}>
                    {inputs.ltvMeses >= 24 ? "Excelente" : inputs.ltvMeses >= 12 ? "Bom" : inputs.ltvMeses >= 6 ? "Médio" : "Baixo"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Churn Mensal (%)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3.5 h-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Benchmark SaaS B2B Brasil:</p>
                          <ul className="text-xs space-y-1">
                            <li>• Excelente: {"<"}2%</li>
                            <li>• Bom: 2-3%</li>
                            <li>• Médio: 3-5%</li>
                            <li>• Ruim: {">"}8%</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    type="number"
                    value={inputs.churnMensal}
                    onChange={e => updateInput("churnMensal", Number(e.target.value))}
                    min={0}
                    max={100}
                    step={0.1}
                  />
                  {(() => {
                    const status = getBenchmarkStatus(inputs.churnMensal, BENCHMARKS.churnMensal, false);
                    return (
                      <div className={cn("text-xs px-2 py-0.5 rounded inline-block", status.bg, status.color)}>
                        {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção 3: Marketing & Vendas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Megaphone className="w-5 h-5 text-amber-500" />
                3. Marketing & Vendas
              </CardTitle>
              <CardDescription>Métricas de aquisição e conversão</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Taxa Conversão (%)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3.5 h-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Benchmark SaaS B2B Brasil:</p>
                          <ul className="text-xs space-y-1">
                            <li>• Excelente: {">"}7%</li>
                            <li>• Bom: 5-7%</li>
                            <li>• Médio: 2-5%</li>
                            <li>• Ruim: {"<"}1%</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    type="number"
                    value={inputs.taxaConversao}
                    onChange={e => updateInput("taxaConversao", Number(e.target.value))}
                    min={0.1}
                    max={100}
                    step={0.1}
                  />
                  {(() => {
                    const status = getBenchmarkStatus(inputs.taxaConversao, BENCHMARKS.taxaConversao, true);
                    return (
                      <div className={cn("text-xs px-2 py-0.5 rounded inline-block", status.bg, status.color)}>
                        {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                      </div>
                    );
                  })()}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Custo por Lead (R$)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3.5 h-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Benchmark SaaS B2B Brasil:</p>
                          <ul className="text-xs space-y-1">
                            <li>• Barato: R$ 5-15</li>
                            <li>• Médio: R$ 15-40</li>
                            <li>• Caro: R$ 40-80</li>
                            <li>• Muito caro: {">"}R$ 80</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    type="number"
                    value={inputs.custoPorLead}
                    onChange={e => updateInput("custoPorLead", Number(e.target.value))}
                    min={0}
                    step={0.5}
                  />
                  <div className={cn(
                    "text-xs px-2 py-0.5 rounded inline-block",
                    inputs.custoPorLead <= 15 ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                    inputs.custoPorLead <= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30" :
                    inputs.custoPorLead <= 80 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30" :
                    "bg-red-100 text-red-700 dark:bg-red-900/30"
                  )}>
                    {inputs.custoPorLead <= 15 ? "Barato" : inputs.custoPorLead <= 40 ? "Médio" : inputs.custoPorLead <= 80 ? "Caro" : "Muito caro"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Leads/Vendedor/Mês</Label>
                  <Input
                    type="number"
                    value={inputs.leadsVendedorMes}
                    onChange={e => updateInput("leadsVendedorMes", Number(e.target.value))}
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground">Capacidade de atendimento</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção 4: Estrutura de Custos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-violet-500" />
                4. Estrutura de Custos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Custo Fixo/Vendedor (R$)</Label>
                  <Input
                    type="number"
                    value={inputs.custoFixoVendedor}
                    onChange={e => updateInput("custoFixoVendedor", Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comissão por Venda (%)</Label>
                  <Input
                    type="number"
                    value={inputs.comissaoVenda}
                    onChange={e => updateInput("comissaoVenda", Number(e.target.value))}
                    min={0}
                    max={100}
                    step={0.5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vendedores Atuais</Label>
                  <Input
                    type="number"
                    value={inputs.vendedoresAtuais}
                    onChange={e => updateInput("vendedoresAtuais", Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna de Resultados */}
        <div className="space-y-4">
          {/* Status Geral */}
          <Card className={cn(
            "border-2",
            isViavel ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-red-500 bg-red-50/50 dark:bg-red-950/20"
          )}>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isViavel ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  )}
                  <div>
                    <h3 className="text-lg font-bold">
                      {isViavel ? "Cenário Viável" : "Cenário Inviável"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isViavel 
                        ? `ROI positivo de ${formatPercent(outputs.roi)}`
                        : "O investimento supera o retorno esperado"
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Prazo</p>
                  <p className="text-xl font-bold">{outputs.mesesAteData} meses</p>
                </div>
              </div>

              {(isAltoRisco || isInvestimentoAlto) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {isAltoRisco && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Alto risco: +{outputs.vendedoresAdicionais} vendedores
                    </Badge>
                  )}
                  {isInvestimentoAlto && (
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Investimento alto
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grid de Resultados */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Novas Vendas */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Novas Vendas</p>
                    <p className="text-3xl font-bold text-primary">{formatNumber(outputs.novasVendas)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{formatNumber(outputs.vendasPorMes)}/mês
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <ShoppingCart className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leads Necessários */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Leads Necessários</p>
                    <p className="text-3xl font-bold text-amber-600">{formatNumber(outputs.leadsNecessarios)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{formatNumber(outputs.leadsPorMes)}/mês
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Investimento Marketing */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Investimento Marketing</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(outputs.investimentoMarketing)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{formatCurrency(outputs.investimentoMarketing / outputs.mesesAteData)}/mês
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10">
                    <Megaphone className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vendedores Adicionais */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Vendedores Adicionais</p>
                    <p className={cn(
                      "text-3xl font-bold",
                      outputs.vendedoresAdicionais > 0 ? "text-violet-600" : "text-green-600"
                    )}>
                      {outputs.vendedoresAdicionais > 0 ? `+${outputs.vendedoresAdicionais}` : "Nenhum"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {outputs.vendedoresNecessarios} vendedores
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-violet-500/10">
                    <UserPlus className="w-6 h-6 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custo Total */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Custo Total</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      isInvestimentoAlto ? "text-red-600" : "text-slate-700 dark:text-slate-300"
                    )}>
                      {formatCurrency(outputs.custoTotal)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Marketing + Vendedores
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-500/10">
                    <DollarSign className="w-6 h-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ROI */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ROI Projetado</p>
                    <p className={cn(
                      "text-3xl font-bold",
                      outputs.roi >= 100 ? "text-green-600" : outputs.roi > 0 ? "text-amber-600" : "text-red-600"
                    )}>
                      {formatPercent(outputs.roi)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Retorno sobre investimento
                    </p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg",
                    outputs.roi >= 100 ? "bg-green-500/10" : outputs.roi > 0 ? "bg-amber-500/10" : "bg-red-500/10"
                  )}>
                    <Percent className={cn(
                      "w-6 h-6",
                      outputs.roi >= 100 ? "text-green-600" : outputs.roi > 0 ? "text-amber-600" : "text-red-600"
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payback */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo de Payback</p>
                    <p className={cn(
                      "text-3xl font-bold",
                      outputs.paybackMeses <= 6 ? "text-green-600" : outputs.paybackMeses <= 12 ? "text-amber-600" : "text-red-600"
                    )}>
                      {outputs.paybackMeses} meses
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tempo estimado para recuperar o investimento
                    </p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg",
                    outputs.paybackMeses <= 6 ? "bg-green-500/10" : outputs.paybackMeses <= 12 ? "bg-amber-500/10" : "bg-red-500/10"
                  )}>
                    <Clock className={cn(
                      "w-6 h-6",
                      outputs.paybackMeses <= 6 ? "text-green-600" : outputs.paybackMeses <= 12 ? "text-amber-600" : "text-red-600"
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Taxa de Crescimento de Clientes */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Crescimento de Clientes</p>
                    <p className={cn(
                      "text-3xl font-bold",
                      outputs.taxaCrescimentoClientes <= 50 ? "text-green-600" : outputs.taxaCrescimentoClientes <= 100 ? "text-amber-600" : "text-red-600"
                    )}>
                      {outputs.taxaCrescimentoClientes > 0 ? "+" : ""}{formatPercent(outputs.taxaCrescimentoClientes)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      De {formatNumber(inputs.clientesAtivos)} para {formatNumber(outputs.clientesNecessarios)} clientes
                    </p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg",
                    outputs.taxaCrescimentoClientes <= 50 ? "bg-green-500/10" : outputs.taxaCrescimentoClientes <= 100 ? "bg-amber-500/10" : "bg-red-500/10"
                  )}>
                    <Users className={cn(
                      "w-6 h-6",
                      outputs.taxaCrescimentoClientes <= 50 ? "text-green-600" : outputs.taxaCrescimentoClientes <= 100 ? "text-amber-600" : "text-red-600"
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cards de Crescimento MRR e Faturamento */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ArrowUpRight className="w-5 h-5 text-primary" />
                Projeção de Crescimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Crescimento Total MRR</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    outputs.taxaCrescimentoMrr <= 100 ? "text-green-600" : outputs.taxaCrescimentoMrr <= 200 ? "text-amber-600" : "text-primary"
                  )}>
                    +{formatPercent(outputs.taxaCrescimentoMrr)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(inputs.mrrAtual)} → {formatCurrency(inputs.mrrMeta)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Crescimento Mensal (CAGR)</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    outputs.crescimentoMensalMrr >= 15 ? "text-emerald-600" :
                    outputs.crescimentoMensalMrr >= 10 ? "text-green-600" :
                    outputs.crescimentoMensalMrr >= 5 ? "text-amber-600" : "text-red-600"
                  )}>
                    +{formatPercent(outputs.crescimentoMensalMrr)}
                  </p>
                  <div className={cn(
                    "text-xs px-2 py-0.5 rounded inline-block",
                    outputs.crescimentoMensalMrr >= 15 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" :
                    outputs.crescimentoMensalMrr >= 10 ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                    outputs.crescimentoMensalMrr >= 5 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30" :
                    "bg-red-100 text-red-700 dark:bg-red-900/30"
                  )}>
                    {outputs.crescimentoMensalMrr >= 15 ? "Acelerado" : outputs.crescimentoMensalMrr >= 10 ? "Rápido" : outputs.crescimentoMensalMrr >= 5 ? "Saudável" : "Lento"}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Faturamento Anual Projetado</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(outputs.faturamentoAnualProjetado)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ARR após atingir meta
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Receita Total (LTV base)</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(outputs.arProjetado)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(outputs.novasVendas)} vendas × LTV {inputs.ltvMeses}m
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Projeção MRR */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <LineChartIcon className="w-5 h-5 text-primary" />
                Projeção de Evolução do MRR
              </CardTitle>
              <CardDescription>
                Crescimento mensal de {formatPercent(outputs.crescimentoMensalMrr)} até atingir a meta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="mes"
                      className="text-xs fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      className="text-xs fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "mrrProjetado" ? "MRR Projetado" : "Meta",
                      ]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.mesCompleto;
                        }
                        return label;
                      }}
                    />
                    <ReferenceLine
                      y={inputs.mrrMeta}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{
                        value: `Meta: ${formatCurrency(inputs.mrrMeta)}`,
                        position: "insideTopRight",
                        fill: "hsl(var(--destructive))",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mrrProjetado"
                      stroke="transparent"
                      fill="url(#mrrGradient)"
                    />
                    <Line
                      type="monotone"
                      dataKey="mrrProjetado"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">MRR Projetado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-destructive" style={{ borderStyle: "dashed" }} />
                  <span className="text-muted-foreground">Meta: {formatCurrency(inputs.mrrMeta)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela Detalhada de Projeção */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-primary" />
                Projeção Detalhada Mês a Mês
              </CardTitle>
              <CardDescription>
                MRR projetado, novas vendas, churn e base de clientes acumulada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Mês</TableHead>
                      <TableHead className="text-right font-semibold">MRR Projetado</TableHead>
                      <TableHead className="text-right font-semibold">% da Meta</TableHead>
                      <TableHead className="text-right font-semibold">Novas Vendas</TableHead>
                      <TableHead className="text-right font-semibold">Churn</TableHead>
                      <TableHead className="text-right font-semibold">Clientes Acumulados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartData.map((row, index) => {
                      const isMetaAtingida = row.mrrProjetado >= row.mrrMeta;
                      return (
                        <TableRow 
                          key={index}
                          className={cn(
                            isMetaAtingida && "bg-green-50/50 dark:bg-green-950/20"
                          )}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {row.mesCompleto}
                              {isMetaAtingida && index > 0 && chartData[index - 1].mrrProjetado < row.mrrMeta && (
                                <Badge variant="default" className="bg-green-600 text-xs">Meta!</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "font-semibold",
                              isMetaAtingida ? "text-green-600" : "text-foreground"
                            )}>
                              {formatCurrency(row.mrrProjetado)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    row.percentualMeta >= 100 ? "bg-green-500" : 
                                    row.percentualMeta >= 75 ? "bg-amber-500" : "bg-primary"
                                  )}
                                  style={{ width: `${Math.min(row.percentualMeta, 100)}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-sm font-medium min-w-[3rem] text-right",
                                row.percentualMeta >= 100 ? "text-green-600" : "text-muted-foreground"
                              )}>
                                {row.percentualMeta}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {row.novasVendas > 0 ? (
                              <span className="text-green-600 font-medium">+{formatNumber(row.novasVendas)}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.churn > 0 ? (
                              <span className="text-red-500 font-medium">-{formatNumber(row.churn)}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatNumber(row.clientesAcumulados)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-950/50 border border-green-500" />
                    <span className="text-muted-foreground">Meta atingida</span>
                  </div>
                </div>
                <div className="text-muted-foreground">
                  Total de {chartData.length} meses projetados
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards LTV/CAC */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">LTV ({inputs.ltvMeses} meses)</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(outputs.ltv)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Valor vitalício do cliente</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">CAC Estimado</p>
                    <p className="text-2xl font-bold text-amber-600">{formatCurrency(outputs.cac)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Custo de aquisição</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <DollarSign className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ratio LTV/CAC</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      outputs.ltvCacRatio >= 3 ? "text-green-600" : outputs.ltvCacRatio >= 2 ? "text-amber-600" : "text-red-600"
                    )}>
                      {outputs.ltvCacRatio.toFixed(1)}x
                    </p>
                    <div className={cn(
                      "text-xs px-2 py-0.5 rounded inline-block mt-1",
                      outputs.ltvCacRatio >= 5 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" :
                      outputs.ltvCacRatio >= 3 ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                      outputs.ltvCacRatio >= 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30" :
                      "bg-red-100 text-red-700 dark:bg-red-900/30"
                    )}>
                      {outputs.ltvCacRatio >= 5 ? "Excelente" : outputs.ltvCacRatio >= 3 ? "Bom" : outputs.ltvCacRatio >= 2 ? "Médio" : "Ruim"} (benchmark: ≥3x)
                    </div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg",
                    outputs.ltvCacRatio >= 3 ? "bg-green-500/10" : outputs.ltvCacRatio >= 2 ? "bg-amber-500/10" : "bg-red-500/10"
                  )}>
                    <BarChart3 className={cn(
                      "w-6 h-6",
                      outputs.ltvCacRatio >= 3 ? "text-green-600" : outputs.ltvCacRatio >= 2 ? "text-amber-600" : "text-red-600"
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumo */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-4 h-4 text-primary" />
                Resumo do Cenário
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>
                Para crescer de <strong>{formatCurrency(inputs.mrrAtual)}</strong> para{" "}
                <strong>{formatCurrency(inputs.mrrMeta)}</strong> em{" "}
                <strong>{outputs.mesesAteData} meses</strong>:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShoppingCart className="w-4 h-4" />
                  <span><strong className="text-foreground">{formatNumber(outputs.novasVendas)}</strong> vendas ({formatNumber(outputs.vendasPorMes)}/mês)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span><strong className="text-foreground">{formatNumber(outputs.leadsNecessarios)}</strong> leads ({formatNumber(outputs.leadsPorMes)}/mês)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Megaphone className="w-4 h-4" />
                  <span><strong className="text-foreground">{formatCurrency(outputs.investimentoMarketing)}</strong> em marketing</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ArrowUpRight className="w-4 h-4" />
                  <span><strong className="text-foreground">+{formatPercent(outputs.crescimentoMensalMrr)}</strong>/mês de crescimento</span>
                </div>
              </div>
              {outputs.vendedoresAdicionais > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserPlus className="w-4 h-4" />
                  <span>Contratando <strong className="text-foreground">{outputs.vendedoresAdicionais}</strong> vendedores adicionais</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Análise com IA - Melhorada */}
          <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-background dark:from-purple-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="w-5 h-5 text-purple-500" />
                    Análise Inteligente
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Insights estratégicos baseados em benchmarks SaaS B2B Brasil
                  </CardDescription>
                </div>
                <Button 
                  onClick={analisarComIA} 
                  disabled={isAnalyzing}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 mr-2" />
                  )}
                  {isAnalyzing ? "Analisando cenário..." : "Gerar Análise com IA"}
                </Button>
              </div>
            </CardHeader>
            {!aiAnalysis && !isAnalyzing && (
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    Clique no botão acima para obter uma análise profunda do seu cenário<br/>
                    com recomendações baseadas em benchmarks de mercado.
                  </p>
                </div>
              </CardContent>
            )}
            {isAnalyzing && (
              <CardContent>
                <div className="text-center py-8">
                  <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-purple-500" />
                  <p className="text-sm text-muted-foreground">
                    Analisando métricas e comparando com benchmarks SaaS B2B Brasil...
                  </p>
                </div>
              </CardContent>
            )}
            {aiAnalysis && !isAnalyzing && (
              <CardContent>
                <Tabs defaultValue="analysis" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="analysis">📊 Análise Completa</TabsTrigger>
                    <TabsTrigger value="benchmarks">📈 Benchmarks</TabsTrigger>
                  </TabsList>
                  <TabsContent value="analysis">
                    <ScrollArea className="h-[450px] pr-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div 
                          className="space-y-3"
                          dangerouslySetInnerHTML={{ 
                            __html: aiAnalysis
                              .replace(/^## 📊/gm, '<h3 class="text-lg font-bold mt-4 mb-2 flex items-center gap-2"><span class="text-xl">📊</span>')
                              .replace(/^## ✅/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-green-600 dark:text-green-400 flex items-center gap-2"><span class="text-xl">✅</span>')
                              .replace(/^## ⚠️/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-amber-600 dark:text-amber-400 flex items-center gap-2"><span class="text-xl">⚠️</span>')
                              .replace(/^## 💡/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-blue-600 dark:text-blue-400 flex items-center gap-2"><span class="text-xl">💡</span>')
                              .replace(/^## 🎯/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-purple-600 dark:text-purple-400 flex items-center gap-2"><span class="text-xl">🎯</span>')
                              .replace(/^## 📈/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-primary flex items-center gap-2"><span class="text-xl">📈</span>')
                              .replace(/^## /gm, '<h3 class="text-lg font-bold mt-4 mb-2">')
                              .replace(/^### /gm, '<h4 class="text-base font-semibold mt-3 mb-1">')
                              .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-foreground">$1</strong>')
                              .replace(/^(\d+)\. \*\*/gm, '<div class="pl-4 py-1 border-l-2 border-primary/30 my-2"><span class="font-semibold">$1.</span> <strong>')
                              .replace(/^- /gm, '<div class="flex items-start gap-2 my-1"><span class="text-primary mt-1">•</span><span>')
                              .replace(/\n\n/g, '</span></div><br/>')
                              .replace(/\n/g, '</span></div><div class="flex items-start gap-2 my-1"><span>')
                          }}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="benchmarks">
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="p-4 rounded-lg bg-muted/50">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-red-500" />
                            Churn Mensal
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-emerald-600">Excelente:</span> <span>{"<"}2%</span></div>
                            <div className="flex justify-between"><span className="text-green-600">Bom:</span> <span>2-3%</span></div>
                            <div className="flex justify-between"><span className="text-amber-600">Médio:</span> <span>3-5%</span></div>
                            <div className="flex justify-between"><span className="text-red-600">Ruim:</span> <span>{">"}8%</span></div>
                            <div className="mt-2 pt-2 border-t flex justify-between font-medium">
                              <span>Seu valor:</span>
                              <span className={cn(
                                inputs.churnMensal <= 2 ? "text-emerald-600" :
                                inputs.churnMensal <= 3 ? "text-green-600" :
                                inputs.churnMensal <= 5 ? "text-amber-600" : "text-red-600"
                              )}>{inputs.churnMensal}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Percent className="w-4 h-4 text-blue-500" />
                            Taxa de Conversão
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-emerald-600">Excelente:</span> <span>{">"}7%</span></div>
                            <div className="flex justify-between"><span className="text-green-600">Bom:</span> <span>5-7%</span></div>
                            <div className="flex justify-between"><span className="text-amber-600">Médio:</span> <span>2-5%</span></div>
                            <div className="flex justify-between"><span className="text-red-600">Ruim:</span> <span>{"<"}1%</span></div>
                            <div className="mt-2 pt-2 border-t flex justify-between font-medium">
                              <span>Seu valor:</span>
                              <span className={cn(
                                inputs.taxaConversao >= 7 ? "text-emerald-600" :
                                inputs.taxaConversao >= 5 ? "text-green-600" :
                                inputs.taxaConversao >= 2 ? "text-amber-600" : "text-red-600"
                              )}>{inputs.taxaConversao}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-green-500" />
                            LTV/CAC Ratio
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-emerald-600">Excelente:</span> <span>{">"}5x</span></div>
                            <div className="flex justify-between"><span className="text-green-600">Bom:</span> <span>3-5x</span></div>
                            <div className="flex justify-between"><span className="text-amber-600">Médio:</span> <span>2-3x</span></div>
                            <div className="flex justify-between"><span className="text-red-600">Ruim:</span> <span>{"<"}1x</span></div>
                            <div className="mt-2 pt-2 border-t flex justify-between font-medium">
                              <span>Seu valor:</span>
                              <span className={cn(
                                outputs.ltvCacRatio >= 5 ? "text-emerald-600" :
                                outputs.ltvCacRatio >= 3 ? "text-green-600" :
                                outputs.ltvCacRatio >= 2 ? "text-amber-600" : "text-red-600"
                              )}>{outputs.ltvCacRatio.toFixed(1)}x</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-500" />
                            Payback (meses)
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-emerald-600">Excelente:</span> <span>{"<"}4 meses</span></div>
                            <div className="flex justify-between"><span className="text-green-600">Bom:</span> <span>4-6 meses</span></div>
                            <div className="flex justify-between"><span className="text-amber-600">Médio:</span> <span>6-12 meses</span></div>
                            <div className="flex justify-between"><span className="text-red-600">Ruim:</span> <span>{">"}18 meses</span></div>
                            <div className="mt-2 pt-2 border-t flex justify-between font-medium">
                              <span>Seu valor:</span>
                              <span className={cn(
                                outputs.paybackMeses <= 4 ? "text-emerald-600" :
                                outputs.paybackMeses <= 6 ? "text-green-600" :
                                outputs.paybackMeses <= 12 ? "text-amber-600" : "text-red-600"
                              )}>{outputs.paybackMeses} meses</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        * Benchmarks baseados em médias do mercado SaaS B2B Brasil 2024-2025
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
