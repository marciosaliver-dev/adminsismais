// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LevantamentoRow {
  colaborador_nome: string;
  funcao_atual: string | null;
  satisfacao_trabalho: number | null;
  interesse_lideranca: boolean | null;
  rotina_diaria: string | null;
  ladrao_tempo: string | null;
  prioridades_setor: string | null;
  visao_papel_10k: string | null;
  maior_sonho: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const row: LevantamentoRow = await req.json();

    // ATENÇÃO: Adicione OPENAI_API_KEY nos Secrets do Supabase
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    const prompt = `Você é um consultor estratégico de RH. Analise esta resposta individual do formulário Sismais 10K:
- Colaborador: ${row.colaborador_nome}
- Função: ${row.funcao_atual || "não informada"}
- Satisfação (0-10): ${row.satisfacao_trabalho ?? "sem resposta"}
- Interesse em liderar: ${row.interesse_lideranca ? "Sim" : "Não"}
- Rotina: ${row.rotina_diaria ? row.rotina_diaria.substring(0, 300) : "sem resposta"}
- Dificuldades: ${row.ladrao_tempo || "sem resposta"}
- Prioridades: ${row.prioridades_setor || "sem resposta"}
- Visão de impacto: ${row.visao_papel_10k || "sem resposta"}
- Maior sonho: ${row.maior_sonho || "sem resposta"}

Baseado nisso, gere um relatório curto em português estruturado com:
1. Diagnóstico rápido (1 parágrafo);
2. 3 pontos fortes;
3. 3 pontos de atenção;
4. 3 ações práticas recomendadas;
5. Observação curta de melhoria imediata.`;

    console.log("[analisar-levantamento] Chamando OpenAI...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Você é um consultor especialista em cultura organizacional."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[analisar-levantamento] OpenAI Error:", errorText);
      throw new Error(`Erro API OpenAI: ${response.status}`);
    }

    const payload = await response.json();
    const analysis = payload.choices?.[0]?.message?.content || "Análise indisponível.";

    return new Response(
      JSON.stringify({ analysis }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[analisar-levantamento] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});