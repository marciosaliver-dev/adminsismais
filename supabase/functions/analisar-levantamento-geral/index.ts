// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // ATENÇÃO: Adicione GEMINI_API_KEY nos Secrets do Supabase
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || "");

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Buscar todas as respostas
    const { data: respostas, error: fetchError } = await supabase
      .from("levantamento_operacional_2024")
      .select("*");

    if (fetchError) throw fetchError;

    if (!respostas || respostas.length === 0) {
      return new Response(JSON.stringify({ report: "Não há dados suficientes para gerar o relatório." }), { status: 200, headers: corsHeaders });
    }

    // Preparar dados para o Gemini
    // Gemini 1.5 Flash aguenta muito contexto, então enviamos mais detalhes
    const dadosCompletos = respostas.map(r => ({
      colaborador: r.colaborador_nome,
      funcao: r.funcao_atual,
      nota_satisfacao: r.satisfacao_trabalho,
      motivo_nota: r.motivo_satisfacao_baixa,
      gargalos: r.ladrao_tempo,
      sugestoes_start: r.start_action,
      sugestoes_stop: r.stop_action,
      reclamacao_cliente: r.reclamacao_cliente,
      sonho: r.maior_sonho
    }));

    const prompt = `Você é um consultor de estratégia sênior. Analise estas ${respostas.length} respostas do time da Sismais (SaaS B2B).

DADOS DO TIME:
${JSON.stringify(dadosCompletos)}

Gere um relatório executivo em MARKDOWN para a DIRETORIA com:

# 📊 Relatório Estratégico: Sismais 10K

## 🎯 Diagnóstico de Clima
Análise do sentimento geral e principais ofensores da satisfação.

## 🛑 O que o time quer PARAR (STOP)
Identifique padrões sobre o que é ineficiente na operação hoje.

## 🚀 O que o time quer COMEÇAR (START)
As melhores ideias sugeridas pelo time para crescimento.

## ⚠️ Top 3 Riscos Operacionais
Baseado nas reclamações de clientes e gargalos citados.

## 💡 Plano de Ação (30-90 dias)
Sugira 3 ações concretas de alto impacto baseadas nos dados.

## ✨ Análise Cultural (Sonhos)
Como os sonhos individuais se conectam com o crescimento da empresa.

Seja direto e cite exemplos anônimos se relevante.`;

    console.log("[analisar-levantamento-geral] Chamando Google Gemini...");

    // Chamada direta à API REST do Google Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      }),
    });

    if (!response.ok) {
       const errorData = await response.text();
       console.error("[analisar-levantamento-geral] Gemini Error:", errorData);
       throw new Error(`Erro API Gemini: ${response.status}`);
    }

    const payload = await response.json();
    // Extração segura da resposta do Gemini
    const report = payload.candidates?.[0]?.content?.parts?.[0]?.text || "A IA não retornou conteúdo.";

    return new Response(JSON.stringify({ report }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[analisar-levantamento-geral] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});