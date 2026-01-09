-- Adicionar novos campos para parâmetros de fechamento de equipe na tabela meta_mensal
ALTER TABLE public.meta_mensal 
ADD COLUMN IF NOT EXISTS assinaturas_inicio_mes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS limite_churn numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS limite_cancelamentos numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS percentual_bonus_churn numeric DEFAULT 3,
ADD COLUMN IF NOT EXISTS percentual_bonus_retencao numeric DEFAULT 3;