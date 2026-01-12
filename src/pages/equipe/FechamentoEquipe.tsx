import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
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
  AlertCircle,
  FileText,
  RefreshCw,
  Settings,
  CheckCircle, // Adicionado
  XCircle, // Adicionado
} from "lucide-react";
import { format, startOfMonth, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FechamentoConfigModal } from "@/components/equipe/FechamentoConfigModal";
import { FechamentoAjusteModal } from "@/components/equipe/FechamentoAjusteModal";
import { FechamentoAjustesList } from "@/components/equipe/FechamentoAjustesList";
import { FechamentoDemonstrativoModal } from "@/components/equipe/FechamentoDemonstrativoModal";
import { gerarDemonstrativoHTML } from "@/lib/fechamentoEquipeUtils";

// --- Interfaces (Mantidas aqui para centralizar a tipagem complexa) ---

interface FechamentoEquipe {
  id: string;
  mes_referencia: string;
  assinaturas_inicio_mes: number | null;
  vendas_mes: number | null;
  cancelamentos_mes: number | null;
  churn_rate: number | null;
  mrr_mes: number | null;
  mrr_base_comissao: number | null;
  total_comissoes_vendedores: number | null;
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

interface AjusteFechamentoEquipe {
  id: string;
  fechamento_equipe_id: string;
  colaborador_id: string | null;
  tipo: string;
  valor: number;
  descricao: string;
  created_at: string;
}

interface ConfiguracaoBase {
  assinaturasInicioMes: number;
  cancelamentosMes: number;
  limiteChurn: number;
  limiteCancelamentos: number;
  percentualBonusChurn: number;
  percentualBonusRetencao: number;
  percentualBonusMeta: number;
  metaVendas: number;
}

interface MetaMensal {
  assinaturas_inicio_mes: number | null;
  limite_churn: number | null;
  limite_cancelamentos: number | null;
  percentual_bonus_churn: number | null;
  percentual_bonus_retencao: number | null;
  bonus_meta_equipe: number | null;
  meta_quantidade: number | null;
  colaboradores_bonus_meta: string[] | null;
}

interface DadosCalculo {
  colaboradores: Colaborador[] | null;
  todosColaboradoresAtivos: Colaborador[] | null;
  colaboradoresBonusMeta: Colaborador[] | null;
  meta: MetaMensal | null;
  fechamentoComissao: {
    id: string;
    total_mrr: number | null;
    total_vendas: number | null;
    meta_batida: boolean;
  } | null;
  vendasServicos: any[];
  metasIndividuais: any[];
  mrrBaseComissao: number;
  totalComissoesVendedores: number;
  qtdVendasRecorrentes: number;
}

// --- Componente Principal ---

export default function FechamentoEquipe() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const mesParam = searchParams.get("mes");
  const [mesReferencia, setMesReferencia] = useState(mesParam || format(new Date(), "yyyy-MM"));
  const [isCalculando, setIsCalculando] = useState(false);
  const [demonstrativoModal, setDemonstrativoModal] = useState<{
    open: boolean;
    colaborador: FechamentoColaborador | null;
  }>({ open: false, colaborador: null });
  const [configModal, setConfigModal] = useState(false);
  const [ajusteModal, setAjusteModal] = useState(false);
  const [novoAjuste, setNovoAjuste] = useState({
    colaborador_id: "",
    tipo: "credito" as "credito" | "debito",
    valor: 0,
    descricao: "",
  });
  const [configBase, setConfigBase] = useState<ConfiguracaoBase>({
    assinaturasInicioMes: 0,
    cancelamentosMes: 0,
    limiteChurn: 5,
    limiteCancelamentos: 50,
    percentualBonusChurn: 3,
    percentualBonusRetencao: 3,
    percentualBonusMeta: 10,
    metaVendas: 0,
  });

  const mesReferenciaDate = startOfMonth(parse(mesReferencia, "yyyy-MM", new Date()));

  // --- Data Fetching ---

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

  const { data: ajustes = [], refetch: refetchAjustes } = useQuery({
    queryKey: ["ajustes-fechamento-equipe", fechamento?.id],
    queryFn: async () => {
      if (!fechamento?.id) return [];
      const { data, error } = await supabase
        .from("ajuste_fechamento_equipe")
        .select("*")
        .eq("fechamento_equipe_id", fechamento.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AjusteFechamentoEquipe[];
    },
    enabled: !!fechamento?.id,
  });

  const { data: todosColaboradores = [] } = useQuery({
    queryKey: ["colaboradores-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: dadosCalculo } = useQuery({
    queryKey: ["dados-calculo-fechamento", mesReferencia],
    queryFn: async () => {
      // Buscar colaboradores participantes do fechamento de equipe
      const { data: colaboradores } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo, salario_base, percentual_comissao")
        .eq("ativo", true)
        .eq("participa_fechamento_equipe", true);

      // Buscar TODOS os colaboradores ativos (incluindo vendedores) para o bônus de meta
      const { data: todosColaboradoresAtivos } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo, salario_base, percentual_comissao")
        .eq("ativo", true);

      // Buscar meta do mês (com parâmetros de fechamento)
      const { data: meta } = await supabase
        .from("meta_mensal")
        .select("*")
        .eq("mes_referencia", format(mesReferenciaDate, "yyyy-MM-dd"))
        .maybeSingle();

      // Buscar fechamento de comissão (vendedores)
      const { data: fechamentoComissao } = await supabase
        .from("fechamento_comissao")
        .select("id, total_vendas, total_mrr, meta_batida")
        .eq("mes_referencia", format(mesReferenciaDate, "yyyy-MM-dd"))
        .maybeSingle();

      // Buscar comissões calculadas para obter MRR base comissão
      let mrrBaseComissao = 0;
      let totalComissoesVendedores = 0;
      if (fechamentoComissao?.id) {
        const { data: comissoes } = await supabase
          .from("comissao_calculada")
          .select("mrr_comissao, total_receber")
          .eq("fechamento_id", fechamentoComissao.id);
        
        if (comissoes) {
          mrrBaseComissao = comissoes.reduce((sum, c) => sum + c.mrr_comissao, 0);
          totalComissoesVendedores = comissoes.reduce((sum, c) => sum + c.total_receber, 0);
        }
      }

      // Buscar vendas de serviços aprovadas
      const { data: vendasServicos } = await supabase
        .from("vendas_servicos")
        .select("colaborador_id, valor_servico, cliente, descricao_servico")
        .eq("mes_referencia", format(mesReferenciaDate, "yyyy-MM-dd"))
        .eq("status", "aprovado");

      // Buscar metas individuais atingidas
      const { data: metasIndividuais } = await supabase
        .from("metas_individuais")
        .select("colaborador_id, valor_bonus, tipo_bonus, atingida, colaboradores(salario_base)")
        .eq("mes_referencia", format(mesReferenciaDate, "yyyy-MM-dd"));

      // Contar apenas vendas recorrentes
      let qtdVendasRecorrentes = 0;
      if (fechamentoComissao?.id) {
        const { data: vendas, count } = await supabase
          .from("venda_importada")
          .select("*", { count: "exact", head: true })
          .eq("fechamento_id", fechamentoComissao.id)
          .not("intervalo", "ilike", "%única%")
          .neq("intervalo", "Venda Única");
        
        qtdVendasRecorrentes = count || 0;
      }

      // Determinar quem participa do bônus de meta
      // Se meta tem colaboradores_bonus_meta definidos, usar essa lista
      // Caso contrário, usar todos os colaboradores ativos
      let colaboradoresBonusMeta = todosColaboradoresAtivos || [];
      if (meta?.colaboradores_bonus_meta && meta.colaboradores_bonus_meta.length > 0) {
        colaboradoresBonusMeta = (todosColaboradoresAtivos || []).filter(c => 
          meta.colaboradores_bonus_meta.includes(c.id)
        );
      }

      return {
        colaboradores: colaboradores as Colaborador[] || [],
        todosColaboradoresAtivos: todosColaboradoresAtivos as Colaborador[] || [],
        colaboradoresBonusMeta: colaboradoresBonusMeta as Colaborador[] || [],
        meta: meta as MetaMensal | null,
        fechamentoComissao: fechamentoComissao as DadosCalculo['fechamentoComissao'],
        vendasServicos: vendasServicos || [],
        metasIndividuais: metasIndividuais || [],
        mrrBaseComissao,
        totalComissoesVendedores,
        qtdVendasRecorrentes,
      } as DadosCalculo;
    },
  });

  // Update configBase when data changes
  useEffect(() => {
    const meta = dadosCalculo?.meta;
    setConfigBase({
      assinaturasInicioMes: meta?.assinaturas_inicio_mes || fechamento?.assinaturas_inicio_mes || 0,
      cancelamentosMes: fechamento?.cancelamentos_mes || 0,
      limiteChurn: meta?.limite_churn || fechamento?.limite_churn || 5,
      limiteCancelamentos: meta?.limite_cancelamentos || fechamento?.limite_cancelamentos || 50,
      percentualBonusChurn: meta?.percentual_bonus_churn || fechamento?.percentual_bonus_churn || 3,
      percentualBonusRetencao: meta?.percentual_bonus_retencao || fechamento?.percentual_bonus_retencao || 3,
      percentualBonusMeta: meta?.bonus_meta_equipe || fechamento?.percentual_bonus_meta || 10,
      metaVendas: meta?.meta_quantidade || fechamento?.meta_vendas || 0,
    });
  }, [fechamento, dadosCalculo]);

  // --- Mutations ---

  const salvarConfigMutation = useMutation({
    mutationFn: async () => {
      // Logic to save config (omitted for brevity, already in FechamentoConfigModal)
      // ... (implementation details remain the same)
      if (!fechamento?.id) {
        const { data, error } = await supabase
          .from("fechamento_equipe")
          .insert({
            mes_referencia: format(mesReferenciaDate, "yyyy-MM-dd"),
            assinaturas_inicio_mes: configBase.assinaturasInicioMes,
            cancelamentos_mes: configBase.cancelamentosMes,
            limite_churn: configBase.limiteChurn,
            limite_cancelamentos: configBase.limiteCancelamentos,
            percentual_bonus_churn: configBase.percentualBonusChurn,
            percentual_bonus_retencao: configBase.percentualBonusRetencao,
            percentual_bonus_meta: configBase.percentualBonusMeta,
            meta_vendas: configBase.metaVendas,
            status: "rascunho",
          })
          .select("id")
          .single();
        if (error) throw error;
        return data;
      } else {
        const { error } = await supabase
          .from("fechamento_equipe")
          .update({
            assinaturas_inicio_mes: configBase.assinaturasInicioMes,
            cancelamentos_mes: configBase.cancelamentosMes,
            limite_churn: configBase.limiteChurn,
            limite_cancelamentos: configBase.limiteCancelamentos,
            percentual_bonus_churn: configBase.percentualBonusChurn,
            percentual_bonus_retencao: configBase.percentualBonusRetencao,
            percentual_bonus_meta: configBase.percentualBonusMeta,
            meta_vendas: configBase.metaVendas,
          })
          .eq("id", fechamento.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamento-equipe"] });
      refetchFechamento();
      setConfigModal(false);
      toast.success("Configuração salva com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar configuração: " + error.message);
    },
  });

  const addAjusteMutation = useMutation({
    mutationFn: async () => {
      if (!fechamento?.id) throw new Error("Fechamento não encontrado");
      const { error } = await supabase.from("ajuste_fechamento_equipe").insert({
        fechamento_equipe_id: fechamento.id,
        colaborador_id: novoAjuste.colaborador_id || null,
        tipo: novoAjuste.tipo,
        valor: novoAjuste.valor,
        descricao: novoAjuste.descricao,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchAjustes();
      setAjusteModal(false);
      setNovoAjuste({ colaborador_id: "", tipo: "credito", valor: 0, descricao: "" });
      toast.success("Ajuste adicionado!");
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const deleteAjusteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ajuste_fechamento_equipe").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchAjustes();
      toast.success("Ajuste removido!");
    },
  });

  const calcularMutation = useMutation({
    mutationFn: async () => {
      setIsCalculando(true);

      if (!dadosCalculo?.fechamentoComissao?.id) {
        throw new Error("Não existe fechamento de comissão para este mês. Importe as vendas primeiro.");
      }
      if (!dadosCalculo?.colaboradores?.length) {
        throw new Error("Nenhum colaborador participante encontrado");
      }

      const colaboradores = dadosCalculo.colaboradores;
      const todosColaboradoresAtivos = dadosCalculo.todosColaboradoresAtivos || [];
      const meta = dadosCalculo.meta;
      const fechamentoComissao = dadosCalculo.fechamentoComissao;
      const vendasServicos = dadosCalculo.vendasServicos;
      const metasIndividuais = dadosCalculo.metasIndividuais;

      const assinaturasInicioMes = meta?.assinaturas_inicio_mes || configBase.assinaturasInicioMes || fechamento?.assinaturas_inicio_mes || 0;
      const cancelamentosMes = configBase.cancelamentosMes || fechamento?.cancelamentos_mes || 0;
      const vendasMes = dadosCalculo.qtdVendasRecorrentes || 0;
      const mrrMes = fechamentoComissao?.total_mrr || 0;
      const mrrBaseComissao = dadosCalculo.mrrBaseComissao || 0;
      const totalComissoesVendedores = dadosCalculo.totalComissoesVendedores || 0;
      const metaVendas = meta?.meta_quantidade || configBase.metaVendas || fechamento?.meta_vendas || 0;

      const limiteChurn = meta?.limite_churn || configBase.limiteChurn || 5;
      const limiteCancelamentos = meta?.limite_cancelamentos || configBase.limiteCancelamentos || 50;
      const percentualBonusChurn = meta?.percentual_bonus_churn || configBase.percentualBonusChurn || 3;
      const percentualBonusRetencao = meta?.percentual_bonus_retencao || configBase.percentualBonusRetencao || 3;
      const percentualBonusMeta = meta?.bonus_meta_equipe || configBase.percentualBonusMeta || 10;

      const churnRate = assinaturasInicioMes > 0 ? (cancelamentosMes / assinaturasInicioMes) * 100 : 0;
      const taxaCancelamentos = vendasMes > 0 ? (cancelamentosMes / vendasMes) * 100 : 0;
      const percentualMeta = metaVendas > 0 ? (vendasMes / metaVendas) * 100 : 0;

      const bonusChurnLiberado = churnRate < limiteChurn;
      const bonusRetencaoLiberado = taxaCancelamentos < limiteCancelamentos;
      const bonusMetaLiberado = percentualMeta >= 100;

      const colaboradoresBonusMeta = dadosCalculo.colaboradoresBonusMeta || todosColaboradoresAtivos;
      const totalColaboradoresParaBonusMeta = colaboradoresBonusMeta.length;
      const valorBonusMetaTotal = bonusMetaLiberado ? mrrBaseComissao * (percentualBonusMeta / 100) : 0;
      const valorBonusMetaIndividual = totalColaboradoresParaBonusMeta > 0 
        ? valorBonusMetaTotal / totalColaboradoresParaBonusMeta 
        : 0;

      const fechamentoData = {
        mes_referencia: format(mesReferenciaDate, "yyyy-MM-dd"),
        assinaturas_inicio_mes: assinaturasInicioMes,
        vendas_mes: vendasMes,
        cancelamentos_mes: cancelamentosMes,
        churn_rate: churnRate,
        mrr_mes: mrrMes,
        mrr_base_comissao: mrrBaseComissao,
        total_comissoes_vendedores: totalComissoesVendedores,
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
        total_colaboradores_participantes: totalColaboradoresParaBonusMeta,
        valor_bonus_meta_individual: valorBonusMetaIndividual,
        status: "calculado",
        calculado_em: new Date().toISOString(),
      };

      let fechamentoId: string;

      if (fechamento?.id) {
        const { error } = await supabase.from("fechamento_equipe").update(fechamentoData).eq("id", fechamento.id);
        if (error) throw error;
        fechamentoId = fechamento.id;
        await supabase.from("fechamento_colaborador").delete().eq("fechamento_equipe_id", fechamento.id);
      } else {
        const { data, error } = await supabase.from("fechamento_equipe").insert(fechamentoData).select("id").single();
        if (error) throw error;
        fechamentoId = data.id;
      }

      for (const colab of colaboradores) {
        const bonusChurn = bonusChurnLiberado ? colab.salario_base * (percentualBonusChurn / 100) : 0;
        const bonusRetencao = bonusRetencaoLiberado ? colab.salario_base * (percentualBonusRetencao / 100) : 0;
        const bonusMetaEquipe = bonusMetaLiberado ? valorBonusMetaIndividual : 0;
        const subtotalBonusEquipe = bonusChurn + bonusRetencao + bonusMetaEquipe;

        const vendasColaborador = vendasServicos.filter(v => v.colaborador_id === colab.id);
        const totalVendasServicos = vendasColaborador.reduce((sum, v) => sum + v.valor_servico, 0);
        const comissaoServicos = totalVendasServicos * ((colab.percentual_comissao || 10) / 100);

        const metasColab = metasIndividuais.filter(m => m.colaborador_id === colab.id);
        const metasAtingidas = metasColab.filter(m => m.atingida);
        const totalBonusMetas = metasAtingidas.reduce((sum, m) => {
          if (m.tipo_bonus === "percentual") {
            const salario = (m.colaboradores as any)?.salario_base || colab.salario_base;
            return sum + (salario * (m.valor_bonus / 100));
          }
          return sum + m.valor_bonus;
        }, 0);

        const totalAReceber = subtotalBonusEquipe + comissaoServicos + totalBonusMetas;

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
          mrrBaseComissao,
          percentualBonusMeta,
          percentualBonusChurn,
          percentualBonusRetencao,
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

  // --- Utility Functions ---

  const formatCurrency = (value: number | null) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const formatPercent = (value: number | null) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  // --- Totals Calculation ---

  const totalAjustesCredito = ajustes.filter(a => a.tipo === "credito").reduce((sum, a) => sum + a.valor, 0);
  const totalAjustesDebito = ajustes.filter(a => a.tipo === "debito").reduce((sum, a) => sum + a.valor, 0);
  const totalAjustes = totalAjustesCredito - totalAjustesDebito;

  const totais = colaboradoresFechamento?.reduce(
    (acc, c) => ({
      bonusEquipe: acc.bonusEquipe + (c.subtotal_bonus_equipe || 0),
      servicos: acc.servicos + (c.comissao_servicos || 0),
      metas: acc.metas + (c.total_bonus_metas_individuais || 0),
      total: acc.total + (c.total_a_receber || 0),
    }),
    { bonusEquipe: 0, servicos: 0, metas: 0, total: 0 }
  ) || { bonusEquipe: 0, servicos: 0, metas: 0, total: 0 };

  const totalGeralComAjustes = totais.total + totalAjustes + (fechamento?.total_comissoes_vendedores || 0);

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
          {dadosCalculo?.fechamentoComissao?.id && (
            <>
              <Button variant="outline" onClick={() => setConfigModal(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Configurar
              </Button>
              <Button onClick={() => calcularMutation.mutate()} disabled={isCalculando}>
                {isCalculando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Recalcular
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoadingFechamento ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !dadosCalculo?.fechamentoComissao?.id ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Fechamento de Comissão Não Encontrado</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Para calcular o fechamento de equipe de{" "}
              <strong>{format(mesReferenciaDate, "MMMM/yyyy", { locale: ptBR })}</strong>, 
              é necessário primeiro importar as vendas e criar o fechamento de comissão.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/comissoes"}>
              <FileText className="mr-2 h-4 w-4" />
              Ir para Fechamento de Comissão
            </Button>
          </CardContent>
        </Card>
      ) : !fechamento ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum fechamento de equipe encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Fechamento de comissão encontrado para{" "}
              {format(mesReferenciaDate, "MMMM/yyyy", { locale: ptBR })}. 
              Clique em "Calcular" para gerar o fechamento de equipe.
            </p>
            <div className="text-sm text-center mb-4 p-3 bg-muted rounded-lg">
              <p><strong>MRR Total:</strong> {formatCurrency(dadosCalculo.fechamentoComissao.total_mrr || 0)}</p>
              <p><strong>Total de Vendas:</strong> {dadosCalculo.fechamentoComissao.total_vendas || 0}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfigModal(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Configurar Parâmetros
              </Button>
              <Button onClick={() => calcularMutation.mutate()} disabled={isCalculando}>
                {isCalculando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="mr-2 h-4 w-4" />
                )}
                Calcular Fechamento
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Métricas do Mês - Grid expandido */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas do Mês</CardTitle>
              <CardDescription>
                {format(mesReferenciaDate, "MMMM/yyyy", { locale: ptBR })} - Dados do fechamento de comissões + configuração manual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Clientes Início</p>
                  <p className="text-2xl font-bold">{fechamento.assinaturas_inicio_mes || 0}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Vendas Recorrentes</p>
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
                <div className="text-center p-4 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg border border-cyan-200">
                  <p className="text-sm text-cyan-700 dark:text-cyan-400">MRR Base Comissão</p>
                  <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">{formatCurrency(fechamento.mrr_base_comissao)}</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 dark:text-green-400">Comissões Vendedores</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(fechamento.total_comissoes_vendedores)}</p>
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
                    ? "border-green-500 bg-green-50 dark:bg-green-950/30" 
                    : "border-red-500 bg-red-50 dark:bg-red-950/30"
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
                    ? "border-green-500 bg-green-50 dark:bg-green-950/30" 
                    : "border-red-500 bg-red-50 dark:bg-red-950/30"
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
                    Taxa Cancelamentos: {fechamento.vendas_mes && fechamento.vendas_mes > 0 
                      ? ((fechamento.cancelamentos_mes || 0) / fechamento.vendas_mes * 100).toFixed(1) 
                      : "0"}% (limite: &lt;{fechamento.limite_cancelamentos}%)
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {fechamento.bonus_retencao_liberado 
                      ? `${fechamento.percentual_bonus_retencao}% do salário → LIBERADO` 
                      : "NÃO LIBERADO"}
                  </p>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  fechamento.bonus_meta_liberado 
                    ? "border-green-500 bg-green-50 dark:bg-green-950/30" 
                    : "border-red-500 bg-red-50 dark:bg-red-950/30"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {fechamento.bonus_meta_liberado ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">Bônus Meta</span>
                    {/* Indicador visual de participantes */}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {fechamento.total_colaboradores_participantes} participantes
                    </Badge>
                  </div>
                  <p className="text-sm">
                    Meta {formatPercent(fechamento.percentual_meta)} ({fechamento.vendas_mes}/{fechamento.meta_vendas})
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {fechamento.bonus_meta_liberado 
                      ? `${fechamento.percentual_bonus_meta}% MRR ÷ ${fechamento.total_colaboradores_participantes} = ${formatCurrency(fechamento.valor_bonus_meta_individual)}` 
                      : "NÃO LIBERADO"}
                  </p>
                  {/* Lista de participantes */}
                  {dadosCalculo?.colaboradoresBonusMeta && dadosCalculo.colaboradoresBonusMeta.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-dashed">
                      <p className="text-xs text-muted-foreground mb-1">
                        {dadosCalculo.meta?.colaboradores_bonus_meta?.length 
                          ? "Colaboradores selecionados:" 
                          : "Todos colaboradores ativos:"}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {dadosCalculo.colaboradoresBonusMeta.slice(0, 5).map((colab) => (
                          <Badge key={colab.id} variant="outline" className="text-xs py-0">
                            {colab.nome.split(' ')[0]}
                          </Badge>
                        ))}
                        {dadosCalculo.colaboradoresBonusMeta.length > 5 && (
                          <Badge variant="outline" className="text-xs py-0">
                            +{dadosCalculo.colaboradoresBonusMeta.length - 5} mais
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demonstrativos e Ajustes */}
          <Tabs defaultValue="demonstrativos" className="w-full">
            <TabsList>
              <TabsTrigger value="demonstrativos">Demonstrativos Individuais</TabsTrigger>
              <TabsTrigger value="ajustes">
                Ajustes Manuais
                {ajustes.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{ajustes.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="demonstrativos">
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ajustes">
              <FechamentoAjustesList
                ajustes={ajustes}
                todosColaboradores={todosColaboradores as any}
                onAddAjuste={() => setAjusteModal(true)}
                deleteAjusteMutation={deleteAjusteMutation as any}
              />
            </TabsContent>
          </Tabs>

          {/* Resumo Geral */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>💰 Resumo Geral do Fechamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-muted-foreground">Comissões Vendedores</p>
                  <p className="font-bold text-lg">{formatCurrency(fechamento.total_comissoes_vendedores)}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-muted-foreground">Bônus Equipe</p>
                  <p className="font-bold text-lg">{formatCurrency(totais.bonusEquipe)}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-muted-foreground">Serviços</p>
                  <p className="font-bold text-lg">{formatCurrency(totais.servicos)}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-muted-foreground">Metas Individuais</p>
                  <p className="font-bold text-lg">{formatCurrency(totais.metas)}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-muted-foreground">Ajustes</p>
                  <p className={`font-bold text-lg ${totalAjustes >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(totalAjustes)}
                  </p>
                </div>
                <div className="p-3 bg-primary text-primary-foreground rounded-lg">
                  <p className="opacity-80">TOTAL GERAL</p>
                  <p className="font-bold text-2xl">{formatCurrency(totalGeralComAjustes)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal Configuração */}
      <FechamentoConfigModal
        open={configModal}
        onOpenChange={setConfigModal}
        configBase={configBase}
        setConfigBase={setConfigBase}
        dadosCalculo={dadosCalculo}
        fechamento={fechamento}
        salvarConfigMutation={salvarConfigMutation}
      />

      {/* Modal Ajuste */}
      <FechamentoAjusteModal
        open={ajusteModal}
        onOpenChange={setAjusteModal}
        novoAjuste={novoAjuste}
        setNovoAjuste={setNovoAjuste}
        todosColaboradores={todosColaboradores as any}
        addAjusteMutation={addAjusteMutation}
      />

      {/* Modal Demonstrativo */}
      <FechamentoDemonstrativoModal
        open={demonstrativoModal.open}
        onOpenChange={(open) => setDemonstrativoModal({ open, colaborador: null })}
        colaborador={demonstrativoModal.colaborador}
      />
    </div>
  );
}