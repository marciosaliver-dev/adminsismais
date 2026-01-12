-- Adicionando campo para explicar satisfação quando a nota for baixa (< 8)
ALTER TABLE public.levantamento_operacional_2024
ADD COLUMN motivo_satisfacao_baixa text NULL;