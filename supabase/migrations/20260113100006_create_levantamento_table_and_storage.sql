-- Criar a tabela de levantamento operacional
CREATE TABLE IF NOT EXISTS public.levantamento_operacional_2024 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    colaborador_nome TEXT NOT NULL,
    funcao_atual TEXT,
    satisfacao_trabalho INTEGER,
    motivo_satisfacao_baixa TEXT,
    talento_oculto TEXT,
    rotina_diaria TEXT NOT NULL,
    expectativa_empresa TEXT NOT NULL,
    definicao_sucesso TEXT NOT NULL,
    sentimento_valorizacao TEXT NOT NULL,
    atividades_top5 TEXT NOT NULL,
    ladrao_tempo TEXT NOT NULL,
    ferramentas_uso TEXT NOT NULL,
    interdependencias TEXT NOT NULL,
    start_action TEXT NOT NULL,
    stop_action TEXT NOT NULL,
    continue_action TEXT NOT NULL,
    reclamacao_cliente TEXT NOT NULL,
    prioridades_setor TEXT NOT NULL,
    visao_papel_10k TEXT NOT NULL,
    falta_plano_2026 TEXT NOT NULL,
    falta_metas_2025 TEXT NOT NULL,
    score_autonomia INTEGER NOT NULL,
    score_maestria INTEGER NOT NULL,
    score_proposito INTEGER NOT NULL,
    score_financeiro INTEGER NOT NULL,
    score_ambiente INTEGER NOT NULL,
    interesse_lideranca BOOLEAN NOT NULL,
    motivo_lideranca TEXT,
    papel_bom_lider TEXT,
    maior_sonho TEXT NOT NULL,
    fotos_sonhos TEXT[] DEFAULT '{}'
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.levantamento_operacional_2024 ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir que qualquer pessoa insira dados (público)
-- Como o formulário é um link público para os colaboradores, permitimos o INSERT anônimo
CREATE POLICY "Permitir inserção pública" 
ON public.levantamento_operacional_2024 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Criar política para que apenas usuários autenticados vejam os resultados (opcional, ajuste conforme necessário)
CREATE POLICY "Permitir leitura para usuários autenticados" 
ON public.levantamento_operacional_2024 
FOR SELECT 
TO authenticated 
USING (true);

-- --- Configuração do Storage (Fotos dos Sonhos) ---

-- Criar o bucket 'sonhos' se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sonhos', 'sonhos', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir upload público (ou autenticado) no bucket sonhos
CREATE POLICY "Permitir upload de fotos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'sonhos');

-- Política para permitir leitura pública das fotos
CREATE POLICY "Permitir leitura pública de fotos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'sonhos');