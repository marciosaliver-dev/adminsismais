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
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
}

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
    };
  }, [inputs]);

  // Efeito para calcular MRR automaticamente baseado em clientes ativos e ticket médio
  useEffect(() => {
    if (inputs.clientesAtivos > 0 && inputs.ticketMedio > 0) {
      const mrrCalculado = inputs.clientesAtivos * inputs.ticketMedio;
      if (mrrCalculado !== inputs.mrrAtual) {
        setInputs(prev => ({ ...prev, mrrAtual: mrrCalculado }));
      }
    }
  }, [inputs.clientesAtivos, inputs.ticketMedio]);

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
                  <Label>Ticket Médio (R$)</Label>
                  <Input
                    type="number"
                    value={inputs.ticketMedio}
                    onChange={e => updateInput("ticketMedio", Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>LTV (meses)</Label>
                  <Input
                    type="number"
                    value={inputs.ltvMeses}
                    onChange={e => updateInput("ltvMeses", Number(e.target.value))}
                    min={1}
                    max={60}
                  />
                  <p className="text-xs text-muted-foreground">Tempo médio de vida do cliente</p>
                </div>
                <div className="space-y-2">
                  <Label>Churn Mensal (%)</Label>
                  <Input
                    type="number"
                    value={inputs.churnMensal}
                    onChange={e => updateInput("churnMensal", Number(e.target.value))}
                    min={0}
                    max={100}
                    step={0.1}
                  />
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
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Taxa Conversão (%)</Label>
                  <Input
                    type="number"
                    value={inputs.taxaConversao}
                    onChange={e => updateInput("taxaConversao", Number(e.target.value))}
                    min={0.1}
                    max={100}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo por Lead (R$)</Label>
                  <Input
                    type="number"
                    value={inputs.custoPorLead}
                    onChange={e => updateInput("custoPorLead", Number(e.target.value))}
                    min={0}
                    step={0.5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Leads/Vendedor/Mês</Label>
                  <Input
                    type="number"
                    value={inputs.leadsVendedorMes}
                    onChange={e => updateInput("leadsVendedorMes", Number(e.target.value))}
                    min={1}
                  />
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {outputs.ltvCacRatio >= 3 ? "Excelente!" : outputs.ltvCacRatio >= 2 ? "Saudável" : "Precisa melhorar"}
                    </p>
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
              <CardTitle className="text-base">Resumo do Cenário</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                Para crescer de <strong>{formatCurrency(inputs.mrrAtual)}</strong> para{" "}
                <strong>{formatCurrency(inputs.mrrMeta)}</strong> em{" "}
                <strong>{outputs.mesesAteData} meses</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Você precisa de <strong className="text-foreground">{formatNumber(outputs.novasVendas)} novas vendas</strong> ({formatNumber(outputs.vendasPorMes)}/mês)</li>
                <li>Gerando <strong className="text-foreground">{formatNumber(outputs.leadsNecessarios)} leads</strong> ({formatNumber(outputs.leadsPorMes)}/mês)</li>
                <li>Investindo <strong className="text-foreground">{formatCurrency(outputs.investimentoMarketing)}</strong> em marketing</li>
                <li>LTV/CAC de <strong className="text-foreground">{outputs.ltvCacRatio.toFixed(1)}x</strong> (benchmark: ≥3x)</li>
                {outputs.vendedoresAdicionais > 0 && (
                  <li>Contratando <strong className="text-foreground">{outputs.vendedoresAdicionais} vendedores</strong> adicionais</li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Análise com IA */}
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="w-5 h-5 text-purple-500" />
                  Análise com IA
                </CardTitle>
                <Button 
                  onClick={analisarComIA} 
                  disabled={isAnalyzing}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {isAnalyzing ? "Analisando..." : "Analisar Cenário"}
                </Button>
              </div>
              <CardDescription>
                Obtenha insights estratégicos baseados em benchmarks de mercado SaaS
              </CardDescription>
            </CardHeader>
            {aiAnalysis && (
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div 
                      className="space-y-4"
                      dangerouslySetInnerHTML={{ 
                        __html: aiAnalysis
                          .replace(/^## /gm, '<h3 class="text-lg font-bold mt-6 mb-2">')
                          .replace(/^### /gm, '<h4 class="text-base font-semibold mt-4 mb-2">')
                          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                          .replace(/^- /gm, '• ')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                  </div>
                </ScrollArea>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
