import { useState, useMemo } from "react";
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
  TrendingDown,
  Users,
  DollarSign,
  CalendarIcon,
  Percent,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Loader2,
  Brain,
  BarChart3,
  Info,
  ArrowUpRight,
  LineChart as LineChartIcon,
  Clock,
  Megaphone,
  UserPlus,
  Save,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { CenariosSalvosDialog } from "@/components/simulador/CenariosSalvosDialog";
import { AnaliseIADisplay } from "@/components/simulador/AnaliseIADisplay";
import { ProjecaoMensalEditor } from "@/components/simulador/ProjecaoMensalEditor";
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("meta");
  const [cenariosDialogOpen, setCenariosDialogOpen] = useState(false);
  const [cenariosDialogMode, setCenariosDialogMode] = useState<"save" | "load">("save");


  // Cálculos automáticos
  const outputs = useMemo<SimuladorOutputs>(() => {
    const mesesAteData = inputs.dataMeta 
      ? Math.max(1, differenceInMonths(inputs.dataMeta, new Date()))
      : 12;

    const receitaNecessaria = Math.max(0, inputs.mrrMeta - inputs.mrrAtual);
    const churnAcumulado = inputs.mrrAtual * (inputs.churnMensal / 100) * mesesAteData;
    const receitaTotalNecessaria = receitaNecessaria + churnAcumulado;
    const novasVendas = inputs.ticketMedio > 0 
      ? Math.ceil(receitaTotalNecessaria / inputs.ticketMedio)
      : 0;

    const leadsNecessarios = inputs.taxaConversao > 0
      ? Math.ceil(novasVendas / (inputs.taxaConversao / 100))
      : 0;

    const investimentoMarketing = leadsNecessarios * inputs.custoPorLead;
    const leadsPorMes = leadsNecessarios / mesesAteData;
    const vendedoresNecessarios = inputs.leadsVendedorMes > 0
      ? Math.ceil(leadsPorMes / inputs.leadsVendedorMes)
      : 1;

    const vendedoresAdicionais = Math.max(0, vendedoresNecessarios - inputs.vendedoresAtuais);
    const custoFixoTotal = vendedoresNecessarios * inputs.custoFixoVendedor * mesesAteData;
    const comissaoTotal = novasVendas * inputs.ticketMedio * (inputs.comissaoVenda / 100);
    const custoVendedores = custoFixoTotal + comissaoTotal;
    const custoTotal = investimentoMarketing + custoVendedores;

    const ltv = inputs.ticketMedio * inputs.ltvMeses;
    const cac = inputs.taxaConversao > 0 
      ? (inputs.custoPorLead / (inputs.taxaConversao / 100)) + (inputs.custoFixoVendedor / inputs.leadsVendedorMes / (inputs.taxaConversao / 100))
      : 0;
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;

    const receitaGerada = novasVendas * inputs.ticketMedio * inputs.ltvMeses;
    const roi = custoTotal > 0 ? ((receitaGerada - custoTotal) / custoTotal) * 100 : 0;
    const receitaMensal = novasVendas * inputs.ticketMedio / mesesAteData;
    const paybackMeses = receitaMensal > 0 ? Math.ceil(custoTotal / receitaMensal) : 0;

    const clientesNecessarios = inputs.ticketMedio > 0 
      ? Math.ceil(inputs.mrrMeta / inputs.ticketMedio)
      : 0;
    const taxaCrescimentoClientes = inputs.clientesAtivos > 0 
      ? ((clientesNecessarios - inputs.clientesAtivos) / inputs.clientesAtivos) * 100
      : clientesNecessarios > 0 ? 100 : 0;

    const taxaCrescimentoMrr = inputs.mrrAtual > 0 
      ? ((inputs.mrrMeta - inputs.mrrAtual) / inputs.mrrAtual) * 100
      : inputs.mrrMeta > 0 ? 100 : 0;

    const crescimentoMensalMrr = inputs.mrrAtual > 0 && mesesAteData > 0
      ? (Math.pow(inputs.mrrMeta / inputs.mrrAtual, 1 / mesesAteData) - 1) * 100
      : 0;

    const vendasPorMes = mesesAteData > 0 ? Math.ceil(novasVendas / mesesAteData) : 0;
    let faturamentoAnualProjetado = 0;
    let mrrProjetado = inputs.mrrMeta;
    for (let i = 0; i < 12; i++) {
      faturamentoAnualProjetado += mrrProjetado;
      const clientesMes = mrrProjetado / Math.max(inputs.ticketMedio, 1);
      const novosClientesMes = vendasPorMes;
      const churnClientesMes = clientesMes * (inputs.churnMensal / 100);
      const clientesFinais = clientesMes + novosClientesMes - churnClientesMes;
      mrrProjetado = clientesFinais * inputs.ticketMedio;
    }

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

  const updateInput = (field: keyof SimuladorInputs, value: number | Date | undefined) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const resetar = () => {
    setInputs(defaultInputs);
    setAiAnalysis(null);
    toast({ title: "Valores resetados", description: "Todos os campos voltaram aos valores padrão." });
  };

  const analisarComIA = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analisar-simulacao", {
        body: { ...inputs, ...outputs },
      });

      if (error) throw error;
      if (data?.analysis) {
        setAiAnalysis(data.analysis);
        setActiveTab("analise");
        toast({ title: "✅ Análise concluída", description: "Insights gerados com sucesso!" });
      }
    } catch (error) {
      console.error("Erro na análise:", error);
      toast({ title: "Erro na análise", description: "Não foi possível gerar a análise com IA.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadCenario = (simulacao: any) => {
    setInputs({
      mrrAtual: Number(simulacao.mrr_atual) || 0,
      mrrMeta: Number(simulacao.mrr_meta) || 50000,
      dataMeta: simulacao.data_meta ? new Date(simulacao.data_meta) : addMonths(new Date(), 12),
      ticketMedio: Number(simulacao.ticket_medio) || 100,
      churnMensal: Number(simulacao.churn_mensal) || 5,
      taxaConversao: Number(simulacao.taxa_conversao) || 2.5,
      custoPorLead: Number(simulacao.custo_por_lead) || 5,
      leadsVendedorMes: Number(simulacao.leads_vendedor_mes) || 300,
      custoFixoVendedor: Number(simulacao.custo_fixo_vendedor) || 3000,
      comissaoVenda: Number(simulacao.comissao_venda) || 5,
      vendedoresAtuais: Number(simulacao.vendedores_atuais) || 1,
      ltvMeses: Number(simulacao.ltv_meses) || 12,
      clientesAtivos: Number(simulacao.clientes_ativos) || 0,
    });
    if (simulacao.analise_ia) {
      setAiAnalysis(simulacao.analise_ia);
    }
  };

  const isViavel = outputs.roi > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold flex items-center gap-3">
            <Calculator className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            Simulador de Meta
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Planeje o crescimento com dados reais das suas assinaturas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setCenariosDialogMode("load");
              setCenariosDialogOpen(true);
            }}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Carregar
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => {
              setCenariosDialogMode("save");
              setCenariosDialogOpen(true);
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
          <Button variant="outline" size="sm" onClick={resetar}>
            Resetar
          </Button>
        </div>
      </div>

      {/* Dialog de Cenários */}
      <CenariosSalvosDialog
        open={cenariosDialogOpen}
        onOpenChange={setCenariosDialogOpen}
        mode={cenariosDialogMode}
        inputs={inputs}
        outputs={outputs}
        aiAnalysis={aiAnalysis}
        onLoad={handleLoadCenario}
      />

      {/* Tabs Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="meta" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-2 sm:px-4">
            <Target className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Definir Meta</span>
          </TabsTrigger>
          <TabsTrigger value="resultados" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-2 sm:px-4">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Resultados</span>
          </TabsTrigger>
          <TabsTrigger value="analise" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-2 sm:px-4">
            <Brain className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Análise IA</span>
          </TabsTrigger>
        </TabsList>


        {/* Tab: Definir Meta */}
        <TabsContent value="meta" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Coluna Esquerda - Meta e Métricas */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="w-5 h-5 text-primary" />
                    Defina sua Meta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>MRR Atual (R$)</Label>
                      <Input
                        type="number"
                        value={inputs.mrrAtual}
                        onChange={e => updateInput("mrrAtual", Number(e.target.value))}
                        min={0}
                      />
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
                  </div>
                  <div className="space-y-2">
                    <Label>Data para Atingir</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !inputs.dataMeta && "text-muted-foreground")}>
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
                  {inputs.mrrMeta > inputs.mrrAtual && (
                    <div className="p-3 rounded-lg bg-primary/10 text-sm">
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <ArrowUpRight className="w-4 h-4" />
                        Crescimento necessário: +{formatPercent(outputs.taxaCrescimentoMrr)}
                      </div>
                      <p className="text-muted-foreground mt-1">
                        {formatCurrency(outputs.receitaNecessaria)} em {outputs.mesesAteData} meses ({formatPercent(outputs.crescimentoMensalMrr)}/mês)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    Métricas Base
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Clientes Ativos</Label>
                      <Input type="number" value={inputs.clientesAtivos} onChange={e => updateInput("clientesAtivos", Number(e.target.value))} min={0} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ticket Médio (R$)</Label>
                      <Input type="number" value={inputs.ticketMedio} onChange={e => updateInput("ticketMedio", Number(e.target.value))} min={1} />
                    </div>
                    <div className="space-y-2">
                      <Label>LTV (meses)</Label>
                      <Input type="number" value={inputs.ltvMeses} onChange={e => updateInput("ltvMeses", Number(e.target.value))} min={1} max={60} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Churn Mensal (%)</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
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
                      <Input type="number" value={inputs.churnMensal} onChange={e => updateInput("churnMensal", Number(e.target.value))} min={0} max={100} step={0.1} />
                      {(() => {
                        const status = getBenchmarkStatus(inputs.churnMensal, BENCHMARKS.churnMensal, false);
                        return <Badge variant="outline" className={cn(status.bg, status.color)}>{status.status}</Badge>;
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita - Marketing e Vendas */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Megaphone className="w-5 h-5 text-amber-500" />
                    Marketing & Aquisição
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Taxa Conversão (%)</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">Benchmark SaaS B2B:</p>
                              <ul className="text-xs">
                                <li>• Excelente: {">"}7%</li>
                                <li>• Bom: 5-7%</li>
                                <li>• Médio: 2-5%</li>
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input type="number" value={inputs.taxaConversao} onChange={e => updateInput("taxaConversao", Number(e.target.value))} min={0.1} max={100} step={0.1} />
                      {(() => {
                        const status = getBenchmarkStatus(inputs.taxaConversao, BENCHMARKS.taxaConversao, true);
                        return <Badge variant="outline" className={cn(status.bg, status.color)}>{status.status}</Badge>;
                      })()}
                    </div>
                    <div className="space-y-2">
                      <Label>Custo por Lead (R$)</Label>
                      <Input type="number" value={inputs.custoPorLead} onChange={e => updateInput("custoPorLead", Number(e.target.value))} min={0} step={0.5} />
                    </div>
                    <div className="space-y-2">
                      <Label>Leads/Vendedor/Mês</Label>
                      <Input type="number" value={inputs.leadsVendedorMes} onChange={e => updateInput("leadsVendedorMes", Number(e.target.value))} min={1} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserPlus className="w-5 h-5 text-violet-500" />
                    Estrutura de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Custo Fixo/Vendedor</Label>
                      <Input type="number" value={inputs.custoFixoVendedor} onChange={e => updateInput("custoFixoVendedor", Number(e.target.value))} min={0} />
                    </div>
                    <div className="space-y-2">
                      <Label>Comissão (%)</Label>
                      <Input type="number" value={inputs.comissaoVenda} onChange={e => updateInput("comissaoVenda", Number(e.target.value))} min={0} max={100} step={0.5} />
                    </div>
                    <div className="space-y-2">
                      <Label>Vendedores Atuais</Label>
                      <Input type="number" value={inputs.vendedoresAtuais} onChange={e => updateInput("vendedoresAtuais", Number(e.target.value))} min={0} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={() => setActiveTab("resultados")} className="w-full" size="lg">
                <BarChart3 className="w-4 h-4 mr-2" />
                Ver Resultados da Simulação
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Resultados */}
        <TabsContent value="resultados" className="mt-6 space-y-6">
          {/* Status Geral */}
          <Card className={cn("border-2", isViavel ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-red-500 bg-red-50/50 dark:bg-red-950/20")}>
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {isViavel ? <CheckCircle className="w-8 h-8 text-green-600" /> : <AlertTriangle className="w-8 h-8 text-red-600" />}
                  <div>
                    <h3 className="text-lg font-bold">{isViavel ? "Cenário Viável" : "Cenário Inviável"}</h3>
                    <p className="text-sm text-muted-foreground">
                      ROI de {formatPercent(outputs.roi)} • Payback de {outputs.paybackMeses} meses
                    </p>
                  </div>
                </div>
                <Button onClick={analisarComIA} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                  Analisar com IA
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cards de Métricas */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Novas Vendas</p>
                <p className="text-3xl font-bold text-primary">{formatNumber(outputs.novasVendas)}</p>
                <p className="text-xs text-muted-foreground">{outputs.vendasPorMes}/mês</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Leads Necessários</p>
                <p className="text-3xl font-bold">{formatNumber(outputs.leadsNecessarios)}</p>
                <p className="text-xs text-muted-foreground">{outputs.leadsPorMes}/mês</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Investimento Total</p>
                <p className="text-3xl font-bold text-amber-600">{formatCurrency(outputs.custoTotal)}</p>
                <p className="text-xs text-muted-foreground">Marketing + Vendas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">LTV/CAC</p>
                <p className={cn("text-3xl font-bold", outputs.ltvCacRatio >= 3 ? "text-green-600" : outputs.ltvCacRatio >= 2 ? "text-amber-600" : "text-red-600")}>
                  {outputs.ltvCacRatio.toFixed(1)}x
                </p>
                {(() => {
                  const status = getBenchmarkStatus(outputs.ltvCacRatio, BENCHMARKS.ltvCacRatio, true);
                  return <Badge variant="outline" className={cn(status.bg, status.color)}>{status.status}</Badge>;
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Projeção Mensal Editável */}
          <ProjecaoMensalEditor
            mrrAtual={inputs.mrrAtual}
            mrrMeta={inputs.mrrMeta}
            ticketMedio={inputs.ticketMedio}
            churnMensal={inputs.churnMensal}
            taxaConversao={inputs.taxaConversao}
            custoPorLead={inputs.custoPorLead}
            mesesAteData={outputs.mesesAteData}
            vendasPorMes={outputs.vendasPorMes}
          />
        </TabsContent>

        {/* Tab: Análise IA */}
        <TabsContent value="analise" className="mt-6">
          <Card className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-200 dark:border-purple-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Análise Inteligente
                </CardTitle>
                <Button onClick={analisarComIA} disabled={isAnalyzing} variant="outline" size="sm">
                  {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {aiAnalysis ? "Reanalisar" : "Analisar"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isAnalyzing && (
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-purple-500" />
                  <p className="text-muted-foreground">Analisando métricas e comparando com benchmarks...</p>
                </div>
              )}
              {!aiAnalysis && !isAnalyzing && (
                <div className="text-center py-12 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Clique em "Analisar" para obter insights baseados em benchmarks de mercado SaaS B2B Brasil.</p>
                </div>
              )}
              {aiAnalysis && !isAnalyzing && (
                <AnaliseIADisplay analysis={aiAnalysis} />
              )}
            </CardContent>
          </Card>

          {/* Benchmarks de Referência */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Benchmarks SaaS B2B Brasil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    Churn Mensal
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-emerald-600">Excelente:</span><span>{"<"}2%</span></div>
                    <div className="flex justify-between"><span className="text-green-600">Bom:</span><span>2-3%</span></div>
                    <div className="flex justify-between"><span className="text-amber-600">Médio:</span><span>3-5%</span></div>
                    <div className="flex justify-between"><span className="text-red-600">Ruim:</span><span>{">"}8%</span></div>
                    <div className="mt-2 pt-2 border-t flex justify-between font-medium">
                      <span>Seu valor:</span>
                      <span className={cn(inputs.churnMensal <= 2 ? "text-emerald-600" : inputs.churnMensal <= 3 ? "text-green-600" : inputs.churnMensal <= 5 ? "text-amber-600" : "text-red-600")}>{inputs.churnMensal}%</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-blue-500" />
                    Taxa de Conversão
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-emerald-600">Excelente:</span><span>{">"}7%</span></div>
                    <div className="flex justify-between"><span className="text-green-600">Bom:</span><span>5-7%</span></div>
                    <div className="flex justify-between"><span className="text-amber-600">Médio:</span><span>2-5%</span></div>
                    <div className="flex justify-between"><span className="text-red-600">Ruim:</span><span>{"<"}1%</span></div>
                    <div className="mt-2 pt-2 border-t flex justify-between font-medium">
                      <span>Seu valor:</span>
                      <span className={cn(inputs.taxaConversao >= 7 ? "text-emerald-600" : inputs.taxaConversao >= 5 ? "text-green-600" : inputs.taxaConversao >= 2 ? "text-amber-600" : "text-red-600")}>{inputs.taxaConversao}%</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-green-500" />
                    LTV/CAC Ratio
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-emerald-600">Excelente:</span><span>{">"}5x</span></div>
                    <div className="flex justify-between"><span className="text-green-600">Bom:</span><span>3-5x</span></div>
                    <div className="flex justify-between"><span className="text-amber-600">Médio:</span><span>2-3x</span></div>
                    <div className="flex justify-between"><span className="text-red-600">Ruim:</span><span>{"<"}1x</span></div>
                    <div className="mt-2 pt-2 border-t flex justify-between font-medium">
                      <span>Seu valor:</span>
                      <span className={cn(outputs.ltvCacRatio >= 5 ? "text-emerald-600" : outputs.ltvCacRatio >= 3 ? "text-green-600" : outputs.ltvCacRatio >= 2 ? "text-amber-600" : "text-red-600")}>{outputs.ltvCacRatio.toFixed(1)}x</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    Payback
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-emerald-600">Excelente:</span><span>{"<"}4 meses</span></div>
                    <div className="flex justify-between"><span className="text-green-600">Bom:</span><span>4-6 meses</span></div>
                    <div className="flex justify-between"><span className="text-amber-600">Médio:</span><span>6-12 meses</span></div>
                    <div className="flex justify-between"><span className="text-red-600">Ruim:</span><span>{">"}18 meses</span></div>
                    <div className="mt-2 pt-2 border-t flex justify-between font-medium">
                      <span>Seu valor:</span>
                      <span className={cn(outputs.paybackMeses <= 4 ? "text-emerald-600" : outputs.paybackMeses <= 6 ? "text-green-600" : outputs.paybackMeses <= 12 ? "text-amber-600" : "text-red-600")}>{outputs.paybackMeses} meses</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
