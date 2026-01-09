-- Tabela para armazenar importações de assinaturas
CREATE TABLE public.importacoes_assinaturas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    arquivo_nome TEXT NOT NULL,
    plataforma TEXT NOT NULL, -- 'guru', 'eduzz', 'galaxypay'
    periodo_referencia DATE NOT NULL,
    total_registros INTEGER DEFAULT 0,
    registros_novos INTEGER DEFAULT 0,
    registros_atualizados INTEGER DEFAULT 0,
    total_mrr NUMERIC DEFAULT 0,
    total_contratos_ativos INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processando', -- 'processando', 'concluido', 'erro'
    observacao TEXT
);

-- Tabela para armazenar contratos/assinaturas
CREATE TABLE public.contratos_assinatura (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    importacao_id UUID REFERENCES public.importacoes_assinaturas(id) ON DELETE CASCADE,
    
    -- Identificação
    codigo_assinatura TEXT NOT NULL UNIQUE,
    plataforma TEXT NOT NULL, -- 'guru', 'eduzz', 'galaxypay'
    
    -- Produto/Plano
    nome_produto TEXT,
    nome_assinatura TEXT,
    nome_oferta TEXT,
    
    -- Cliente
    nome_contato TEXT,
    doc_contato TEXT,
    email_contato TEXT,
    telefone_contato TEXT,
    
    -- Valores
    valor_assinatura NUMERIC NOT NULL DEFAULT 0,
    valor_liquido NUMERIC DEFAULT 0,
    
    -- Ciclo de cobrança (dias)
    ciclo_dias INTEGER NOT NULL DEFAULT 30, -- 30=mensal, 90=trimestral, 180=semestral, 365=anual
    
    -- Datas
    data_inicio DATE,
    data_status DATE,
    data_cancelamento DATE,
    data_proximo_ciclo DATE,
    data_fim_ciclo DATE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'Ativa', -- 'Ativa', 'Cancelada', 'Suspensa', 'Atrasada', 'Trial'
    motivo_cancelamento TEXT,
    cancelado_por TEXT,
    
    -- Outros
    forma_pagamento TEXT,
    quantidade_cobrancas INTEGER DEFAULT 0,
    parcelamento INTEGER DEFAULT 1,
    cupom TEXT,
    
    -- Calculados
    mrr NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN ciclo_dias <= 0 THEN 0
            WHEN ciclo_dias = 30 THEN valor_assinatura
            WHEN ciclo_dias = 90 THEN valor_assinatura / 3
            WHEN ciclo_dias = 180 THEN valor_assinatura / 6
            WHEN ciclo_dias = 365 THEN valor_assinatura / 12
            ELSE (valor_assinatura * 30) / ciclo_dias
        END
    ) STORED
);

-- Índices para performance
CREATE INDEX idx_contratos_plataforma ON public.contratos_assinatura(plataforma);
CREATE INDEX idx_contratos_status ON public.contratos_assinatura(status);
CREATE INDEX idx_contratos_data_inicio ON public.contratos_assinatura(data_inicio);
CREATE INDEX idx_contratos_codigo ON public.contratos_assinatura(codigo_assinatura);

-- Enable RLS
ALTER TABLE public.importacoes_assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_assinatura ENABLE ROW LEVEL SECURITY;

-- RLS Policies para importacoes_assinaturas
CREATE POLICY "Usuários aprovados podem ver importacoes_assinaturas" 
ON public.importacoes_assinaturas FOR SELECT 
USING (is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir importacoes_assinaturas" 
ON public.importacoes_assinaturas FOR INSERT 
WITH CHECK (is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar importacoes_assinaturas" 
ON public.importacoes_assinaturas FOR UPDATE 
USING (is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar importacoes_assinaturas" 
ON public.importacoes_assinaturas FOR DELETE 
USING (is_user_approved(auth.uid()));

-- RLS Policies para contratos_assinatura
CREATE POLICY "Usuários aprovados podem ver contratos_assinatura" 
ON public.contratos_assinatura FOR SELECT 
USING (is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir contratos_assinatura" 
ON public.contratos_assinatura FOR INSERT 
WITH CHECK (is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar contratos_assinatura" 
ON public.contratos_assinatura FOR UPDATE 
USING (is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar contratos_assinatura" 
ON public.contratos_assinatura FOR DELETE 
USING (is_user_approved(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_contratos_assinatura_updated_at
BEFORE UPDATE ON public.contratos_assinatura
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();