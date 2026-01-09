import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Calculator,
  Loader2,
  Users,
  TrendingDown,
  Target,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  RefreshCw,
} from "lucide-react";
import { format, startOfMonth, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FechamentoEquipe {
  id: string;
  mes_referencia: string;
  assinaturas_inicio_mes: number | null;
  vendas_mes: number | null;
  cancelamentos_mes: number | null;
  churn_rate: number | null;
  mrr_mes: number | null;
  meta_vendas: number | null;
  meta_atingida: boolean | null;
  percentual_meta: number | null;
  limite_churn: number | null;
  limite_cancelamentos: number | null;
  percentual_bonus_churn: number | null;
  percentual_bonus_retencao: number | null;
  percentual_bonus_meta: number | null;
  bonus_churn_liberado: boolean | null;
  bonus_retencao_liberado: boolean | null;
  bonus_meta_liberado: boolean | null;
  valor_bonus_meta_total: number | null;
  total_colaboradores_participantes: number | null;
  valor_bonus_meta_individual: number | null;
  status: string | null;
  calculado_em: string | null;
}

interface FechamentoColaborador {
  id: string;
  colaborador_id: string;
  nome_colaborador: string;
  cargo: string | null;
  salario_base: number | null;
  bonus_churn: number | null;
  bonus_retencao: number | null;
  bonus_meta_equipe: number | null;
  subtotal_bonus_equipe: number | null;
  qtd_vendas_servicos: number | null;
  total_vendas_servicos: number | null;
  comissao_servicos: number | null;
  qtd_metas_individuais: number | null;
  qtd_metas_atingidas: number | null;
  total_bonus_metas_individuais: number | null;
  total_a_receber: number | null;
  relatorio_html: string | null;
}

interface Colaborador {
  id: string;
  nome: string;
  cargo: string | null;
  salario_base: number;
  percentual_comissao: number | null;
}

interface MetaMensal {
  meta_quantidade: number;
  meta_mrr: number;
}

interface FechamentoComissao {
  total_vendas: number;
  total_mrr: number;
  meta_batida: boolean;
}

export default function FechamentoEquipe() {
  const queryClient = useQueryClient();
  const [mesReferencia, setMesReferencia] = useState(format(new Date(), "yyyy-MM"));
  const [isCalculando, setIsCalculando] = useState(false);
  const [demonstrativoModal, setDemonstrativoModal] = useState<{
    open: boolean;
    colaborador: FechamentoColaborador | null;
  }>({ open: false, colaborador: null });

  const mesReferenciaDate = startOfMonth(parse(mesReferencia, "yyyy-MM", new Date()));

  // Buscar fechamento existente
  const { data: fechamento, isLoading: isLoadingFechamento, refetch: refetchFechamento } = useQuery({
    queryKey: ["fechamento-equipe", mesReferencia],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fechamento_equipe")
        .select("*")
        .eq("mes_referencia", format(mesReferenciaDate, "yyyy-MM-dd"))
        .maybeSingle();

      if (error) throw error;
      return data as FechamentoEquipe | null;
    },
  });

  // Buscar colaboradores do fechamento
  const { data: colaboradoresFechamento, refetch: refetchColaboradores } = useQuery({
    queryKey: ["fechamento-colaboradores", fechamento?.id],
    queryFn: async () => {
      if (!fechamento?.id) return [];
      const { data, error } = await supabase
        .from("fechamento_colaborador")
        .select("*")
        .eq("fechamento_equipe_id", fechamento.id)
        .order("nome_colaborador");

      if (error) throw error;
      return data as FechamentoColaborador[];
    },
    enabled: !!fechamento?.id,
  });

  // Buscar dados para cálculo
  const { data: dadosCalculo } = useQuery({
    queryKey: ["dados-calculo-fechamento", mesReferencia],
    queryFn: async () => {
      // Buscar colaboradores participantes
      const { data: colaboradores } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo, salario_base, percentual_comissao")
        .eq("ativo", true)
        .eq("participa_fechamento_equipe", true);

      // Buscar meta do mês
      const { data: meta } = await supabase
        .from("meta_mensal")
        .select("meta_quantidade, meta_mrr")
        .eq("mes_referencia", format(mesReferenciaDate, "yyyy-MM-dd"))
        .maybeSingle();

      // Buscar fechamento de comissão (vendedores)
      const { data: fechamentoComissao } = await supabase
        .from("fechamento_comissao")
        .select("total_vendas, total_mrr, meta_batida")
        .eq("mes_referencia", format(mesReferenciaDate, "yyyy-MM-dd"))
        .maybeSingle();

      // Buscar vendas de serviços aprovadas
      const { data: vendasServicos } = await supabase
        .from("vendas_servicos")
        .select("colaborador_id, valor_servico")
        .eq("mes_referencia", format(mesReferenciaDate, "yyyy-MM-dd"))
        .eq("status", "aprovado");

      // Buscar metas individuais atingidas
      const { data: metasIndividuais } = await supabase
        .from("metas_individuais")
        .select("colaborador_id, valor_bonus, tipo_bonus, atingida, colaboradores(salario_base)")
        .eq("mes_referencia", format(mesReferenciaDate, "yyyy-MM-dd"));

      return {
        colaboradores: colaboradores as Colaborador[] || [],
        meta: meta as MetaMensal | null,
        fechamentoComissao: fechamentoComissao as FechamentoComissao | null,
        vendasServicos: vendasServicos || [],
        metasIndividuais: metasIndividuais || [],
      };
    },
  });

  // Mutation para calcular fechamento
  const calcularMutation = useMutation({
    mutationFn: async () => {
      setIsCalculando(true);

      if (!dadosCalculo?.colaboradores?.length) {
        throw new Error("Nenhum colaborador participante encontrado");
      }

      const colaboradores = dadosCalculo.colaboradores;
      const meta = dadosCalculo.meta;
      const fechamentoComissao = dadosCalculo.fechamentoComissao;
      const vendasServicos = dadosCalculo.vendasServicos;
      const metasIndividuais = dadosCalculo.metasIndividuais;

      // Dados simulados para cálculo (em produção viriam de outras fontes)
      const assinaturasInicioMes = 2000; // TODO: buscar de fonte real
      const cancelamentosMes = 30; // TODO: buscar de fonte real
      const vendasMes = fechamentoComissao?.total_vendas || 0;
      const mrrMes = fechamentoComissao?.total_mrr || 0;
      const metaVendas = meta?.meta_quantidade || 0;

      // Cálculos
      const churnRate = assinaturasInicioMes > 0 
        ? (cancelamentosMes / assinaturasInicioMes) * 100 
        : 0;
      const taxaCancelamentos = vendasMes > 0 
        ? (cancelamentosMes / vendasMes) * 100 
        : 0;
      const percentualMeta = metaVendas > 0 
        ? (vendasMes / metaVendas) * 100 
        : 0;

      // Verificar bônus
      const limiteChurn = 5;
      const limiteCancelamentos = 50;
      const bonusChurnLiberado = churnRate < limiteChurn;
      const bonusRetencaoLiberado = taxaCancelamentos < limiteCancelamentos;
      const bonusMetaLiberado = percentualMeta >= 100;

      // Valores de bônus
      const percentualBonusChurn = 3;
      const percentualBonusRetencao = 3;
      const percentualBonusMeta = 10;
      const valorBonusMetaTotal = bonusMetaLiberado ? mrrMes * (percentualBonusMeta / 100) : 0;
      const valorBonusMetaIndividual = colaboradores.length > 0 
        ? valorBonusMetaTotal / colaboradores.length 
        : 0;

      // Criar ou atualizar fechamento_equipe
      const fechamentoData = {
        mes_referencia: format(mesReferenciaDate, "yyyy-MM-dd"),
        assinaturas_inicio_mes: assinaturasInicioMes,
        vendas_mes: vendasMes,
        cancelamentos_mes: cancelamentosMes,
        churn_rate: churnRate,
        mrr_mes: mrrMes,
        meta_vendas: metaVendas,
        meta_atingida: bonusMetaLiberado,
        percentual_meta: percentualMeta,
        limite_churn: limiteChurn,
        limite_cancelamentos: limiteCancelamentos,
        percentual_bonus_churn: percentualBonusChurn,
        percentual_bonus_retencao: percentualBonusRetencao,
        percentual_bonus_meta: percentualBonusMeta,
        bonus_churn_liberado: bonusChurnLiberado,
        bonus_retencao_liberado: bonusRetencaoLiberado,
        bonus_meta_liberado: bonusMetaLiberado,
        valor_bonus_meta_total: valorBonusMetaTotal,
        total_colaboradores_participantes: colaboradores.length,
        valor_bonus_meta_individual: valorBonusMetaIndividual,
        status: "calculado",
        calculado_em: new Date().toISOString(),
      };

      let fechamentoId: string;

      if (fechamento?.id) {
        // Atualizar existente
        const { error } = await supabase
          .from("fechamento_equipe")
          .update(fechamentoData)
          .eq("id", fechamento.id);
        if (error) throw error;
        fechamentoId = fechamento.id;

        // Limpar colaboradores anteriores
        await supabase
          .from("fechamento_colaborador")
          .delete()
          .eq("fechamento_equipe_id", fechamento.id);
      } else {
        // Criar novo
        const { data, error } = await supabase
          .from("fechamento_equipe")
          .insert(fechamentoData)
          .select("id")
          .single();
        if (error) throw error;
        fechamentoId = data.id;
      }

      // Calcular e inserir fechamento de cada colaborador
      for (const colab of colaboradores) {
        // Bônus de equipe
        const bonusChurn = bonusChurnLiberado 
          ? colab.salario_base * (percentualBonusChurn / 100) 
          : 0;
        const bonusRetencao = bonusRetencaoLiberado 
          ? colab.salario_base * (percentualBonusRetencao / 100) 
          : 0;
        const bonusMetaEquipe = bonusMetaLiberado ? valorBonusMetaIndividual : 0;
        const subtotalBonusEquipe = bonusChurn + bonusRetencao + bonusMetaEquipe;

        // Comissão sobre serviços
        const vendasColaborador = vendasServicos.filter(v => v.colaborador_id === colab.id);
        const totalVendasServicos = vendasColaborador.reduce((sum, v) => sum + v.valor_servico, 0);
        const comissaoServicos = totalVendasServicos * ((colab.percentual_comissao || 10) / 100);

        // Metas individuais
        const metasColab = metasIndividuais.filter(m => m.colaborador_id === colab.id);
        const metasAtingidas = metasColab.filter(m => m.atingida);
        const totalBonusMetas = metasAtingidas.reduce((sum, m) => {
          if (m.tipo_bonus === "percentual") {
            const salario = (m.colaboradores as any)?.salario_base || colab.salario_base;
            return sum + (salario * (m.valor_bonus / 100));
          }
          return sum + m.valor_bonus;
        }, 0);

        // Total
        const totalAReceber = subtotalBonusEquipe + comissaoServicos + totalBonusMetas;

        // Gerar HTML do demonstrativo
        const relatorioHtml = gerarDemonstrativoHTML({
          nome: colab.nome,
          cargo: colab.cargo,
          salarioBase: colab.salario_base,
          mesReferencia: format(mesReferenciaDate, "MMMM/yyyy", { locale: ptBR }),
          churnRate,
          taxaCancelamentos,
          percentualMeta,
          bonusChurnLiberado,
          bonusRetencaoLiberado,
          bonusMetaLiberado,
          bonusChurn,
          bonusRetencao,
          bonusMetaEquipe,
          subtotalBonusEquipe,
          vendasServicos: vendasColaborador,
          percentualComissao: colab.percentual_comissao || 10,
          comissaoServicos,
          metasAtingidas,
          totalBonusMetas,
          totalAReceber,
        });

        await supabase.from("fechamento_colaborador").insert({
          fechamento_equipe_id: fechamentoId,
          colaborador_id: colab.id,
          nome_colaborador: colab.nome,
          cargo: colab.cargo,
          salario_base: colab.salario_base,
          percentual_comissao: colab.percentual_comissao,
          bonus_churn: bonusChurn,
          bonus_retencao: bonusRetencao,
          bonus_meta_equipe: bonusMetaEquipe,
          subtotal_bonus_equipe: subtotalBonusEquipe,
          qtd_vendas_servicos: vendasColaborador.length,
          total_vendas_servicos: totalVendasServicos,
          comissao_servicos: comissaoServicos,
          qtd_metas_individuais: metasColab.length,
          qtd_metas_atingidas: metasAtingidas.length,
          total_bonus_metas_individuais: totalBonusMetas,
          total_a_receber: totalAReceber,
          relatorio_html: relatorioHtml,
        });
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamento-equipe"] });
      queryClient.invalidateQueries({ queryKey: ["fechamento-colaboradores"] });
      refetchFechamento();
      refetchColaboradores();
      toast.success("Fechamento calculado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao calcular fechamento: " + error.message);
    },
    onSettled: () => {
      setIsCalculando(false);
    },
  });

  const formatCurrency = (value: number | null) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const formatPercent = (value: number | null) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const totais = colaboradoresFechamento?.reduce(
    (acc, c) => ({
      bonusEquipe: acc.bonusEquipe + (c.subtotal_bonus_equipe || 0),
      servicos: acc.servicos + (c.comissao_servicos || 0),
      metas: acc.metas + (c.total_bonus_metas_individuais || 0),
      total: acc.total + (c.total_a_receber || 0),
    }),
    { bonusEquipe: 0, servicos: 0, metas: 0, total: 0 }
  ) || { bonusEquipe: 0, servicos: 0, metas: 0, total: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fechamento de Equipe</h1>
          <p className="text-muted-foreground">
            Calcule e gerencie o fechamento mensal dos colaboradores
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="month"
            value={mesReferencia}
            onChange={(e) => setMesReferencia(e.target.value)}
            className="w-40"
          />
          <Button onClick={() => calcularMutation.mutate()} disabled={isCalculando}>
            {isCalculando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-4 w-4" />
            )}
            {fechamento ? "Recalcular" : "Calcular"}
          </Button>
        </div>
      </div>

      {isLoadingFechamento ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !fechamento ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum fechamento encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Clique em "Calcular" para gerar o fechamento do mês de{" "}
              {format(mesReferenciaDate, "MMMM/yyyy", { locale: ptBR })}
            </p>
            <Button onClick={() => calcularMutation.mutate()} disabled={isCalculando}>
              {isCalculando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              Calcular Fechamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Métricas do Mês */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas do Mês</CardTitle>
              <CardDescription>
                Dados importados do módulo de comissões - {format(mesReferenciaDate, "MMMM/yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Assinaturas Início</p>
                  <p className="text-2xl font-bold">{fechamento.assinaturas_inicio_mes || 0}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Vendas</p>
                  <p className="text-2xl font-bold">{fechamento.vendas_mes || 0}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Cancelamentos</p>
                  <p className="text-2xl font-bold">{fechamento.cancelamentos_mes || 0}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Churn</p>
                  <p className="text-2xl font-bold">{formatPercent(fechamento.churn_rate)}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">MRR</p>
                  <p className="text-2xl font-bold">{formatCurrency(fechamento.mrr_mes)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verificação de Bônus */}
          <Card>
            <CardHeader>
              <CardTitle>Verificação de Bônus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className={`p-4 rounded-lg border-2 ${
                  fechamento.bonus_churn_liberado 
                    ? "border-green-500 bg-green-50" 
                    : "border-red-500 bg-red-50"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {fechamento.bonus_churn_liberado ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">Bônus Churn</span>
                  </div>
                  <p className="text-sm">
                    Churn {formatPercent(fechamento.churn_rate)} (limite: &lt;{fechamento.limite_churn}%)
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {fechamento.bonus_churn_liberado 
                      ? `${fechamento.percentual_bonus_churn}% do salário → LIBERADO` 
                      : "NÃO LIBERADO"}
                  </p>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  fechamento.bonus_retencao_liberado 
                    ? "border-green-500 bg-green-50" 
                    : "border-red-500 bg-red-50"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {fechamento.bonus_retencao_liberado ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">Bônus Retenção</span>
                  </div>
                  <p className="text-sm">
                    Cancelamentos &lt;{fechamento.limite_cancelamentos}% das vendas
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {fechamento.bonus_retencao_liberado 
                      ? `${fechamento.percentual_bonus_retencao}% do salário → LIBERADO` 
                      : "NÃO LIBERADO"}
                  </p>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  fechamento.bonus_meta_liberado 
                    ? "border-green-500 bg-green-50" 
                    : "border-red-500 bg-red-50"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {fechamento.bonus_meta_liberado ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">Bônus Meta</span>
                  </div>
                  <p className="text-sm">
                    Meta {formatPercent(fechamento.percentual_meta)} ({fechamento.vendas_mes}/{fechamento.meta_vendas})
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {fechamento.bonus_meta_liberado 
                      ? `${fechamento.percentual_bonus_meta}% MRR ÷ ${fechamento.total_colaboradores_participantes} = ${formatCurrency(fechamento.valor_bonus_meta_individual)}` 
                      : "NÃO LIBERADO"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demonstrativos Individuais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Demonstrativos Individuais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead className="text-right">Bônus Equipe</TableHead>
                      <TableHead className="text-right">Serviços</TableHead>
                      <TableHead className="text-right">Metas Ind.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colaboradoresFechamento?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum colaborador encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      colaboradoresFechamento?.map((colab) => (
                        <TableRow key={colab.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{colab.nome_colaborador}</p>
                              <p className="text-xs text-muted-foreground">{colab.cargo}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(colab.subtotal_bonus_equipe)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(colab.comissao_servicos)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              {formatCurrency(colab.total_bonus_metas_individuais)}
                              <p className="text-xs text-muted-foreground">
                                {colab.qtd_metas_atingidas}/{colab.qtd_metas_individuais} metas
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatCurrency(colab.total_a_receber)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDemonstrativoModal({ open: true, colaborador: colab })}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Resumo */}
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Resumo Geral</h4>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Bônus Equipe</p>
                    <p className="font-medium">{formatCurrency(totais.bonusEquipe)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Serviços</p>
                    <p className="font-medium">{formatCurrency(totais.servicos)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Metas Ind.</p>
                    <p className="font-medium">{formatCurrency(totais.metas)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">TOTAL GERAL</p>
                    <p className="font-bold text-lg text-green-600">{formatCurrency(totais.total)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal Demonstrativo */}
      <Dialog 
        open={demonstrativoModal.open} 
        onOpenChange={(open) => setDemonstrativoModal({ open, colaborador: null })}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Demonstrativo - {demonstrativoModal.colaborador?.nome_colaborador}
            </DialogTitle>
          </DialogHeader>
          {demonstrativoModal.colaborador?.relatorio_html && (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: demonstrativoModal.colaborador.relatorio_html }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Função para gerar HTML do demonstrativo
function gerarDemonstrativoHTML(dados: {
  nome: string;
  cargo: string | null;
  salarioBase: number;
  mesReferencia: string;
  churnRate: number;
  taxaCancelamentos: number;
  percentualMeta: number;
  bonusChurnLiberado: boolean;
  bonusRetencaoLiberado: boolean;
  bonusMetaLiberado: boolean;
  bonusChurn: number;
  bonusRetencao: number;
  bonusMetaEquipe: number;
  subtotalBonusEquipe: number;
  vendasServicos: any[];
  percentualComissao: number;
  comissaoServicos: number;
  metasAtingidas: any[];
  totalBonusMetas: number;
  totalAReceber: number;
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">DEMONSTRATIVO DE FECHAMENTO</h2>
        <p style="margin: 5px 0; text-transform: capitalize;">${dados.mesReferencia}</p>
      </div>

      <div style="margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 8px;">
        <p style="margin: 5px 0;"><strong>Colaborador:</strong> ${dados.nome}</p>
        <p style="margin: 5px 0;"><strong>Cargo:</strong> ${dados.cargo || '-'}</p>
        <p style="margin: 5px 0;"><strong>Salário Base:</strong> ${formatCurrency(dados.salarioBase)}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">📊 INDICADORES DO MÊS</h3>
        <p>Churn Rate: ${dados.churnRate.toFixed(1)}% ${dados.bonusChurnLiberado ? '✅' : '❌'}</p>
        <p>Meta de Vendas: ${dados.percentualMeta.toFixed(0)}% ${dados.bonusMetaLiberado ? '✅' : '❌'}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">💰 BÔNUS DE EQUIPE</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0;">Bônus Churn (3% do salário)</td>
            <td style="text-align: right;">${formatCurrency(dados.bonusChurn)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Bônus Retenção (3% do salário)</td>
            <td style="text-align: right;">${formatCurrency(dados.bonusRetencao)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Bônus Meta (rateado)</td>
            <td style="text-align: right;">${formatCurrency(dados.bonusMetaEquipe)}</td>
          </tr>
          <tr style="font-weight: bold; border-top: 1px solid #ccc;">
            <td style="padding: 5px 0;">Subtotal Bônus Equipe:</td>
            <td style="text-align: right;">${formatCurrency(dados.subtotalBonusEquipe)}</td>
          </tr>
        </table>
      </div>

      ${dados.vendasServicos.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">🛠️ COMISSÃO SOBRE SERVIÇOS</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${dados.vendasServicos.map(v => `
            <tr>
              <td style="padding: 5px 0;">Serviço (${dados.percentualComissao}%)</td>
              <td style="text-align: right;">${formatCurrency(v.valor_servico * (dados.percentualComissao / 100))}</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold; border-top: 1px solid #ccc;">
            <td style="padding: 5px 0;">Subtotal Serviços:</td>
            <td style="text-align: right;">${formatCurrency(dados.comissaoServicos)}</td>
          </tr>
        </table>
      </div>
      ` : ''}

      ${dados.metasAtingidas.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">🎯 METAS INDIVIDUAIS</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${dados.metasAtingidas.map(m => `
            <tr>
              <td style="padding: 5px 0;">✅ Meta atingida</td>
              <td style="text-align: right;">${formatCurrency(m.valor_bonus)}</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold; border-top: 1px solid #ccc;">
            <td style="padding: 5px 0;">Subtotal Metas:</td>
            <td style="text-align: right;">${formatCurrency(dados.totalBonusMetas)}</td>
          </tr>
        </table>
      </div>
      ` : ''}

      <div style="margin-top: 30px; padding: 15px; background: #e8f5e9; border-radius: 8px; text-align: center;">
        <h2 style="margin: 0; color: #2e7d32;">TOTAL A RECEBER: ${formatCurrency(dados.totalAReceber)}</h2>
      </div>

      <p style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
        Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
      </p>
    </div>
  `;
}
