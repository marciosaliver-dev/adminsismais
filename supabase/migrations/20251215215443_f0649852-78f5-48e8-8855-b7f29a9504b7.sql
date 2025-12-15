-- Add comissao_venda_unica column to comissao_calculada table
ALTER TABLE public.comissao_calculada 
ADD COLUMN IF NOT EXISTS comissao_venda_unica numeric NOT NULL DEFAULT 0;