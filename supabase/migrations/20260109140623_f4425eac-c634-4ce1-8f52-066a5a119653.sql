-- Adicionar coluna plataforma para vendas de serviços
ALTER TABLE public.vendas_servicos 
ADD COLUMN IF NOT EXISTS plataforma text DEFAULT 'Guru Manager';

-- Comentário para documentar as opções
COMMENT ON COLUMN public.vendas_servicos.plataforma IS 'Plataforma de recebimento: Guru Manager, Banco Inter, Eduzz, GalaxyPay';