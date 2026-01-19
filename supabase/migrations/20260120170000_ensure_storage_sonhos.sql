-- Garante que o bucket 'sonhos' existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('sonhos', 'sonhos', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Remove políticas antigas para evitar conflitos/duplicatas
DROP POLICY IF EXISTS "Fotos dos sonhos são públicas" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem fazer upload de suas fotos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar suas fotos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar suas fotos" ON storage.objects;

-- Política de Leitura: Qualquer pessoa pode ver as fotos (necessário para o Mural público/admin)
CREATE POLICY "Fotos dos sonhos são públicas"
ON storage.objects FOR SELECT
USING ( bucket_id = 'sonhos' );

-- Política de Upload: Apenas usuários autenticados
CREATE POLICY "Usuários podem fazer upload de suas fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'sonhos' );

-- Política de Atualização: Apenas o dono do arquivo (pasta com user_id) ou admins
-- Nota: O caminho do arquivo é user_id/filename. (storage.foldername(name))[1] pega a primeira parte.
CREATE POLICY "Usuários podem atualizar suas fotos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( 
  bucket_id = 'sonhos' AND (
    (storage.foldername(name))[1] = auth.uid()::text 
    OR 
    public.is_admin(auth.uid())
  )
);

-- Política de Deleção: Apenas o dono do arquivo ou admins
CREATE POLICY "Usuários podem deletar suas fotos"
ON storage.objects FOR DELETE
TO authenticated
USING ( 
  bucket_id = 'sonhos' AND (
    (storage.foldername(name))[1] = auth.uid()::text 
    OR 
    public.is_admin(auth.uid())
  )
);