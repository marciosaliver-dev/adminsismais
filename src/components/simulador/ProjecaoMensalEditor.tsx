import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Calculator, 
  RotateCcw, 
  TrendingUp, 
  DollarSign,
  Megaphone,
  Target,
  Edit3,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  UserMinus
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
  Bar,
  Legend,
} from "recharts";

interface MesProjecao {
  mes: number;
  data: Date;
  mesLabel: string;
  mrrInicial: number;
  metaVendas: number;
  mrrGanho: number;
  churnQtd: number; // Quantidade de cancelamentos
  churnPrevisto: number; // Valor MRR perdido
  mrrFinal: number;
  investimentoAds: number;
  leadsEsperados: number;
  vendasEsperadas: number;
  faturamentoAcumulado: number;
  locked: boolean;
  churnLocked: boolean; // Se churn foi editado manualmente
}

interface ProjecaoMensalEditorProps {
  mrrAtual: number;
  mrrMeta: number;
  ticketMedio: number;
  churnMensal: number;
  taxaConversao: number;
  custoPorLead: number;
  mesesAteData: number;
  vendasPorMes: number;
  dataInicial?: Date;
  onProjecaoChange?: (projecao: MesProjecao[]) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);

export function ProjecaoMensalEditor({
  mrrAtual,
  mrrMeta,
  ticketMedio,
  churnMensal,
  taxaConversao,
  custoPorLead,
  mesesAteData,
  vendasPorMes,
  dataInicial,
  onProjecaoChange,
}: ProjecaoMensalEditorProps) {
  const [projecao, setProjecao] = useState<MesProjecao[]>([]);
  const [editingCell, setEditingCell] = useState<{ mes: number; field: string } | null>(null);
  const [showDetails, setShowDetails] = useState(true);

  // Gerar projeção inicial baseada nos inputs
  useEffect(() => {
    const gerarProjecaoInicial = () => {
      const meses: MesProjecao[] = [];
      let mrrAcumulado = mrrAtual;
      let faturamentoAcumulado = 0;
      
      // O loop deve ir de 0 (mês atual) até mesesAteData (mês final)
      for (let i = 0; i <= mesesAteData; i++) {
        const dataBase = dataInicial || new Date();
        const data = addMonths(dataBase, i);
        const mrrInicial = mrrAcumulado;
        
        let metaVendasMes = 0;
        let mrrGanho = 0;
        let churnMrrPrevisto = 0;
        let churnQtdPrevisto = 0;
        let investimentoAds = 0;
        let leadsNecessarios = 0;
        
        if (i > 0) {
          // Meses de projeção (M1 em diante)
          metaVendasMes = vendasPorMes;
          mrrGanho = metaVendasMes * ticketMedio;
          
          // Calcular churn baseado no percentual e MRR inicial do mês
          churnMrrPrevisto = mrrInicial * (churnMensal / 100);
          churnQtdPrevisto = ticketMedio > 0 ? Math.round(churnMrrPrevisto / ticketMedio) : 0;
          
          // Calcular investimento em ads necessário
          leadsNecessarios = taxaConversao > 0 ? metaVendasMes / (taxaConversao / 100) : 0;
          investimentoAds = leadsNecessarios * custoPorLead;
        }
        
        // Mês 0 (Mês atual) tem MRR inicial, mas 0 ganhos/perdas
        const mrrFinal = mrrInicial + mrrGanho - churnMrrPrevisto;
        
        faturamentoAcumulado += mrrFinal;
        
        meses.push({
          mes: i,
          data,
          mesLabel: format(data, "MMM/yy", { locale: ptBR }),
          mrrInicial,
          metaVendas: metaVendasMes,
          mrrGanho: Math.round(mrrGanho),
          churnQtd: churnQtdPrevisto,
          churnPrevisto: Math.round(churnMrrPrevisto),
          mrrFinal: Math.round(mrrFinal),
          investimentoAds: Math.round(investimentoAds),
          leadsEsperados: Math.round(leadsNecessarios),
          vendasEsperadas: metaVendasMes,
          faturamentoAcumulado: Math.round(faturamentoAcumulado),
          locked: false,
          churnLocked: false,
        });
        
        mrrAcumulado = mrrFinal;
      }
      
      return meses;
    };
    
    setProjecao(gerarProjecaoInicial());
  }, [mrrAtual, mrrMeta, ticketMedio, churnMensal, taxaConversao, custoPorLead, mesesAteData, vendasPorMes, dataInicial]);

  // Recalcular projeção quando um valor é editado
  const recalcularProjecao = (mesEditado: number, campo: keyof MesProjecao, novoValor: number) => {
    setProjecao(prev => {
      const novaProjecao = [...prev];
      
      // Atualizar o valor editado
      (novaProjecao[mesEditado] as any)[campo] = novoValor;
      novaProjecao[mesEditado].locked = true;
      
      // Recalcular valores dependentes do mês editado
      if (campo === "metaVendas") {
        novaProjecao[mesEditado].mrrGanho = novoValor * ticketMedio;
        novaProjecao[mesEditado].vendasEsperadas = novoValor;
        const leads = taxaConversao > 0 ? novoValor / (taxaConversao / 100) : 0;
        novaProjecao[mesEditado].leadsEsperados = Math.round(leads);
        novaProjecao[mesEditado].investimentoAds = Math.round(leads * custoPorLead);
      }
      
      if (campo === "investimentoAds") {
        const leads = custoPorLead > 0 ? novoValor / custoPorLead : 0;
        novaProjecao[mesEditado].leadsEsperados = Math.round(leads);
        const vendas = leads * (taxaConversao / 100);
        novaProjecao[mesEditado].vendasEsperadas = Math.round(vendas);
        novaProjecao[mesEditado].metaVendas = Math.round(vendas);
        novaProjecao[mesEditado].mrrGanho = Math.round(vendas) * ticketMedio;
      }
      
      // Se editou quantidade de churn, calcular MRR churn
      if (campo === "churnQtd") {
        novaProjecao[mesEditado].churnPrevisto = novoValor * ticketMedio;
        novaProjecao[mesEditado].churnLocked = true;
      }
      
      // Se editou MRR churn, calcular quantidade
      if (campo === "churnPrevisto") {
        novaProjecao[mesEditado].churnQtd = ticketMedio > 0 ? Math.round(novoValor / ticketMedio) : 0;
        novaProjecao[mesEditado].churnLocked = true;
      }
      
      // Recalcular MRR final e cascata para meses seguintes
      let mrrAcumulado = mesEditado > 0 ? novaProjecao[mesEditado - 1].mrrFinal : mrrAtual;
      let faturamentoAcumulado = mesEditado > 0 ? novaProjecao[mesEditado - 1].faturamentoAcumulado : 0;
      
      for (let i = mesEditado; i < novaProjecao.length; i++) {
        // O Mês 0 não deve ter ganhos/perdas, mesmo se editado
        if (i === 0) {
          novaProjecao[i].mrrFinal = novaProjecao[i].mrrInicial;
          novaProjecao[i].faturamentoAcumulado = novaProjecao[i].mrrFinal;
          mrrAcumulado = novaProjecao[i].mrrFinal;
          continue;
        }
        
        if (i > mesEditado && !novaProjecao[i].locked) {
          // Meses não travados usam cálculo automático
          novaProjecao[i].mrrInicial = mrrAcumulado;
          
          // Se churn não foi editado, recalcular automaticamente
          if (!novaProjecao[i].churnLocked) {
            const churnMrrAuto = mrrAcumulado * (churnMensal / 100);
            novaProjecao[i].churnPrevisto = Math.round(churnMrrAuto);
            novaProjecao[i].churnQtd = ticketMedio > 0 ? Math.round(churnMrrAuto / ticketMedio) : 0;
          }
        } else {
          // Se for o mês editado ou um mês travado, apenas atualiza o MRR inicial
          novaProjecao[i].mrrInicial = mrrAcumulado;
        }
        
        novaProjecao[i].mrrFinal = Math.round(
          novaProjecao[i].mrrInicial + novaProjecao[i].mrrGanho - novaProjecao[i].churnPrevisto
        );
        
        faturamentoAcumulado += novaProjecao[i].mrrFinal;
        novaProjecao[i].faturamentoAcumulado = Math.round(faturamentoAcumulado);
        
        mrrAcumulado = novaProjecao[i].mrrFinal;
      }
      
      return novaProjecao;
    });
  };

  const handleCellEdit = (mesIndex: number, campo: keyof MesProjecao, value: string) => {
    const numValue = parseFloat(value) || 0;
    recalcularProjecao(mesIndex, campo, numValue);
    setEditingCell(null);
    onProjecaoChange?.(projecao);
  };

  const resetarMes = (mesIndex: number) => {
    setProjecao(prev => {
      const novaProjecao = [...prev];
      novaProjecao[mesIndex].locked = false;
      novaProjecao[mesIndex].churnLocked = false;
      return novaProjecao;
    });
    // Recalcular tudo do zero
    // Força um recalculo completo chamando recalcularProjecao no mês 1 (ou 0 se for o único)
    recalcularProjecao(mesIndex > 0 ? 1 : 0, "mrrInicial", projecao[mesIndex > 0 ? 1 : 0].mrrInicial);
  };

  // Totais e resumo
  const totais = useMemo(() => {
    // Excluir Mês 0 dos totais de investimento, ganho e churn
    const projecaoReal = projecao.slice(1);
    
    const totalInvestimento = projecaoReal.reduce((acc, m) => acc + m.investimentoAds, 0);
    const totalMrrGanho = projecaoReal.reduce((acc, m) => acc + m.mrrGanho, 0);
    const totalChurn = projecaoReal.reduce((acc, m) => acc + m.churnPrevisto, 0);
    const totalVendas = projecaoReal.reduce((acc, m) => acc + m.vendasEsperadas, 0);
    
    const mrrFinalProjetado = projecao[projecao.length - 1]?.mrrFinal || 0;
    const faturamentoTotal = projecao[projecao.length - 1]?.faturamentoAcumulado || 0;
    const atingeMeta = mrrFinalProjetado >= mrrMeta;
    const percentualMeta = mrrMeta > 0 ? (mrrFinalProjetado / mrrMeta) * 100 : 0;
    
    return {
      totalInvestimento,
      totalMrrGanho,
      totalChurn,
      totalVendas,
      mrrFinalProjetado,
      faturamentoTotal,
      atingeMeta,
      percentualMeta,
    };
  }, [projecao, mrrMeta]);

  // Dados para o gráfico
  const chartData = useMemo(() => {
    return projecao.map(m => ({
      mes: m.mesLabel,
      mrrProjetado: m.mrrFinal,
      mrrMeta: mrrMeta,
      investimento: m.investimentoAds,
      mrrGanho: m.mrrGanho,
      churn: m.churnPrevisto,
    }));
  }, [projecao, mrrMeta]);

  return (
    <div className="space-y-6">
      {/* Resumo Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(
          "transition-all",
          totais.atingeMeta 
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" 
            : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
        )}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MRR Final Projetado</p>
                <p className="text-2xl font-bold">{formatCurrency(totais.mrrFinalProjetado)}</p>
              </div>
              {totais.atingeMeta ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-amber-600" />
              )}
            </div>
            <div className="mt-2">
              <Badge variant={totais.atingeMeta ? "default" : "secondary"} className={cn(
                totais.atingeMeta ? "bg-emerald-600" : "bg-amber-600"
              )}>
                {totais.percentualMeta.toFixed(0)}% da meta
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Megaphone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investimento Total Ads</p>
                <p className="text-2xl font-bold">{formatCurrency(totais.totalInvestimento)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MRR Ganho Total</p>
                <p className="text-2xl font-bold text-emerald-600">+{formatCurrency(totais.totalMrrGanho)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturamento Acumulado</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totais.faturamentoTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Projeção */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Evolução MRR vs Investimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <RechartsTooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => `Mês: ${label}`}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                />
                <Legend />
                <ReferenceLine yAxisId="left" y={mrrMeta} stroke="hsl(var(--primary))" strokeDasharray="5 5" label={{ value: "Meta", position: "right" }} />
                <Area yAxisId="left" type="monotone" dataKey="mrrProjetado" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} name="MRR Projetado" />
                <Bar yAxisId="right" dataKey="investimento" fill="hsl(var(--chart-4))" name="Investimento Ads" opacity={0.7} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Editável */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Planejamento Mensal Detalhado
              </CardTitle>
              <CardDescription>Clique nos valores para ajustar mês a mês</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {showDetails ? "Ocultar" : "Expandir"}
            </Button>
          </div>
        </CardHeader>
        {showDetails && (
          <CardContent className="p-0">
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Mês</TableHead>
                    <TableHead className="text-right">MRR Inicial</TableHead>
                    <TableHead className="text-right bg-purple-50 dark:bg-purple-950/30">
                      <div className="flex items-center justify-end gap-1">
                        <Megaphone className="w-3.5 h-3.5" />
                        Invest. Ads
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right bg-emerald-50 dark:bg-emerald-950/30">
                      <div className="flex items-center justify-end gap-1">
                        <Target className="w-3.5 h-3.5" />
                        Meta Vendas
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-emerald-600">+MRR Ganho</TableHead>
                    <TableHead className="text-right bg-red-50 dark:bg-red-950/30">
                      <div className="flex items-center justify-end gap-1">
                        <UserMinus className="w-3.5 h-3.5 text-red-500" />
                        Churn Qtd
                      </div>
                    </TableHead>
                    <TableHead className="text-right bg-red-50 dark:bg-red-950/30 text-red-500">-Churn MRR</TableHead>
                    <TableHead className="text-right font-semibold">MRR Final</TableHead>
                    <TableHead className="text-right">Fat. Acum.</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projecao.map((mes, index) => (
                    <TableRow 
                      key={mes.mes} 
                      className={cn(
                        "transition-colors",
                        mes.mrrFinal >= mrrMeta && "bg-emerald-50/50 dark:bg-emerald-950/20",
                        (mes.locked || mes.churnLocked) && "bg-blue-50/50 dark:bg-blue-950/20"
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {(mes.locked || mes.churnLocked) && <Lock className="w-3 h-3 text-blue-500" />}
                          {format(mes.data, "MMM/yy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(mes.mrrInicial)}
                      </TableCell>
                      
                      {/* Investimento Ads - Editável (apenas M1 em diante) */}
                      <TableCell className="text-right bg-purple-50/50 dark:bg-purple-950/20">
                        {index > 0 && editingCell?.mes === index && editingCell?.field === "investimentoAds" ? (
                          <Input
                            type="number"
                            defaultValue={mes.investimentoAds}
                            className="h-7 w-24 text-right"
                            autoFocus
                            onBlur={(e) => handleCellEdit(index, "investimentoAds", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCellEdit(index, "investimentoAds", (e.target as HTMLInputElement).value);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                          />
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className={cn(
                                    "px-2 py-1 rounded transition-colors flex items-center gap-1 ml-auto",
                                    index > 0 ? "hover:bg-purple-100 dark:hover:bg-purple-900/50" : "cursor-default"
                                  )}
                                  onClick={() => index > 0 && setEditingCell({ mes: index, field: "investimentoAds" })}
                                  disabled={index === 0}
                                >
                                  {index > 0 && <Edit3 className="w-3 h-3 opacity-50" />}
                                  {formatCurrency(mes.investimentoAds)}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{index > 0 ? "Clique para editar" : "Mês inicial"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right text-muted-foreground">
                        {formatNumber(mes.leadsEsperados)}
                      </TableCell>
                      
                      {/* Meta Vendas - Editável (apenas M1 em diante) */}
                      <TableCell className="text-right bg-emerald-50/50 dark:bg-emerald-950/20">
                        {index > 0 && editingCell?.mes === index && editingCell?.field === "metaVendas" ? (
                          <Input
                            type="number"
                            defaultValue={mes.metaVendas}
                            className="h-7 w-20 text-right"
                            autoFocus
                            onBlur={(e) => handleCellEdit(index, "metaVendas", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCellEdit(index, "metaVendas", (e.target as HTMLInputElement).value);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                          />
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className={cn(
                                    "px-2 py-1 rounded transition-colors flex items-center gap-1 ml-auto font-medium",
                                    index > 0 ? "hover:bg-emerald-100 dark:hover:bg-emerald-900/50" : "cursor-default"
                                  )}
                                  onClick={() => index > 0 && setEditingCell({ mes: index, field: "metaVendas" })}
                                  disabled={index === 0}
                                >
                                  {index > 0 && <Edit3 className="w-3 h-3 opacity-50" />}
                                  {mes.metaVendas}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{index > 0 ? "Clique para editar" : "Mês inicial"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right text-emerald-600 font-medium">
                        {mes.mrrGanho > 0 ? `+${formatCurrency(mes.mrrGanho)}` : formatCurrency(0)}
                      </TableCell>

                      {/* Churn Quantidade - Editável (apenas M1 em diante) */}
                      <TableCell className="text-right bg-red-50/50 dark:bg-red-950/20">
                        {index > 0 && editingCell?.mes === index && editingCell?.field === "churnQtd" ? (
                          <Input
                            type="number"
                            defaultValue={mes.churnQtd}
                            className="h-7 w-16 text-right"
                            autoFocus
                            onBlur={(e) => handleCellEdit(index, "churnQtd", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCellEdit(index, "churnQtd", (e.target as HTMLInputElement).value);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                          />
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className={cn(
                                    "px-2 py-1 rounded transition-colors flex items-center gap-1 ml-auto text-red-600",
                                    index > 0 ? "hover:bg-red-100 dark:hover:bg-red-900/50" : "cursor-default"
                                  )}
                                  onClick={() => index > 0 && setEditingCell({ mes: index, field: "churnQtd" })}
                                  disabled={index === 0}
                                >
                                  {index > 0 && <Edit3 className="w-3 h-3 opacity-50" />}
                                  {mes.churnQtd}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{index > 0 ? "Clique para editar quantidade de cancelamentos" : "Mês inicial"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>

                      {/* Churn MRR - Editável (apenas M1 em diante) */}
                      <TableCell className="text-right bg-red-50/50 dark:bg-red-950/20">
                        {index > 0 && editingCell?.mes === index && editingCell?.field === "churnPrevisto" ? (
                          <Input
                            type="number"
                            defaultValue={mes.churnPrevisto}
                            className="h-7 w-24 text-right"
                            autoFocus
                            onBlur={(e) => handleCellEdit(index, "churnPrevisto", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCellEdit(index, "churnPrevisto", (e.target as HTMLInputElement).value);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                          />
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className={cn(
                                    "px-2 py-1 rounded transition-colors flex items-center gap-1 ml-auto text-red-600 font-medium",
                                    index > 0 ? "hover:bg-red-100 dark:hover:bg-red-900/50" : "cursor-default"
                                  )}
                                  onClick={() => index > 0 && setEditingCell({ mes: index, field: "churnPrevisto" })}
                                  disabled={index === 0}
                                >
                                  {index > 0 && <Edit3 className="w-3 h-3 opacity-50" />}
                                  -{formatCurrency(mes.churnPrevisto)}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{index > 0 ? "Clique para editar MRR perdido" : "Mês inicial"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-bold">
                        {formatCurrency(mes.mrrFinal)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(mes.faturamentoAcumulado)}
                      </TableCell>
                      <TableCell>
                        {(mes.locked || mes.churnLocked) && index > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => resetarMes(index)}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Restaurar cálculo automático</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            
            {/* Linha de totais */}
            <div className="border-t bg-muted/30 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Vendas:</span>
                  <span className="font-bold ml-2">{formatNumber(totais.totalVendas)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Investimento:</span>
                  <span className="font-bold ml-2 text-purple-600">{formatCurrency(totais.totalInvestimento)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">MRR Ganho:</span>
                  <span className="font-bold ml-2 text-emerald-600">+{formatCurrency(totais.totalMrrGanho)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Churn Total:</span>
                  <span className="font-bold ml-2 text-red-500">-{formatCurrency(totais.totalChurn)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}