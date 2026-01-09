-- Remove a constraint única no fatura_id para permitir múltiplos lançamentos da mesma fatura
-- (ex: receita e estorno, ou lançamentos sem fatura como tarifas)
DROP INDEX IF EXISTS idx_extrato_eduzz_fatura_id;

-- Criar índice não-único para performance de buscas
CREATE INDEX IF NOT EXISTS idx_extrato_eduzz_fatura_id_lookup ON public.extrato_eduzz (fatura_id);

-- Criar índice único na combinação que realmente identifica um lançamento único
CREATE UNIQUE INDEX IF NOT EXISTS idx_extrato_eduzz_unique_lancamento 
ON public.extrato_eduzz (importacao_id, fatura_id, tipo_transacao, data, valor);