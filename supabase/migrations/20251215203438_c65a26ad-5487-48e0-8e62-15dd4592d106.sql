-- Add bonus configuration columns to meta_mensal table
ALTER TABLE public.meta_mensal
ADD COLUMN IF NOT EXISTS bonus_meta_equipe numeric NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS bonus_meta_empresa numeric NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS num_colaboradores integer NOT NULL DEFAULT 12,
ADD COLUMN IF NOT EXISTS multiplicador_anual numeric NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS comissao_venda_unica numeric NOT NULL DEFAULT 10;

-- Fix any existing configuration values that are stored as decimals (0.10 instead of 10)
UPDATE public.configuracao_comissao 
SET valor = (CAST(valor AS numeric) * 100)::text
WHERE chave IN ('bonus_meta_equipe', 'bonus_meta_empresa', 'comissao_venda_unica')
AND CAST(valor AS numeric) < 1;