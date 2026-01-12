-- Tabela para o Mapeamento de Rotinas e Cultura (Sismais 10K)

CREATE TABLE public.levantamento_operacional_2024 (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Seção 4: Finalização (para identificar o colaborador)
    colaborador_nome character varying NOT NULL,
    
    -- Seção 1: Raio-X Operacional
    atividades_top5 text NOT NULL,
    ladrao_tempo text NOT NULL,
    ferramentas_uso character varying NOT NULL,
    interdependencias text NOT NULL,
    
    -- Seção 2: Diagnóstico
    start_action text NOT NULL,
    stop_action text NOT NULL,
    continue_action text NOT NULL,
    reclamacao_cliente text NOT NULL,
    
    -- Seção 3: Visão & Cultura (Scores 1-5)
    visao_papel_10k text NOT NULL,
    score_autonomia integer NOT NULL,
    score_maestria integer NOT NULL,
    score_proposito integer NOT NULL,
    score_financeiro integer NOT NULL,
    score_ambiente integer NOT NULL,
    
    -- Seção 4: Finalização
    talento_oculto character varying NULL
);

-- RLS (Regras de Negócio: Apenas Admin pode ler/escrever de outros)
ALTER TABLE public.levantamento_operacional_2024 ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário pode inserir
CREATE POLICY "Allow authenticated users to insert"
ON public.levantamento_operacional_2024
FOR INSERT TO authenticated
WITH CHECK (true);

-- Policy: Admin pode ler todos
CREATE POLICY "Admins can view all"
ON public.levantamento_operacional_2024
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

-- Policy: Usuário pode ler apenas o próprio registro
CREATE POLICY "Users can view own record"
ON public.levantamento_operacional_2024
FOR SELECT TO authenticated
USING (colaborador_nome = (SELECT nome FROM profiles WHERE user_id = auth.uid()));

-- Policy: Admin pode atualizar todos
CREATE POLICY "Admins can update all"
ON public.levantamento_operacional_2024
FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));

-- Policy: Admin pode deletar todos
CREATE POLICY "Admins can delete all"
ON public.levantamento_operacional_2024
FOR DELETE TO authenticated
USING (is_admin(auth.uid()));