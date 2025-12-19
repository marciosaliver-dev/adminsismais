-- Tabela para histórico de importações
CREATE TABLE public.importacoes_extrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  arquivo_nome text NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  total_registros integer NOT NULL DEFAULT 0,
  registros_novos integer NOT NULL DEFAULT 0,
  registros_duplicados integer NOT NULL DEFAULT 0,
  total_creditos numeric NOT NULL DEFAULT 0,
  total_debitos numeric NOT NULL DEFAULT 0,
  saldo_final numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processando',
  observacao text
);

-- Tabela para transações do extrato
CREATE TABLE public.extrato_asaas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  importacao_id uuid NOT NULL REFERENCES public.importacoes_extrato(id) ON DELETE CASCADE,
  transacao_id text NOT NULL UNIQUE,
  data date NOT NULL,
  tipo_transacao text NOT NULL,
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  saldo numeric NOT NULL DEFAULT 0,
  fatura_parcelamento text,
  fatura_cobranca text,
  nota_fiscal text,
  tipo_lancamento text NOT NULL
);

-- Índices
CREATE INDEX idx_extrato_asaas_data ON public.extrato_asaas(data);
CREATE INDEX idx_extrato_asaas_tipo_transacao ON public.extrato_asaas(tipo_transacao);
CREATE INDEX idx_extrato_asaas_importacao_id ON public.extrato_asaas(importacao_id);

-- Enable RLS
ALTER TABLE public.importacoes_extrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extrato_asaas ENABLE ROW LEVEL SECURITY;

-- Políticas para importacoes_extrato
CREATE POLICY "Allow public select on importacoes_extrato" ON public.importacoes_extrato FOR SELECT USING (true);
CREATE POLICY "Allow public insert on importacoes_extrato" ON public.importacoes_extrato FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on importacoes_extrato" ON public.importacoes_extrato FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on importacoes_extrato" ON public.importacoes_extrato FOR DELETE USING (true);

-- Políticas para extrato_asaas
CREATE POLICY "Allow public select on extrato_asaas" ON public.extrato_asaas FOR SELECT USING (true);
CREATE POLICY "Allow public insert on extrato_asaas" ON public.extrato_asaas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on extrato_asaas" ON public.extrato_asaas FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on extrato_asaas" ON public.extrato_asaas FOR DELETE USING (true);