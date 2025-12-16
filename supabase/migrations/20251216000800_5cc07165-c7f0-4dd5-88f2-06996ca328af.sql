-- Add ltv_medio column to meta_mensal table
ALTER TABLE public.meta_mensal 
ADD COLUMN IF NOT EXISTS ltv_medio numeric NOT NULL DEFAULT 12;