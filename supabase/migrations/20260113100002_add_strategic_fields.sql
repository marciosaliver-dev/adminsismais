-- Adicionando campos estratégicos para o planejamento 2026
ALTER TABLE public.levantamento_operacional_2024
ADD COLUMN falta_plano_2026 text NULL,
ADD COLUMN falta_metas_2025 text NULL;

-- Garantir que a tabela permite inserção anônima se necessário (ou apenas autenticada via link compartilhado)
-- Como o sistema já exige login para quase tudo, manteremos 'authenticated', mas a rota no front será aberta.