-- Adicionar política para permitir leitura pública de colaboradores ativos
-- Isso é necessário para a página pública de lançamento de vendas

CREATE POLICY "Permitir leitura pública de colaboradores ativos"
ON public.colaboradores
FOR SELECT
USING (ativo = true);

-- Também precisamos permitir inserção pública em vendas_servicos
-- para que usuários não autenticados possam registrar vendas
CREATE POLICY "Permitir inserção pública em vendas_servicos"
ON public.vendas_servicos
FOR INSERT
WITH CHECK (status = 'pendente');