-- =============================================
-- MÓDULO FECHAMENTO DE EQUIPE - TABELAS
-- =============================================

-- 1. Tabela: colaboradores
CREATE TABLE public.colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cargo TEXT,
    departamento TEXT,
    salario_base DECIMAL(10,2) NOT NULL DEFAULT 0,
    percentual_comissao DECIMAL(5,2) DEFAULT 10,
    participa_fechamento_equipe BOOLEAN DEFAULT true,
    eh_vendedor_direto BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    data_admissao DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_colaboradores_ativo ON public.colaboradores(ativo);
CREATE INDEX idx_colaboradores_participa ON public.colaboradores(participa_fechamento_equipe);

ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários aprovados podem ver colaboradores"
ON public.colaboradores FOR SELECT
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir colaboradores"
ON public.colaboradores FOR INSERT
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar colaboradores"
ON public.colaboradores FOR UPDATE
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar colaboradores"
ON public.colaboradores FOR DELETE
USING (public.is_user_approved(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_colaboradores_updated_at
    BEFORE UPDATE ON public.colaboradores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela: metas_individuais
CREATE TABLE public.metas_individuais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    mes_referencia DATE NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    valor_meta TEXT NOT NULL,
    tipo_bonus TEXT NOT NULL DEFAULT 'fixo',
    valor_bonus DECIMAL(10,2) NOT NULL,
    valor_atingido TEXT,
    percentual_atingido DECIMAL(5,2) DEFAULT 0,
    atingida BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(colaborador_id, mes_referencia, titulo)
);

CREATE INDEX idx_metas_colaborador ON public.metas_individuais(colaborador_id);
CREATE INDEX idx_metas_mes ON public.metas_individuais(mes_referencia);

ALTER TABLE public.metas_individuais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários aprovados podem ver metas_individuais"
ON public.metas_individuais FOR SELECT
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir metas_individuais"
ON public.metas_individuais FOR INSERT
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar metas_individuais"
ON public.metas_individuais FOR UPDATE
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar metas_individuais"
ON public.metas_individuais FOR DELETE
USING (public.is_user_approved(auth.uid()));

CREATE TRIGGER update_metas_individuais_updated_at
    BEFORE UPDATE ON public.metas_individuais
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tabela: vendas_servicos
CREATE TABLE public.vendas_servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    cliente TEXT NOT NULL,
    descricao_servico TEXT NOT NULL,
    valor_servico DECIMAL(10,2) NOT NULL,
    data_venda DATE NOT NULL,
    mes_referencia DATE NOT NULL,
    status TEXT DEFAULT 'pendente',
    aprovado_por TEXT,
    aprovado_em TIMESTAMPTZ,
    motivo_rejeicao TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendas_servicos_colaborador ON public.vendas_servicos(colaborador_id);
CREATE INDEX idx_vendas_servicos_mes ON public.vendas_servicos(mes_referencia);
CREATE INDEX idx_vendas_servicos_status ON public.vendas_servicos(status);

ALTER TABLE public.vendas_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários aprovados podem ver vendas_servicos"
ON public.vendas_servicos FOR SELECT
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir vendas_servicos"
ON public.vendas_servicos FOR INSERT
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar vendas_servicos"
ON public.vendas_servicos FOR UPDATE
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar vendas_servicos"
ON public.vendas_servicos FOR DELETE
USING (public.is_user_approved(auth.uid()));

-- 4. Tabela: fechamento_equipe
CREATE TABLE public.fechamento_equipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mes_referencia DATE NOT NULL UNIQUE,
    assinaturas_inicio_mes INTEGER DEFAULT 0,
    vendas_mes INTEGER DEFAULT 0,
    cancelamentos_mes INTEGER DEFAULT 0,
    churn_rate DECIMAL(5,2) DEFAULT 0,
    mrr_mes DECIMAL(10,2) DEFAULT 0,
    meta_vendas INTEGER DEFAULT 0,
    meta_atingida BOOLEAN DEFAULT false,
    percentual_meta DECIMAL(5,2) DEFAULT 0,
    limite_churn DECIMAL(5,2) DEFAULT 5,
    limite_cancelamentos DECIMAL(5,2) DEFAULT 50,
    percentual_bonus_churn DECIMAL(5,2) DEFAULT 3,
    percentual_bonus_retencao DECIMAL(5,2) DEFAULT 3,
    percentual_bonus_meta DECIMAL(5,2) DEFAULT 10,
    bonus_churn_liberado BOOLEAN DEFAULT false,
    bonus_retencao_liberado BOOLEAN DEFAULT false,
    bonus_meta_liberado BOOLEAN DEFAULT false,
    valor_bonus_meta_total DECIMAL(10,2) DEFAULT 0,
    total_colaboradores_participantes INTEGER DEFAULT 0,
    valor_bonus_meta_individual DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'rascunho',
    calculado_em TIMESTAMPTZ,
    fechado_por TEXT,
    fechado_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fechamento_equipe_mes ON public.fechamento_equipe(mes_referencia);
CREATE INDEX idx_fechamento_equipe_status ON public.fechamento_equipe(status);

ALTER TABLE public.fechamento_equipe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários aprovados podem ver fechamento_equipe"
ON public.fechamento_equipe FOR SELECT
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir fechamento_equipe"
ON public.fechamento_equipe FOR INSERT
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar fechamento_equipe"
ON public.fechamento_equipe FOR UPDATE
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar fechamento_equipe"
ON public.fechamento_equipe FOR DELETE
USING (public.is_user_approved(auth.uid()));

CREATE TRIGGER update_fechamento_equipe_updated_at
    BEFORE UPDATE ON public.fechamento_equipe
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Tabela: fechamento_colaborador
CREATE TABLE public.fechamento_colaborador (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fechamento_equipe_id UUID NOT NULL REFERENCES public.fechamento_equipe(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    nome_colaborador TEXT NOT NULL,
    cargo TEXT,
    salario_base DECIMAL(10,2) DEFAULT 0,
    percentual_comissao DECIMAL(5,2) DEFAULT 0,
    bonus_churn DECIMAL(10,2) DEFAULT 0,
    bonus_retencao DECIMAL(10,2) DEFAULT 0,
    bonus_meta_equipe DECIMAL(10,2) DEFAULT 0,
    subtotal_bonus_equipe DECIMAL(10,2) DEFAULT 0,
    qtd_vendas_servicos INTEGER DEFAULT 0,
    total_vendas_servicos DECIMAL(10,2) DEFAULT 0,
    comissao_servicos DECIMAL(10,2) DEFAULT 0,
    qtd_metas_individuais INTEGER DEFAULT 0,
    qtd_metas_atingidas INTEGER DEFAULT 0,
    total_bonus_metas_individuais DECIMAL(10,2) DEFAULT 0,
    total_a_receber DECIMAL(10,2) DEFAULT 0,
    relatorio_html TEXT,
    enviado BOOLEAN DEFAULT false,
    enviado_em TIMESTAMPTZ,
    enviado_para TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fechamento_equipe_id, colaborador_id)
);

CREATE INDEX idx_fechamento_colab_equipe ON public.fechamento_colaborador(fechamento_equipe_id);
CREATE INDEX idx_fechamento_colab_colaborador ON public.fechamento_colaborador(colaborador_id);

ALTER TABLE public.fechamento_colaborador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários aprovados podem ver fechamento_colaborador"
ON public.fechamento_colaborador FOR SELECT
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir fechamento_colaborador"
ON public.fechamento_colaborador FOR INSERT
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar fechamento_colaborador"
ON public.fechamento_colaborador FOR UPDATE
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar fechamento_colaborador"
ON public.fechamento_colaborador FOR DELETE
USING (public.is_user_approved(auth.uid()));