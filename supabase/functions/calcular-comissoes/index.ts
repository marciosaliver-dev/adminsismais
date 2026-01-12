// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VendaImportada {
  id: string;
  vendedor: string | null;
  valor_mrr: number;
  valor_adesao: number;
  intervalo: string | null;
  tipo_venda: string | null;
  conta_comissao: boolean;
  conta_faixa: boolean;
  conta_meta: boolean;
}

const isVendaRecorrente = (venda: VendaImportada): boolean => {
  const tipoVenda = venda.tipo_venda?.toLowerCase() || "";
  const intervalo = venda.intervalo?.toLowerCase() || "";
  const isVendaUnica = tipoVenda.includes("única") || tipoVenda.includes("unica") || 
                       intervalo.includes("única") || intervalo.includes("unica") ||
                       tipoVenda === "venda única" || intervalo === "venda única";
  const isServico = tipoVenda.includes("serviço") || tipoVenda.includes("servico");
  return !isVendaUnica && !isServico;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[calcular-comissoes] Unauthorized access attempt", { authError });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Security Check: Verify if user is approved
    const { data: profile } = await supabase
      .from('profiles')
      .select('aprovado')
      .eq('user_id', user.id)
      .single();

    if (!profile?.aprovado) {
      console.error("[calcular-comissoes] User not approved", { userId: user.id });
      return new Response(JSON.stringify({ error: 'Acesso negado. Sua conta aguarda aprovação.' }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { fechamento_id } = await req.json();

    if (!fechamento_id) {
      throw new Error("fechamento_id é obrigatório");
    }

    console.log(`[calcular-comissoes] Iniciando cálculo para fechamento: ${fechamento_id}`);

    const { data: fechamento, error: fechamentoError } = await supabase
      .from("fechamento_comissao")
      .select("mes_referencia")
      .eq("id", fechamento_id)
      .single();

    if (fechamentoError) throw fechamentoError;

    const mesReferencia = fechamento.mes_referencia;

    const [vendasResult, faixasResult, configResult, metaMensalResult] = await Promise.all([
      supabase.from("venda_importada").select("*").eq("fechamento_id", fechamento_id),
      supabase.from("faixa_comissao").select("*").eq("ativo", true).order("ordem", { ascending: false }),
      supabase.from("configuracao_comissao").select("*"),
      supabase.from("meta_mensal").select("*").eq("mes_referencia", mesReferencia).maybeSingle(),
    ]);

    if (vendasResult.error) throw vendasResult.error;
    if (faixasResult.error) throw faixasResult.error;
    if (configResult.error) throw configResult.error;

    const vendas = vendasResult.data;
    const faixas = faixasResult.data;
    const configuracoes = configResult.data;
    const metaMensal = metaMensalResult.data;

    const heartbeat = (chave: string): number => {
      const config = configuracoes.find((c) => c.chave === heartbeat);
      return config ? parseFloat(config.valor) : 0;
    };

    const metaMrr = metaMensal?.meta_mrr ?? heartbeat("meta_mrr");
    const metaQuantidade = metaMensal?.meta_quantidade ?? heartbeat("meta_quantidade");
    const bonusMetaEquipePercent = (metaMensal?.bonus_meta_equipe ?? heartbeat("bonus_meta_equipe")) / 100;
    const bonusMetaEmpresaPercent = (metaMensal?.bonus_meta_empresa ?? heartbeat("bonus_meta_empresa")) / 100;
    const numColaboradores = (metaMensal?.num_colaboradores ?? heartbeat("num_colaboradores")) || 1;
    const comissaoVendaUnicaPercent = (metaMensal?.comissao_venda_unica ?? heartbeat("comissao_venda_unica")) / 100;

    const vendedoresMap = new Map();

    for (const venda of vendas) {
      const vendedor = venda.vendedor || "Sem Vendedor";
      if (!vendedoresMap.has(vendedor)) {
        vendedoresMap.set(vendedor, {
          vendedor,
          qtd_vendas: 0,
          mrr_total: 0,
          mrr_comissao: 0,
          mrr_anual: 0,
          total_adesao: 0,
          faixa_nome: null,
          percentual: 0,
          valor_comissao: 0,
          bonus_anual: 0,
          bonus_meta_equipe: 0,
          bonus_empresa: 0,
          comissao_venda_unica: 0,
          total_receber: 0,
        });
      }

      const dados = vendedoresMap.get(vendedor);
      if (isVendaRecorrente(venda)) {
        dados.qtd_vendas += 1;
      }
      if (venda.conta_faixa) dados.mrr_total += venda.valor_mrr;
      if (venda.conta_comissao) {
        const intervalo = venda.intervalo?.toLowerCase().trim() || "";
        if (intervalo === "venda única") {
          dados.total_adesao += venda.valor_adesao || 0;
        } else {
          dados.mrr_comissao += venda.valor_mrr;
          dados.total_adesao += venda.valor_adesao || 0;
          if (intervalo === "anual") dados.mrr_anual += venda.valor_mrr;
        }
      }
    }

    for (const dados of vendedoresMap.values()) {
      for (const faixa of faixas) {
        if (dados.mrr_total >= faixa.mrr_min && (faixa.mrr_max === null || dados.mrr_total <= faixa.mrr_max)) {
          dados.faixa_nome = faixa.nome;
          dados.percentual = faixa.percentual / 100;
          break;
        }
      }
      dados.valor_comissao = dados.mrr_comissao * dados.percentual;
      dados.bonus_anual = dados.mrr_anual * dados.percentual;
      dados.comissao_venda_unica = dados.total_adesao * comissaoVendaUnicaPercent;
    }

    let totalMrrEmpresa = 0;
    let totalQtdEmpresa = 0;
    for (const venda of vendas) {
      if (venda.conta_meta) {
        totalMrrEmpresa += venda.valor_mrr;
        if (isVendaRecorrente(venda)) totalQtdEmpresa += 1;
      }
    }

    const metaBatida = totalMrrEmpresa >= metaMrr && totalQtdEmpresa >= metaQuantidade;
    if (metaBatida) {
      let somaMrrTotal = 0;
      let somaMrrComissao = 0;
      for (const dados of vendedoresMap.values()) {
        somaMrrTotal += dados.mrr_total;
        somaMrrComissao += dados.mrr_comissao;
      }
      const poolBonusEquipe = somaMrrComissao * bonusMetaEquipePercent;
      for (const dados of vendedoresMap.values()) {
        if (somaMrrTotal > 0) dados.bonus_meta_equipe = poolBonusEquipe * (dados.mrr_total / somaMrrTotal);
        dados.bonus_empresa = (somaMrrComissao * bonusMetaEmpresaPercent) / numColaboradores;
      }
    }

    for (const dados of vendedoresMap.values()) {
      dados.total_receber = dados.valor_comissao + dados.bonus_anual + dados.bonus_meta_equipe + dados.bonus_empresa + dados.comissao_venda_unica;
    }

    await supabase.from("comissao_calculada").delete().eq("fechamento_id", fechamento_id);
    const comissoesParaInserir = Array.from(vendedoresMap.values()).map((dados) => ({
      fechamento_id,
      vendedor: dados.vendedor,
      qtd_vendas: dados.qtd_vendas,
      mrr_total: dados.mrr_total,
      mrr_comissao: dados.mrr_comissao,
      faixa_nome: dados.faixa_nome,
      percentual: dados.percentual * 100,
      valor_comissao: dados.valor_comissao,
      bonus_anual: dados.bonus_anual,
      bonus_meta_equipe: dados.bonus_meta_equipe,
      bonus_empresa: dados.bonus_empresa,
      comissao_venda_unica: dados.comissao_venda_unica,
      total_receber: dados.total_receber,
    }));

    await supabase.from("comissao_calculada").insert(comissoesParaInserir);
    await supabase.from("fechamento_comissao").update({
      total_vendas: vendas.filter(v => isVendaRecorrente(v)).length,
      total_mrr: totalMrrEmpresa,
      meta_batida: metaBatida,
    }).eq("id", fechamento_id);

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});