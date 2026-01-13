// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LevantamentoRow {
  id: string;
  colaborador_nome: string;
  funcao_atual: string | null;
  satisfacao_trabalho: number | null;
  motivo_satisfacao_baixa: string | null;
  talento_oculto: string | null;
  rotina_diaria: string | null;
  expectativa_empresa: string | null;
  definicao_sucesso: string | null;
  sentimento_valorizacao: string | null;
  atividades_top5: string | null;
  ladrao_tempo: string | null;
  ferramentas_uso: string | null;
  interdependencias: string | null;
  start_action: string | null;
  stop_action: string | null;
  continue_action: string | null;
  reclamacao_cliente: string | null;
  prioridades_setor: string | null;
  visao_papel_10k: string | null;
  falta_plano_2026: string | null;
  falta_metas_2025: string | null;
  score_autonomia: number | null;
  score_maestria: number | null;
  score_proposito: number | null;
  score_financeiro: number | null;
  score_ambiente: number | null;
  interesse_lideranca: boolean | null;
  motivo_lideranca: string | null;
  papel_bom_lider: string | null;
  maior_sonho: string | null;
  fotos_sonhos: string[] | null;
  created_at: string;
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não está configurada");
    }

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

    const prompt = `Você é um consultor estratégico que acompanha o clima organizacional. Recebi a seguinte resposta do formulário Sismais 10K:
- Colaborador: ${row.colaborador_nome}
- Função: ${row.funcao_atual || "não informada"}
- Satisfação (0-10): ${row.satisfacao_trabalho ?? "sem resposta"}
- Interesse em liderar: ${row.interesse_lideranca ? "Sim" : "Não"}
- Rotina: ${row.rotina_diaria ? row.rotina_diaria.substring(0, 256) : "sem resposta"}
- Dificuldades: ${row.ladrao_tempo || "sem resposta"}
- Prioridades: ${row.prioridades_setor || "sem resposta"}
- Visão de impacto: ${row.visao_papel_10k || "sem resposta"}
- Maior sonho: ${row.maior_sonho || "sem resposta"}

Baseado nisso, gere um relatório em português estruturado com:
1. Diagnóstico rápido (1 parágrafo);
2. 3 pontos fortes;
3. 3 pontos de atenção;
4. 3 ações práticas recomendadas;
5. Observação curta de melhoria imediata.

Seja objetivo e cite dados do colaborador sempre que possível.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Você é um consultor especialista em cultura organizacional e desenho de metas estratégicas para times comerciais.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[analisar-levantamento] Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const payload = await response.json();
    const analysis = payload.choices?.[0]?.message?.content?.trim() || "Análise indisponível no momento.";

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