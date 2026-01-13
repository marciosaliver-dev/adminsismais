-- Garante que o RLS está ativo
ALTER TABLE public.levantamento_operacional_2024 ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Enable insert for all users" ON public.levantamento_operacional_2024;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.levantamento_operacional_2024;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.levantamento_operacional_2024;

-- 1. Permite que QUALQUER PESSOA (mesmo deslogada) envie o formulário
-- Necessário pois a rota /levantamento-10k é pública
CREATE POLICY "Enable insert for all users" 
ON public.levantamento_operacional_2024 
FOR INSERT 
WITH CHECK (true);

-- 2. Permite que APENAS usuários autenticados (como você) vejam os resultados
CREATE POLICY "Enable read for authenticated users" 
ON public.levantamento_operacional_2024 
FOR SELECT 
TO authenticated 
USING (true);

-- 3. Permite que usuários autenticados atualizem ou deletem se necessário (opcional)
CREATE POLICY "Enable update for authenticated users" 
ON public.levantamento_operacional_2024 
FOR UPDATE 
TO authenticated 
USING (true);