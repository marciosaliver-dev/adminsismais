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

    const data: SimuladorData = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Benchmarks de mercado SaaS
    const benchmarks = {
      churnMensal: { bom: 3, medio: 5, ruim: 8 },
      taxaConversao: { bom: 5, medio: 2.5, ruim: 1 },
      ltvCacRatio: { bom: 3, medio: 2, ruim: 1 },
      payback: { bom: 6, medio: 12, ruim: 18 },
      roi: { bom: 200, medio: 100, ruim: 50 },
    };

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

## Benchmarks de Mercado SaaS:
- Churn mensal: Bom < 3%, Médio 3-5%, Ruim > 8%
- Taxa conversão: Bom > 5%, Médio 2-5%, Ruim < 1%
- LTV/CAC: Bom > 3x, Médio 2-3x, Ruim < 1x
- Payback: Bom < 6 meses, Médio 6-12 meses, Ruim > 18 meses

Forneça uma análise estruturada em formato markdown com:

## 📊 Diagnóstico Geral
Avaliação geral da saúde do cenário (1-2 parágrafos)

## ✅ Pontos Fortes
- Liste 2-3 métricas que estão boas comparado aos benchmarks

## ⚠️ Pontos de Atenção
- Liste 2-3 métricas que precisam melhorar

## 💡 Recomendações Estratégicas
1. **[Área]**: Recomendação específica e acionável
2. **[Área]**: Outra recomendação
3. **[Área]**: Terceira recomendação

## 🎯 Quick Wins
- 2-3 ações rápidas que podem trazer resultados imediatos

## 📈 Projeção
Breve análise da viabilidade da meta com base nos dados

Seja objetivo, use dados concretos e sugira ações práticas. Responda em português do Brasil.`;

    console.log("[analisar-simulacao] Calling Lovable AI Gateway for sales simulation analysis...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Você é um consultor especialista em vendas SaaS, growth hacking e benchmarking de mercado. Forneça análises estratégicas baseadas em dados e melhores práticas do mercado."
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
      const errorText = await response.text();
      console.error("[analisar-simulacao] AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error("No analysis returned from AI");
    }

    console.log("[analisar-simulacao] Analysis generated successfully");

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