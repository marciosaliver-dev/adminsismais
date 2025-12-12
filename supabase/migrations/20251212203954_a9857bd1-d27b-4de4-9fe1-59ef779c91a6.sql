-- Tabela 1: FaixaComissao
CREATE TABLE public.faixa_comissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  mrr_min DECIMAL NOT NULL DEFAULT 0,
  mrr_max DECIMAL,
  percentual DECIMAL NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela 2: ConfiguracaoComissao
CREATE TABLE public.configuracao_comissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela 3: FechamentoComissao
CREATE TABLE public.fechamento_comissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_referencia DATE NOT NULL,
  data_importacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_vendas INTEGER NOT NULL DEFAULT 0,
  total_mrr DECIMAL NOT NULL DEFAULT 0,
  meta_batida BOOLEAN NOT NULL DEFAULT false,
  arquivo_nome TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'fechado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela 4: VendaImportada
CREATE TABLE public.venda_importada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fechamento_id UUID NOT NULL REFERENCES public.fechamento_comissao(id) ON DELETE CASCADE,
  data_contrato DATE,
  plataforma TEXT,
  num_contrato TEXT,
  cliente TEXT,
  email TEXT,
  plano TEXT,
  tipo_venda TEXT,
  intervalo TEXT,
  vendedor TEXT,
  valor_assinatura DECIMAL NOT NULL DEFAULT 0,
  valor_mrr DECIMAL NOT NULL DEFAULT 0,
  valor_adesao DECIMAL NOT NULL DEFAULT 0,
  conta_comissao BOOLEAN NOT NULL DEFAULT true,
  conta_faixa BOOLEAN NOT NULL DEFAULT true,
  conta_meta BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela 5: ComissaoCalculada
CREATE TABLE public.comissao_calculada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fechamento_id UUID NOT NULL REFERENCES public.fechamento_comissao(id) ON DELETE CASCADE,
  vendedor TEXT NOT NULL,
  qtd_vendas INTEGER NOT NULL DEFAULT 0,
  mrr_total DECIMAL NOT NULL DEFAULT 0,
  mrr_comissao DECIMAL NOT NULL DEFAULT 0,
  faixa_nome TEXT,
  percentual DECIMAL NOT NULL DEFAULT 0,
  valor_comissao DECIMAL NOT NULL DEFAULT 0,
  bonus_anual DECIMAL NOT NULL DEFAULT 0,
  bonus_meta_equipe DECIMAL NOT NULL DEFAULT 0,
  bonus_empresa DECIMAL NOT NULL DEFAULT 0,
  total_receber DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_venda_importada_fechamento ON public.venda_importada(fechamento_id);
CREATE INDEX idx_venda_importada_vendedor ON public.venda_importada(vendedor);
CREATE INDEX idx_comissao_calculada_fechamento ON public.comissao_calculada(fechamento_id);
CREATE INDEX idx_comissao_calculada_vendedor ON public.comissao_calculada(vendedor);
CREATE INDEX idx_fechamento_mes ON public.fechamento_comissao(mes_referencia);

-- Enable RLS
ALTER TABLE public.faixa_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamento_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_importada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissao_calculada ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Acesso público para leitura (sistema interno)
CREATE POLICY "Allow public read access on faixa_comissao" ON public.faixa_comissao FOR SELECT USING (true);
CREATE POLICY "Allow public read access on configuracao_comissao" ON public.configuracao_comissao FOR SELECT USING (true);
CREATE POLICY "Allow public read access on fechamento_comissao" ON public.fechamento_comissao FOR SELECT USING (true);
CREATE POLICY "Allow public read access on venda_importada" ON public.venda_importada FOR SELECT USING (true);
CREATE POLICY "Allow public read access on comissao_calculada" ON public.comissao_calculada FOR SELECT USING (true);

-- RLS Policies - Permitir insert/update/delete para usuários autenticados
CREATE POLICY "Allow authenticated insert on faixa_comissao" ON public.faixa_comissao FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on faixa_comissao" ON public.faixa_comissao FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete on faixa_comissao" ON public.faixa_comissao FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on configuracao_comissao" ON public.configuracao_comissao FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on configuracao_comissao" ON public.configuracao_comissao FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete on configuracao_comissao" ON public.configuracao_comissao FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on fechamento_comissao" ON public.fechamento_comissao FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on fechamento_comissao" ON public.fechamento_comissao FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete on fechamento_comissao" ON public.fechamento_comissao FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on venda_importada" ON public.venda_importada FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on venda_importada" ON public.venda_importada FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete on venda_importada" ON public.venda_importada FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on comissao_calculada" ON public.comissao_calculada FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on comissao_calculada" ON public.comissao_calculada FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete on comissao_calculada" ON public.comissao_calculada FOR DELETE TO authenticated USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_faixa_comissao_updated_at BEFORE UPDATE ON public.faixa_comissao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_configuracao_comissao_updated_at BEFORE UPDATE ON public.configuracao_comissao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fechamento_comissao_updated_at BEFORE UPDATE ON public.fechamento_comissao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_venda_importada_updated_at BEFORE UPDATE ON public.venda_importada FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comissao_calculada_updated_at BEFORE UPDATE ON public.comissao_calculada FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();