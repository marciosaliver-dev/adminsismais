// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SimuladorData {
  mrrAtual: number;
  mrrMeta: number;
  ticketMedio: number;
  churnMensal: number;
  taxaConversao: number;
  custoPorLead: number;
  leadsVendedorMes: number;
  custoFixoVendedor: number;
  comissaoVenda: number;
  vendedoresAtuais: number;
  ltvMeses: number;
  // Outputs
  novasVendas: number;
  leadsNecessarios: number;
  investimentoMarketing: number;
  vendedoresAdicionais: number;
  custoTotal: number;
  roi: number;
  paybackMeses: number;
  mesesAteData: number;
  ltv: number;
  cac: number;
  ltvCacRatio: number;
}

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[analisar-simulacao] Unauthorized access attempt", { authError });
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
      console.error("[analisar-simulacao] User not approved", { userId: user.id });
      return new Response(JSON.stringify({ error: 'Acesso negado. Sua conta aguarda aprovação.' }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const data: SimuladorData = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = `Você é um consultor especialista em vendas SaaS e growth hacking. Analise os dados do simulador de metas de vendas e forneça insights estratégicos.

## Dados do Simulador:
- MRR Atual: R$ ${data.mrrAtual.toLocaleString('pt-BR')}
- MRR Meta: R$ ${data.mrrMeta.toLocaleString('pt-BR')}
- Crescimento necessário: ${((data.mrrMeta - data.mrrAtual) / Math.max(data.mrrAtual, 1) * 100).toFixed(1)}%
- Prazo: ${data.mesesAteData} meses
- Ticket Médio: R$ ${data.ticketMedio.toLocaleString('pt-BR')}
- Churn Mensal: ${data.churnMensal}%
- Taxa de Conversão: ${data.taxaConversao}%
- Custo por Lead: R$ ${data.custoPorLead.toLocaleString('pt-BR')}
- Leads por Vendedor/Mês: ${data.leadsVendedorMes}
- Vendedores Atuais: ${data.vendedoresAtuais}
- LTV (${data.ltvMeses} meses): R$ ${data.ltv.toLocaleString('pt-BR')}
- CAC: R$ ${data.cac.toLocaleString('pt-BR')}
- Ratio LTV/CAC: ${data.ltvCacRatio.toFixed(2)}

## Resultados Calculados:
- Novas Vendas Necessárias: ${data.novasVendas}
- Leads Necessários: ${data.leadsNecessarios}
- Investimento Marketing: R$ ${data.investimentoMarketing.toLocaleString('pt-BR')}
- Vendedores Adicionais: ${data.vendedoresAdicionais}
- Custo Total: R$ ${data.custoTotal.toLocaleString('pt-BR')}
- ROI Projetado: ${data.roi.toFixed(1)}%
- Payback: ${data.paybackMeses} meses

Forneça uma análise estruturada em formato markdown com:
## 📊 Diagnóstico Geral
## ✅ Pontos Fortes
## ⚠️ Pontos de Atenção
## 💡 Recomendações Estratégicas
## 🎯 Quick Wins
## 📈 Projeção

Seja objetivo, use dados concretos e sugira ações práticas. Responda em português do Brasil.`;

    console.log("[analisar-simulacao] Calling Lovable AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: [
          {
            role: "system",
            content: "Você é um consultor especialista em vendas SaaS, growth hacking e benchmarking de mercado."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[analisar-simulacao] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});