-- Adicionando novos campos de rotina, satisfação e liderança à tabela levantamento_operacional_2024

ALTER TABLE public.levantamento_operacional_2024
ADD COLUMN rotina_diaria text NULL,
ADD COLUMN expectativa_empresa text NULL,
ADD COLUMN definicao_sucesso text NULL,
ADD COLUMN sentimento_valorizacao text NULL,
ADD COLUMN prioridades_setor text NULL,
ADD COLUMN funcao_atual character varying NULL,
ADD COLUMN satisfacao_trabalho integer NULL,
ADD COLUMN interesse_lideranca boolean NULL,
ADD COLUMN motivo_lideranca text NULL,
ADD COLUMN papel_bom_lider text NULL;

-- Atualizando RLS para permitir UPDATE (se necessário, embora o formulário seja INSERT)
-- As políticas de RLS existentes já cobrem a tabela, mas garantimos que as novas colunas sejam acessíveis.