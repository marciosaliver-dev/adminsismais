-- Adicionando campo para as URLs das fotos do mural dos sonhos
ALTER TABLE public.levantamento_operacional_2024
ADD COLUMN fotos_sonhos text[] DEFAULT '{}';

-- Criando o bucket para armazenamento das imagens (caso não exista)
-- Nota: A criação de buckets via SQL requer permissões de admin, mas deixo o comando como referência
-- INSERT INTO storage.buckets (id, name, public) VALUES ('sonhos', 'sonhos', true) ON CONFLICT (id) DO NOTHING;