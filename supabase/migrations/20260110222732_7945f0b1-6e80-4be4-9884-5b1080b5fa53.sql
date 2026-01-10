-- Tabela para armazenar simulações de metas
CREATE TABLE public.simulacoes_meta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  
  -- Inputs da simulação
  mrr_atual NUMERIC DEFAULT 0,
  mrr_meta NUMERIC DEFAULT 0,
  data_meta DATE,
  ticket_medio NUMERIC DEFAULT 0,
  churn_mensal NUMERIC DEFAULT 0,
  taxa_conversao NUMERIC DEFAULT 0,
  custo_por_lead NUMERIC DEFAULT 0,
  leads_vendedor_mes NUMERIC DEFAULT 0,
  custo_fixo_vendedor NUMERIC DEFAULT 0,
  comissao_venda NUMERIC DEFAULT 0,
  vendedores_atuais INTEGER DEFAULT 0,
  ltv_meses NUMERIC DEFAULT 0,
  clientes_ativos INTEGER DEFAULT 0,
  
  -- Outputs calculados (para consulta rápida)
  receita_necessaria NUMERIC,
  novas_vendas INTEGER,
  leads_necessarios INTEGER,
  vendedores_necessarios INTEGER,
  custo_total NUMERIC,
  roi NUMERIC,
  payback_meses NUMERIC,
  ltv_cac_ratio NUMERIC,
  
  -- Análise IA
  analise_ia TEXT,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.simulacoes_meta ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own simulations" 
ON public.simulacoes_meta 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own simulations" 
ON public.simulacoes_meta 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulations" 
ON public.simulacoes_meta 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own simulations" 
ON public.simulacoes_meta 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_simulacoes_meta_updated_at
BEFORE UPDATE ON public.simulacoes_meta
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();