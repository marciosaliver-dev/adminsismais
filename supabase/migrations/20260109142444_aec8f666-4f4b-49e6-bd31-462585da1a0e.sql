-- Adicionar campos para ajustes manuais no fechamento de equipe
ALTER TABLE public.fechamento_equipe 
ADD COLUMN IF NOT EXISTS mrr_base_comissao numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_comissoes_vendedores numeric DEFAULT 0;

-- Criar tabela para ajustes manuais do fechamento de equipe
CREATE TABLE IF NOT EXISTS public.ajuste_fechamento_equipe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fechamento_equipe_id UUID NOT NULL REFERENCES fechamento_equipe(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
  valor NUMERIC NOT NULL DEFAULT 0,
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE public.ajuste_fechamento_equipe ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Usuários aprovados podem ver ajuste_fechamento_equipe" 
ON public.ajuste_fechamento_equipe 
FOR SELECT 
USING (is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir ajuste_fechamento_equipe" 
ON public.ajuste_fechamento_equipe 
FOR INSERT 
WITH CHECK (is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar ajuste_fechamento_equipe" 
ON public.ajuste_fechamento_equipe 
FOR UPDATE 
USING (is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar ajuste_fechamento_equipe" 
ON public.ajuste_fechamento_equipe 
FOR DELETE 
USING (is_user_approved(auth.uid()));