-- ============================================================
-- SCRIPT DE EXPORTAÇÃO DO BANCO DE DADOS - SISMAIS ADMIN
-- Gerado em: 2026-01-19
-- ============================================================
-- INSTRUÇÕES:
-- 1. Crie um novo projeto no Supabase (supabase.com)
-- 2. Primeiro execute a PARTE 1 (Estrutura) no SQL Editor
-- 3. Depois execute a PARTE 2 (Dados) no SQL Editor
-- 4. Configure as variáveis de ambiente no novo projeto
-- ============================================================

-- ============================================================
-- PARTE 1: ESTRUTURA DAS TABELAS
-- ============================================================

-- Criar enum para roles
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- Tabela: colaboradores
CREATE TABLE public.colaboradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cargo TEXT,
  departamento TEXT,
  salario_base NUMERIC NOT NULL DEFAULT 0,
  percentual_comissao NUMERIC DEFAULT 10,
  participa_fechamento_equipe BOOLEAN DEFAULT true,
  eh_vendedor_direto BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  data_admissao DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: faixa_comissao
CREATE TABLE public.faixa_comissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  mrr_min NUMERIC NOT NULL DEFAULT 0,
  mrr_max NUMERIC,
  percentual NUMERIC NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: configuracao_comissao
CREATE TABLE public.configuracao_comissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL,
  valor TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: meta_mensal
CREATE TABLE public.meta_mensal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_referencia DATE NOT NULL,
  meta_mrr NUMERIC NOT NULL DEFAULT 0,
  meta_quantidade INTEGER NOT NULL DEFAULT 0,
  bonus_meta_equipe NUMERIC NOT NULL DEFAULT 10,
  bonus_meta_empresa NUMERIC NOT NULL DEFAULT 10,
  num_colaboradores INTEGER NOT NULL DEFAULT 12,
  multiplicador_anual NUMERIC NOT NULL DEFAULT 2,
  comissao_venda_unica NUMERIC NOT NULL DEFAULT 10,
  ltv_medio NUMERIC NOT NULL DEFAULT 12,
  assinaturas_inicio_mes INTEGER DEFAULT 0,
  limite_churn NUMERIC DEFAULT 5,
  limite_cancelamentos NUMERIC DEFAULT 50,
  percentual_bonus_churn NUMERIC DEFAULT 3,
  percentual_bonus_retencao NUMERIC DEFAULT 3,
  colaboradores_bonus_meta TEXT[],
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: metas_individuais
CREATE TABLE public.metas_individuais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id),
  mes_referencia DATE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor_meta TEXT NOT NULL,
  valor_bonus NUMERIC NOT NULL,
  tipo_bonus TEXT NOT NULL DEFAULT 'fixo',
  valor_atingido TEXT,
  percentual_atingido NUMERIC DEFAULT 0,
  atingida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: vendas_servicos
CREATE TABLE public.vendas_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id),
  cliente TEXT NOT NULL,
  descricao_servico TEXT NOT NULL,
  valor_servico NUMERIC NOT NULL,
  data_venda DATE NOT NULL,
  mes_referencia DATE NOT NULL,
  status TEXT DEFAULT 'pendente',
  aprovado_por TEXT,
  aprovado_em TIMESTAMPTZ,
  motivo_rejeicao TEXT,
  observacoes TEXT,
  plataforma TEXT DEFAULT 'Guru Manager',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: modulos
CREATE TABLE public.modulos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT,
  rota TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: funcionalidades
CREATE TABLE public.funcionalidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modulo_id UUID NOT NULL REFERENCES public.modulos(id),
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  departamento TEXT,
  aprovado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: user_roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: permissoes_usuario
CREATE TABLE public.permissoes_usuario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  funcionalidade_id UUID NOT NULL REFERENCES public.funcionalidades(id),
  permitido BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: fechamento_comissao
CREATE TABLE public.fechamento_comissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_referencia DATE NOT NULL,
  arquivo_nome TEXT,
  data_importacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_vendas INTEGER NOT NULL DEFAULT 0,
  total_mrr NUMERIC NOT NULL DEFAULT 0,
  meta_batida BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: venda_importada
CREATE TABLE public.venda_importada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fechamento_id UUID NOT NULL REFERENCES public.fechamento_comissao(id),
  data_contrato DATE,
  num_contrato TEXT,
  cliente TEXT,
  email TEXT,
  plano TEXT,
  tipo_venda TEXT,
  intervalo TEXT,
  plataforma TEXT,
  vendedor TEXT,
  valor_assinatura NUMERIC NOT NULL DEFAULT 0,
  valor_adesao NUMERIC NOT NULL DEFAULT 0,
  valor_mrr NUMERIC NOT NULL DEFAULT 0,
  conta_comissao BOOLEAN NOT NULL DEFAULT true,
  conta_faixa BOOLEAN NOT NULL DEFAULT true,
  conta_meta BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: comissao_calculada
CREATE TABLE public.comissao_calculada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fechamento_id UUID NOT NULL REFERENCES public.fechamento_comissao(id),
  vendedor TEXT NOT NULL,
  faixa_nome TEXT,
  qtd_vendas INTEGER NOT NULL DEFAULT 0,
  mrr_total NUMERIC NOT NULL DEFAULT 0,
  mrr_comissao NUMERIC NOT NULL DEFAULT 0,
  percentual NUMERIC NOT NULL DEFAULT 0,
  valor_comissao NUMERIC NOT NULL DEFAULT 0,
  comissao_venda_unica NUMERIC NOT NULL DEFAULT 0,
  bonus_anual NUMERIC NOT NULL DEFAULT 0,
  bonus_meta_equipe NUMERIC NOT NULL DEFAULT 0,
  bonus_empresa NUMERIC NOT NULL DEFAULT 0,
  total_receber NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: ajuste_comissao
CREATE TABLE public.ajuste_comissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fechamento_id UUID NOT NULL REFERENCES public.fechamento_comissao(id),
  vendedor TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: fechamento_equipe
CREATE TABLE public.fechamento_equipe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_referencia DATE NOT NULL,
  status TEXT DEFAULT 'rascunho',
  assinaturas_inicio_mes INTEGER DEFAULT 0,
  vendas_mes INTEGER DEFAULT 0,
  cancelamentos_mes INTEGER DEFAULT 0,
  churn_rate NUMERIC DEFAULT 0,
  mrr_mes NUMERIC DEFAULT 0,
  mrr_base_comissao NUMERIC DEFAULT 0,
  meta_vendas INTEGER DEFAULT 0,
  meta_atingida BOOLEAN DEFAULT false,
  percentual_meta NUMERIC DEFAULT 0,
  limite_churn NUMERIC DEFAULT 5,
  limite_cancelamentos NUMERIC DEFAULT 50,
  percentual_bonus_churn NUMERIC DEFAULT 3,
  percentual_bonus_retencao NUMERIC DEFAULT 3,
  percentual_bonus_meta NUMERIC DEFAULT 10,
  bonus_churn_liberado BOOLEAN DEFAULT false,
  bonus_retencao_liberado BOOLEAN DEFAULT false,
  bonus_meta_liberado BOOLEAN DEFAULT false,
  valor_bonus_meta_total NUMERIC DEFAULT 0,
  total_colaboradores_participantes INTEGER DEFAULT 0,
  valor_bonus_meta_individual NUMERIC DEFAULT 0,
  total_comissoes_vendedores NUMERIC DEFAULT 0,
  calculado_em TIMESTAMPTZ,
  fechado_em TIMESTAMPTZ,
  fechado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: fechamento_colaborador
CREATE TABLE public.fechamento_colaborador (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fechamento_equipe_id UUID NOT NULL REFERENCES public.fechamento_equipe(id),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id),
  nome_colaborador TEXT NOT NULL,
  cargo TEXT,
  salario_base NUMERIC DEFAULT 0,
  percentual_comissao NUMERIC DEFAULT 0,
  bonus_churn NUMERIC DEFAULT 0,
  bonus_retencao NUMERIC DEFAULT 0,
  bonus_meta_equipe NUMERIC DEFAULT 0,
  subtotal_bonus_equipe NUMERIC DEFAULT 0,
  qtd_vendas_servicos INTEGER DEFAULT 0,
  total_vendas_servicos NUMERIC DEFAULT 0,
  comissao_servicos NUMERIC DEFAULT 0,
  qtd_metas_individuais INTEGER DEFAULT 0,
  qtd_metas_atingidas INTEGER DEFAULT 0,
  total_bonus_metas_individuais NUMERIC DEFAULT 0,
  total_a_receber NUMERIC DEFAULT 0,
  relatorio_html TEXT,
  enviado BOOLEAN DEFAULT false,
  enviado_em TIMESTAMPTZ,
  enviado_para TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: ajuste_fechamento_equipe
CREATE TABLE public.ajuste_fechamento_equipe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fechamento_equipe_id UUID NOT NULL REFERENCES public.fechamento_equipe(id),
  colaborador_id UUID REFERENCES public.colaboradores(id),
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: contratos_assinatura
CREATE TABLE public.contratos_assinatura (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_assinatura TEXT NOT NULL,
  plataforma TEXT NOT NULL,
  nome_produto TEXT,
  nome_assinatura TEXT,
  nome_oferta TEXT,
  nome_contato TEXT,
  doc_contato TEXT,
  email_contato TEXT,
  telefone_contato TEXT,
  valor_assinatura NUMERIC NOT NULL DEFAULT 0,
  valor_liquido NUMERIC DEFAULT 0,
  ciclo_dias INTEGER NOT NULL DEFAULT 30,
  data_inicio DATE,
  data_status DATE,
  data_cancelamento DATE,
  data_proximo_ciclo DATE,
  data_fim_ciclo DATE,
  quantidade_cobrancas INTEGER DEFAULT 0,
  parcelamento INTEGER DEFAULT 1,
  mrr NUMERIC,
  status TEXT NOT NULL DEFAULT 'Ativa',
  motivo_cancelamento TEXT,
  cancelado_por TEXT,
  forma_pagamento TEXT,
  cupom TEXT,
  importacao_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: importacoes_assinaturas
CREATE TABLE public.importacoes_assinaturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  arquivo_nome TEXT NOT NULL,
  plataforma TEXT NOT NULL,
  periodo_referencia DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'processando',
  total_registros INTEGER DEFAULT 0,
  registros_novos INTEGER DEFAULT 0,
  registros_atualizados INTEGER DEFAULT 0,
  total_mrr NUMERIC DEFAULT 0,
  total_contratos_ativos INTEGER DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: extrato_asaas
CREATE TABLE public.extrato_asaas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  importacao_id UUID NOT NULL,
  data DATE NOT NULL,
  transacao_id TEXT NOT NULL,
  tipo_transacao TEXT NOT NULL,
  tipo_lancamento TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  saldo NUMERIC NOT NULL DEFAULT 0,
  fatura_parcelamento TEXT,
  fatura_cobranca TEXT,
  nota_fiscal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: importacoes_extrato
CREATE TABLE public.importacoes_extrato (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  arquivo_nome TEXT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'processando',
  total_registros INTEGER NOT NULL DEFAULT 0,
  registros_novos INTEGER NOT NULL DEFAULT 0,
  registros_duplicados INTEGER NOT NULL DEFAULT 0,
  total_creditos NUMERIC NOT NULL DEFAULT 0,
  total_debitos NUMERIC NOT NULL DEFAULT 0,
  saldo_final NUMERIC NOT NULL DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: extrato_eduzz
CREATE TABLE public.extrato_eduzz (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  importacao_id UUID NOT NULL,
  data DATE NOT NULL,
  fatura_id TEXT NOT NULL,
  tipo_transacao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: importacoes_extrato_eduzz
CREATE TABLE public.importacoes_extrato_eduzz (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  arquivo_nome TEXT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'processando',
  total_registros INTEGER DEFAULT 0,
  registros_novos INTEGER DEFAULT 0,
  registros_duplicados INTEGER DEFAULT 0,
  total_vendas NUMERIC DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: simulacoes_meta
CREATE TABLE public.simulacoes_meta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome VARCHAR NOT NULL,
  descricao TEXT,
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
  receita_necessaria NUMERIC,
  novas_vendas INTEGER,
  leads_necessarios INTEGER,
  vendedores_necessarios INTEGER,
  custo_total NUMERIC,
  payback_meses NUMERIC,
  ltv_cac_ratio NUMERIC,
  roi NUMERIC,
  analise_ia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: levantamento_operacional_2024
CREATE TABLE public.levantamento_operacional_2024 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_nome TEXT NOT NULL,
  funcao_atual TEXT,
  satisfacao_trabalho INTEGER,
  motivo_satisfacao_baixa TEXT,
  talento_oculto TEXT,
  rotina_diaria TEXT NOT NULL,
  expectativa_empresa TEXT NOT NULL,
  definicao_sucesso TEXT NOT NULL,
  sentimento_valorizacao TEXT NOT NULL,
  atividades_top5 TEXT NOT NULL,
  ladrao_tempo TEXT NOT NULL,
  ferramentas_uso TEXT NOT NULL,
  interdependencias TEXT NOT NULL,
  start_action TEXT NOT NULL,
  stop_action TEXT NOT NULL,
  continue_action TEXT NOT NULL,
  reclamacao_cliente TEXT NOT NULL,
  prioridades_setor TEXT NOT NULL,
  visao_papel_10k TEXT NOT NULL,
  falta_plano_2026 TEXT NOT NULL,
  falta_metas_2025 TEXT NOT NULL,
  score_autonomia INTEGER NOT NULL,
  score_maestria INTEGER NOT NULL,
  score_proposito INTEGER NOT NULL,
  score_financeiro INTEGER NOT NULL,
  score_ambiente INTEGER NOT NULL,
  interesse_lideranca BOOLEAN NOT NULL,
  motivo_lideranca TEXT,
  papel_bom_lider TEXT,
  maior_sonho TEXT NOT NULL,
  fotos_sonhos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT aprovado FROM public.profiles WHERE user_id = _user_id),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _codigo text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT permitido FROM public.permissoes_usuario pu
     JOIN public.funcionalidades f ON f.id = pu.funcionalidade_id
     WHERE pu.user_id = _user_id AND f.codigo = _codigo),
    public.is_admin(_user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger para handle_new_user (ajuste conforme necessário)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, departamento, aprovado)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data ->> 'departamento',
    false
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Criar trigger para novos usuários
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PARTE 2: DADOS
-- ============================================================

-- Colaboradores
INSERT INTO public.colaboradores (id, nome, email, telefone, cargo, departamento, salario_base, percentual_comissao, participa_fechamento_equipe, eh_vendedor_direto, ativo, data_admissao) VALUES
('afebb0c1-1e5a-4938-8a67-e4cdef1cd874', 'Kathlyn de Oliveira Lopes Pires', 'kathlyn.lopes@sismais.com', '11988983131', 'Coordenador(a) de Suporte', 'Suporte e CS', 1770.00, 20.00, true, false, true, '2024-11-04'),
('c2eb5f1a-f270-482b-9706-9d5d299d11ea', 'Josilane Ferreira Rocha', 'josilane.ferreira@sismais.com', '77981249386', 'Vendedor(a)', 'Comercial e Marketing', 1750.00, 20.00, false, true, true, '2022-04-11'),
('8af4aeda-0e6f-4cd2-b7ae-1b175293260a', 'Glenda Thaiana Santos Lima', 'glenda.lima@sismais.com', '77991142212', 'Vendedor(a)', 'Comercial e Marketing', 2150.00, 20.00, false, true, true, '2018-04-04'),
('78047554-9d7a-46fa-95ab-969099d85809', 'Dione Ribeiro Niza', 'dione.ribeiro@sismais.com', NULL, 'Desenvolvedor de Sistemas', 'Desenvolvimento', 2050.00, 20.00, true, false, true, '2019-05-27'),
('b8d93db9-748e-4584-8d29-9dc69715fe15', 'Camile Pereira', 'camile.pereira@sismais.com', NULL, 'Analista de Suporte', 'Suporte e CS', 1518.00, 20.00, true, false, true, '2025-11-01'),
('bcc193e1-52ae-42bb-a19d-f23a1b96efb9', 'Ana Vitória Teixeira de Carvalho Santos', 'vitoria.santos@sismais.com', NULL, 'Vendedor(a)', 'Comercial e Marketing', 1518.00, 20.00, false, true, true, '2025-11-01'),
('382387c1-acc4-4f49-8cfc-d55893067313', 'Aline Silva Martins Ribeiro', 'aline.martins@sismais.com', NULL, 'Auxiliar Administrativo', 'Administrativo', 1518.00, 20.00, true, false, true, '2025-09-01'),
('9c059547-44d1-4621-8261-7bdae24f7785', 'Mateus dos Santos Castro', 'mateus.santos@sismais.com', '77981251735', 'Operador de Suporte Técnico', 'Suporte e CS', 1518.00, 20.00, true, false, true, '2025-10-20'),
('beb644f8-8834-454c-b9c7-d5be9c038953', 'Pamella Ramona Saraiva de Oliveira', 'ramona.saraiva@sismais.com', '77991799506', 'Vendedor(a)', 'Comercial e Marketing', 1900.00, 20.00, false, true, true, '2021-05-05'),
('062f09ae-759f-40ed-9ef5-98494c2f595f', 'Ricardo Cássio Pires Santos', 'ricardo.cassio@sismais.com', '77981440295', 'Desenvolvedor de Sistemas', 'Desenvolvimento', 3300.00, 20.00, true, false, true, '2014-07-01'),
('030a22e2-4349-465c-96e6-0be6fbd967a0', 'Sérgio Coutinho de Brito', 'sergio.coutinho@sismais.com', '77981318001', 'Lider de Departamento CS (Customer Sucess)', 'Suporte e CS', 3250.00, 20.00, true, false, true, '2014-08-01');

-- Faixas de Comissão
INSERT INTO public.faixa_comissao (id, nome, mrr_min, mrr_max, percentual, ordem, ativo) VALUES
('714c6901-2f75-4f70-aaba-9e2b30dc3635', '🔴 Início', 0, 999, 0, 1, true),
('cee164f1-d46a-44fa-a8ec-f3d04db12d2c', '🟠 Em Ação', 1000, 1499, 20.00, 2, true),
('9634fe8d-0262-4236-be99-7330a8a525f4', '🟡 Starter', 1500, 2000, 30.00, 3, true),
('4a844308-db86-407e-8a00-ea895c405298', '🔵 Pro', 2001, 2500, 35.00, 4, true),
('a946af70-4daf-4585-b1ec-acbce030fe44', '🟢 Elite I', 2501, 3500, 40.00, 5, true),
('e44c2440-0ba7-4640-acd0-9a40e7b475b5', '⭐ Elite II', 3501, 6000, 45, 6, true),
('833a611b-2bdb-42be-ab6f-6736b9541fb1', '⭐ Lenda', 6001, NULL, 50.00, 7, true);

-- Configurações de Comissão
INSERT INTO public.configuracao_comissao (id, chave, valor, descricao) VALUES
('9484df8c-eff0-4b95-ad6f-a35cc2064c09', 'meta_mrr', '8500', 'Meta de MRR mensal'),
('aa8833d1-f08e-4854-b32d-7c75cbbab3ab', 'meta_quantidade', '130', 'Meta de quantidade de vendas'),
('5e1fa6fd-fd2e-4c40-a85a-80019f4b29be', 'num_colaboradores', '12', 'Número de colaboradores'),
('e1a23c81-1d1a-4344-8597-2d1e865c0d89', 'multiplicador_anual', '2', 'Multiplicador venda anual'),
('18366038-9490-47bd-9686-dbacacb67746', 'comissao_venda_unica', '10', 'Percentual de comissão sobre vendas únicas (adesão)'),
('17b3ea49-edf9-40e4-90e1-d78fed022f93', 'meta_mes', '', 'Mês de referência para a meta'),
('15196bf4-e45f-40e4-8a4b-78063addc2d7', 'bonus_meta_equipe', '10.00', 'Bônus por meta equipe (10%)'),
('cb3e576d-f383-4326-a724-c7b5ad60f3f7', 'bonus_meta_empresa', '10.00', 'Bônus por meta empresa (10%)'),
('58116870-fb6e-4402-9f53-985f9e79f5fd', 'ltv_medio', '12', 'LTV Médio em meses para cálculo de faturamento total');

-- Metas Mensais
INSERT INTO public.meta_mensal (id, mes_referencia, meta_mrr, meta_quantidade, bonus_meta_equipe, bonus_meta_empresa, num_colaboradores, multiplicador_anual, comissao_venda_unica, ltv_medio, assinaturas_inicio_mes, limite_churn, limite_cancelamentos, percentual_bonus_churn, percentual_bonus_retencao, observacao) VALUES
('eea86379-f039-44cd-b746-3cbc246a22da', '2026-01-01', 8000, 120, 10, 10, 11, 2, 10, 6, 1240, 5, 50, 3, 3, 'Meta de Janeiro'),
('2f975c14-6454-4987-9fa7-89dc0a61811c', '2025-12-01', 4000, 70, 10, 10, 11, 2, 20, 6, 1239, 5, 50, 3, 3, 'Meta de Dezembro, Vendas menores');

-- Módulos
INSERT INTO public.modulos (id, nome, descricao, icone, rota, ordem, ativo) VALUES
('9ff612a8-691f-45f1-a88a-9b5588c34721', 'Comissões', 'Gestão de comissões de vendas', 'Calculator', '/comissoes', 1, true),
('210f1f1f-fd45-40ff-a7d4-6c52bc90a290', 'Extrato Asaas', 'Gestão de extratos financeiros', 'FileSpreadsheet', '/extrato-asaas', 2, true),
('8cc1497a-471d-4932-8fe5-0a6422c9f9c4', 'Administração', 'Painel administrativo', 'Settings', '/admin', 3, true);

-- Funcionalidades
INSERT INTO public.funcionalidades (id, modulo_id, nome, codigo, descricao, ativo) VALUES
('4e4af919-e2f9-45a3-a745-7a04e7a316d8', '9ff612a8-691f-45f1-a88a-9b5588c34721', 'Visualizar', 'comissoes.visualizar', 'Ver fechamentos e histórico', true),
('99850d78-7ca3-4752-ae7f-3caa6c7ed7ee', '9ff612a8-691f-45f1-a88a-9b5588c34721', 'Criar Fechamento', 'comissoes.criar', 'Importar e criar novos fechamentos', true),
('dc8420d8-3644-476d-bf34-7b6938690900', '9ff612a8-691f-45f1-a88a-9b5588c34721', 'Editar Configurações', 'comissoes.configurar', 'Alterar faixas e metas', true),
('e303f8d5-5c06-46e0-aed3-77c1c500821c', '210f1f1f-fd45-40ff-a7d4-6c52bc90a290', 'Visualizar', 'extrato.visualizar', 'Ver extratos importados', true),
('5fa58545-f962-4c40-9e3a-a5ef4116777a', '210f1f1f-fd45-40ff-a7d4-6c52bc90a290', 'Importar', 'extrato.importar', 'Importar novos extratos', true),
('70071c8d-8bbc-4a50-b9b2-6d34273e20ed', '8cc1497a-471d-4932-8fe5-0a6422c9f9c4', 'Gerenciar Usuários', 'admin.usuarios', 'Aprovar e gerenciar usuários', true),
('27eaaf22-b5af-4497-92c2-bf3c8e397b08', '8cc1497a-471d-4932-8fe5-0a6422c9f9c4', 'Gerenciar Permissões', 'admin.permissoes', 'Definir permissões por usuário', true);

-- Metas Individuais
INSERT INTO public.metas_individuais (id, colaborador_id, mes_referencia, titulo, valor_meta, valor_bonus, tipo_bonus, atingida) VALUES
('d8e71aea-b732-4eba-9b1f-9436fecf2b9d', '382387c1-acc4-4f49-8cfc-d55893067313', '2026-01-01', 'Indice de Inadimplencia abaixo de 5%', '5', 50.00, 'fixo', false);

-- Vendas de Serviços
INSERT INTO public.vendas_servicos (id, colaborador_id, cliente, descricao_servico, valor_servico, data_venda, mes_referencia, status, aprovado_por, aprovado_em, observacoes, plataforma) VALUES
('0ee7efbf-cad9-42e1-8356-0857ee65c495', 'b8d93db9-748e-4584-8d29-9dc69715fe15', 'Mario Cesar', 'Suporte Premium', 50.00, '2025-12-30', '2026-01-01', 'aprovado', 'Admin', '2026-01-12 12:10:14.065+00', 'Impressora compartilhada em rede', 'Banco Inter'),
('5202581b-c74e-4e3e-b3c4-35ded14f7189', 'b8d93db9-748e-4584-8d29-9dc69715fe15', 'Cristina', 'Customização', 100.00, '2025-12-19', '2026-01-01', 'aprovado', 'Admin', '2026-01-12 12:10:15.669+00', NULL, 'Guru Manager');

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
-- NOTA: Os dados de levantamento_operacional_2024 são extensos
-- e devem ser exportados separadamente se necessário.
-- ============================================================
