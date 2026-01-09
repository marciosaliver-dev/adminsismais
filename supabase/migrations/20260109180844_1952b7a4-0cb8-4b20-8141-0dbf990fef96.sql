-- Criar tabela de importações de extrato Eduzz
CREATE TABLE public.importacoes_extrato_eduzz (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  arquivo_nome TEXT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  total_registros INTEGER DEFAULT 0,
  registros_novos INTEGER DEFAULT 0,
  registros_duplicados INTEGER DEFAULT 0,
  total_vendas NUMERIC(15,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processando',
  observacao TEXT
);

-- Enable Row Level Security
ALTER TABLE public.importacoes_extrato_eduzz ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view importacoes_extrato_eduzz" 
ON public.importacoes_extrato_eduzz 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert importacoes_extrato_eduzz" 
ON public.importacoes_extrato_eduzz 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update importacoes_extrato_eduzz" 
ON public.importacoes_extrato_eduzz 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete importacoes_extrato_eduzz" 
ON public.importacoes_extrato_eduzz 
FOR DELETE 
USING (true);

-- Criar tabela de extrato Eduzz
CREATE TABLE public.extrato_eduzz (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  importacao_id UUID NOT NULL REFERENCES public.importacoes_extrato_eduzz(id) ON DELETE CASCADE,
  fatura_id TEXT NOT NULL,
  data DATE NOT NULL,
  tipo_transacao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(15,2) DEFAULT 0
);

-- Create unique constraint to prevent duplicates based on fatura_id
CREATE UNIQUE INDEX idx_extrato_eduzz_fatura_id ON public.extrato_eduzz(fatura_id);

-- Create index for faster queries
CREATE INDEX idx_extrato_eduzz_data ON public.extrato_eduzz(data);
CREATE INDEX idx_extrato_eduzz_importacao ON public.extrato_eduzz(importacao_id);

-- Enable Row Level Security
ALTER TABLE public.extrato_eduzz ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view extrato_eduzz" 
ON public.extrato_eduzz 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert extrato_eduzz" 
ON public.extrato_eduzz 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update extrato_eduzz" 
ON public.extrato_eduzz 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete extrato_eduzz" 
ON public.extrato_eduzz 
FOR DELETE 
USING (true);