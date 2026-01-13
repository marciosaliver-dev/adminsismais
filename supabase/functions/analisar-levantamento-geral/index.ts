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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

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

    // Preparar resumo compacto para a IA
    const resumoDados = respostas.map(r => ({
      clima: r.satisfacao_trabalho,
      funcao: r.funcao_atual,
      prioridades: r.prioridades_setor,
      gargalos: r.ladrao_tempo,
      start: r.start_action,
      stop: r.stop_action,
      continue: r.continue_action,
      reclamacao: r.reclamacao_cliente,
      falta2026: r.falta_plano_2026,
      sonho: r.maior_sonho
    }));

    const prompt = `Você é um consultor de estratégia e cultura organizacional. Analise o conjunto de ${respostas.length} respostas do Mapeamento Operacional da Sismais e gere um relatório executivo para a DIRETORIA.

DADOS CONSOLIDADOS:
${JSON.stringify(resumoDados)}

ESTRUTURA DO RELATÓRIO (Markdown):

# 📊 Relatório Estratégico: Sismais 10K

## 🎯 Diagnóstico de Clima e Operação
Resumo do sentimento do time e principais gargalos encontrados (2 parágrafos).

## 🛑 O que o time quer PARAR (STOP)
Identifique as 3 práticas ou processos mais citados como ineficientes.

## 🚀 O que o time quer COMEÇAR (START)
Identifique as 3 maiores oportunidades de melhoria ou novas práticas sugeridas.

## ⚠️ Alertas Críticos (Pain Points)
Lixe as maiores dores/reclamações que podem travar o crescimento para 10k clientes.

## 💡 Recomendações para a Diretoria
1. **Curto Prazo (30 dias)**: Ação imediata baseada no feedback.
2. **Médio Prazo (90 dias)**: Mudança estrutural ou de processo.
3. **Cultura**: Como conectar os sonhos individuais ao objetivo da empresa.

## ✨ Resumo do "Mural dos Sonhos"
Qual o perfil de sonhos do time e como a empresa pode ser o veículo para eles.

Seja direto, crítico quando necessário e propositivo. Responda em Português do Brasil.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-1.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error?.message || "Erro na chamada da IA.");
    }

    const payload = await response.json();
    const report = payload.choices?.[0]?.message?.content || "A IA não retornou um conteúdo válido.";

    return new Response(JSON.stringify({ report }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[analisar-levantamento-geral] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});