import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VendaImportada {
  id: string;
  vendedor: string | null;
  valor_mrr: number;
  intervalo: string | null;
  conta_comissao: boolean;
  conta_faixa: boolean;
  conta_meta: boolean;
}

interface FaixaComissao {
  id: string;
  nome: string;
  mrr_min: number;
  mrr_max: number | null;
  percentual: number;
  ordem: number;
}

interface ConfiguracaoComissao {
  chave: string;
  valor: string;
}

interface MetaMensal {
  id: string;
  mes_referencia: string;
  meta_mrr: number;
  meta_quantidade: number;
  bonus_meta_equipe: number;
  bonus_meta_empresa: number;
  num_colaboradores: number;
  multiplicador_anual: number;
  comissao_venda_unica: number;
}

interface VendedorDados {
  vendedor: string;
  qtd_vendas: number;
  mrr_total: number;
  mrr_comissao: number;
  mrr_anual: number;
  faixa_nome: string | null;
  percentual: number;
  valor_comissao: number;
  bonus_anual: number;
  bonus_meta_equipe: number;
  bonus_empresa: number;
  total_receber: number;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { fechamento_id } = await req.json();

    if (!fechamento_id) {
      throw new Error("fechamento_id é obrigatório");
    }

    console.log(`[calcular-comissoes] Iniciando cálculo para fechamento: ${fechamento_id}`);

    // Passo 1: Buscar fechamento para obter o mês de referência
    const { data: fechamento, error: fechamentoError } = await supabase
      .from("fechamento_comissao")
      .select("mes_referencia")
      .eq("id", fechamento_id)
      .single();

    if (fechamentoError) throw fechamentoError;

    const mesReferencia = fechamento.mes_referencia;
    console.log(`[calcular-comissoes] Mês de referência: ${mesReferencia}`);

    // Passo 2: Buscar dados
    const [vendasResult, faixasResult, configResult, metaMensalResult] = await Promise.all([
      supabase.from("venda_importada").select("*").eq("fechamento_id", fechamento_id),
      supabase.from("faixa_comissao").select("*").eq("ativo", true).order("ordem", { ascending: false }),
      supabase.from("configuracao_comissao").select("*"),
      supabase.from("meta_mensal").select("*").eq("mes_referencia", mesReferencia).maybeSingle(),
    ]);

    if (vendasResult.error) throw vendasResult.error;
    if (faixasResult.error) throw faixasResult.error;
    if (configResult.error) throw configResult.error;

    const vendas = vendasResult.data as VendaImportada[];
    const faixas = faixasResult.data as FaixaComissao[];
    const configuracoes = configResult.data as ConfiguracaoComissao[];
    const metaMensal = metaMensalResult.data as MetaMensal | null;

    console.log(`[calcular-comissoes] Vendas: ${vendas.length}, Faixas: ${faixas.length}`);
    console.log(`[calcular-comissoes] Meta mensal encontrada: ${metaMensal ? "Sim" : "Não (usando padrão)"}`);

    // Parse configurations
    const getConfig = (chave: string): number => {
      const config = configuracoes.find((c) => c.chave === chave);
      return config ? parseFloat(config.valor) : 0;
    };

    // Usar meta mensal se existir, caso contrário usar configuração padrão
    const metaMrr = metaMensal?.meta_mrr ?? getConfig("meta_mrr");
    const metaQuantidade = metaMensal?.meta_quantidade ?? getConfig("meta_quantidade");
    const bonusMetaEquipePercent = (metaMensal?.bonus_meta_equipe ?? getConfig("bonus_meta_equipe")) / 100;
    const bonusMetaEmpresaPercent = (metaMensal?.bonus_meta_empresa ?? getConfig("bonus_meta_empresa")) / 100;
    const numColaboradores = (metaMensal?.num_colaboradores ?? getConfig("num_colaboradores")) || 1;
    const multiplicadorAnual = (metaMensal?.multiplicador_anual ?? getConfig("multiplicador_anual")) || 2;
    const comissaoVendaUnicaPercent = (metaMensal?.comissao_venda_unica ?? getConfig("comissao_venda_unica")) / 100;

    console.log(`[calcular-comissoes] Meta MRR: ${metaMrr}, Meta Qtd: ${metaQuantidade} (${metaMensal ? "meta mensal" : "padrão"})`);
    console.log(`[calcular-comissoes] Bonus Equipe: ${bonusMetaEquipePercent * 100}%, Bonus Empresa: ${bonusMetaEmpresaPercent * 100}%, Colaboradores: ${numColaboradores}`);

    // Passo 2: Agrupar por vendedor
    const vendedoresMap = new Map<string, VendedorDados>();

    for (const venda of vendas) {
      const vendedor = venda.vendedor || "Sem Vendedor";
      
      if (!vendedoresMap.has(vendedor)) {
        vendedoresMap.set(vendedor, {
          vendedor,
          qtd_vendas: 0,
          mrr_total: 0,
          mrr_comissao: 0,
          mrr_anual: 0,
          faixa_nome: null,
          percentual: 0,
          valor_comissao: 0,
          bonus_anual: 0,
          bonus_meta_equipe: 0,
          bonus_empresa: 0,
          total_receber: 0,
        });
      }

      const dados = vendedoresMap.get(vendedor)!;
      dados.qtd_vendas += 1;

      if (venda.conta_faixa) {
        dados.mrr_total += venda.valor_mrr;
      }

      if (venda.conta_comissao) {
        dados.mrr_comissao += venda.valor_mrr;
        
        // Verificar se é venda anual
        const intervalo = venda.intervalo?.toLowerCase().trim() || "";
        if (intervalo === "anual") {
          dados.mrr_anual += venda.valor_mrr;
        }
      }
    }

    console.log(`[calcular-comissoes] Vendedores encontrados: ${vendedoresMap.size}`);

    // Passo 3: Identificar faixa de cada vendedor
    for (const dados of vendedoresMap.values()) {
      // Percorrer faixas da maior para menor ordem (já ordenado desc)
      for (const faixa of faixas) {
        const dentroDoMin = dados.mrr_total >= faixa.mrr_min;
        const dentroDoMax = faixa.mrr_max === null || dados.mrr_total <= faixa.mrr_max;
        
        if (dentroDoMin && dentroDoMax) {
          dados.faixa_nome = faixa.nome;
          dados.percentual = faixa.percentual / 100; // Convert to decimal
          break;
        }
      }

      // Passo 4: Calcular comissão base
      dados.valor_comissao = dados.mrr_comissao * dados.percentual;

      // Passo 5: Calcular bônus venda anual
      dados.bonus_anual = dados.mrr_anual * dados.percentual;
    }

    // Passo 6: Verificar meta da empresa
    let totalMrrEmpresa = 0;
    let totalQtdEmpresa = 0;

    for (const venda of vendas) {
      if (venda.conta_meta) {
        totalMrrEmpresa += venda.valor_mrr;
        totalQtdEmpresa += 1;
      }
    }

    const metaBatida = totalMrrEmpresa >= metaMrr && totalQtdEmpresa >= metaQuantidade;
    
    console.log(`[calcular-comissoes] Total MRR Empresa: ${totalMrrEmpresa}, Total Qtd: ${totalQtdEmpresa}`);
    console.log(`[calcular-comissoes] Meta batida: ${metaBatida}`);

    // Passo 7 e 8: Calcular bônus se meta batida
    if (metaBatida) {
      // Calcular soma total de mrr_comissao para proporção
      let somaMrrEquipe = 0;
      for (const dados of vendedoresMap.values()) {
        somaMrrEquipe += dados.mrr_comissao;
      }

      for (const dados of vendedoresMap.values()) {
        // Passo 7: Bônus meta equipe (proporcional)
        if (somaMrrEquipe > 0) {
          const proporcao = dados.mrr_comissao / somaMrrEquipe;
          dados.bonus_meta_equipe = totalMrrEmpresa * bonusMetaEquipePercent * proporcao;
        }

        // Passo 8: Bônus empresa (igual para todos)
        dados.bonus_empresa = (totalMrrEmpresa * bonusMetaEmpresaPercent) / numColaboradores;
      }
    }

    // Passo 9: Total a receber
    for (const dados of vendedoresMap.values()) {
      dados.total_receber = dados.valor_comissao + dados.bonus_anual + dados.bonus_meta_equipe + dados.bonus_empresa;
    }

    // Passo 10: Salvar em comissao_calculada
    // Primeiro, deletar cálculos anteriores deste fechamento
    const { error: deleteError } = await supabase
      .from("comissao_calculada")
      .delete()
      .eq("fechamento_id", fechamento_id);

    if (deleteError) {
      console.error("[calcular-comissoes] Erro ao deletar cálculos anteriores:", deleteError);
    }

    // Inserir novos cálculos
    const comissoesParaInserir = Array.from(vendedoresMap.values()).map((dados) => ({
      fechamento_id,
      vendedor: dados.vendedor,
      qtd_vendas: dados.qtd_vendas,
      mrr_total: dados.mrr_total,
      mrr_comissao: dados.mrr_comissao,
      faixa_nome: dados.faixa_nome,
      percentual: dados.percentual * 100, // Save as percentage
      valor_comissao: dados.valor_comissao,
      bonus_anual: dados.bonus_anual,
      bonus_meta_equipe: dados.bonus_meta_equipe,
      bonus_empresa: dados.bonus_empresa,
      total_receber: dados.total_receber,
    }));

    const { error: insertError } = await supabase
      .from("comissao_calculada")
      .insert(comissoesParaInserir);

    if (insertError) throw insertError;

    console.log(`[calcular-comissoes] Inseridas ${comissoesParaInserir.length} comissões`);

    // Atualizar fechamento
    const { error: updateError } = await supabase
      .from("fechamento_comissao")
      .update({
        total_vendas: vendas.length,
        total_mrr: totalMrrEmpresa,
        meta_batida: metaBatida,
      })
      .eq("id", fechamento_id);

    if (updateError) throw updateError;

    console.log(`[calcular-comissoes] Fechamento atualizado com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Comissões calculadas com sucesso",
        data: {
          total_vendedores: vendedoresMap.size,
          total_vendas: vendas.length,
          total_mrr: totalMrrEmpresa,
          meta_batida: metaBatida,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[calcular-comissoes] Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
