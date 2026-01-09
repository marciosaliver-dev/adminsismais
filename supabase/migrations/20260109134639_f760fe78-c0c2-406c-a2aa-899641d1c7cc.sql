
-- Tabela para ajustes manuais de comissão (débito/crédito)
CREATE TABLE public.ajuste_comissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fechamento_id UUID NOT NULL REFERENCES public.fechamento_comissao(id) ON DELETE CASCADE,
  vendedor TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
  valor NUMERIC NOT NULL DEFAULT 0,
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE public.ajuste_comissao ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuários aprovados podem ver ajuste_comissao"
  ON public.ajuste_comissao FOR SELECT
  USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir ajuste_comissao"
  ON public.ajuste_comissao FOR INSERT
  WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar ajuste_comissao"
  ON public.ajuste_comissao FOR UPDATE
  USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar ajuste_comissao"
  ON public.ajuste_comissao FOR DELETE
  USING (public.is_user_approved(auth.uid()));

-- Index
CREATE INDEX idx_ajuste_comissao_fechamento ON public.ajuste_comissao(fechamento_id);
CREATE INDEX idx_ajuste_comissao_vendedor ON public.ajuste_comissao(vendedor);
