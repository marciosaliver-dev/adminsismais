-- Criar tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  departamento TEXT,
  aprovado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuários podem ver próprio perfil"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir próprio perfil"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar próprio perfil"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Função para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, departamento, aprovado)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data ->> 'departamento',
    false
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil no signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para verificar se usuário está aprovado
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT aprovado FROM public.profiles WHERE user_id = _user_id),
    false
  )
$$;

-- ATUALIZAR POLÍTICAS DAS TABELAS EXISTENTES PARA EXIGIR AUTENTICAÇÃO E APROVAÇÃO

-- comissao_calculada
DROP POLICY IF EXISTS "Allow public select on comissao_calculada" ON public.comissao_calculada;
DROP POLICY IF EXISTS "Allow public insert on comissao_calculada" ON public.comissao_calculada;
DROP POLICY IF EXISTS "Allow public update on comissao_calculada" ON public.comissao_calculada;
DROP POLICY IF EXISTS "Allow public delete on comissao_calculada" ON public.comissao_calculada;

CREATE POLICY "Usuários aprovados podem ver comissao_calculada"
ON public.comissao_calculada FOR SELECT
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir comissao_calculada"
ON public.comissao_calculada FOR INSERT
TO authenticated
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar comissao_calculada"
ON public.comissao_calculada FOR UPDATE
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar comissao_calculada"
ON public.comissao_calculada FOR DELETE
TO authenticated
USING (public.is_user_approved(auth.uid()));

-- configuracao_comissao
DROP POLICY IF EXISTS "Allow public read access on configuracao_comissao" ON public.configuracao_comissao;
DROP POLICY IF EXISTS "Allow authenticated insert on configuracao_comissao" ON public.configuracao_comissao;
DROP POLICY IF EXISTS "Allow authenticated update on configuracao_comissao" ON public.configuracao_comissao;
DROP POLICY IF EXISTS "Allow authenticated delete on configuracao_comissao" ON public.configuracao_comissao;

CREATE POLICY "Usuários aprovados podem ver configuracao_comissao"
ON public.configuracao_comissao FOR SELECT
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir configuracao_comissao"
ON public.configuracao_comissao FOR INSERT
TO authenticated
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar configuracao_comissao"
ON public.configuracao_comissao FOR UPDATE
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar configuracao_comissao"
ON public.configuracao_comissao FOR DELETE
TO authenticated
USING (public.is_user_approved(auth.uid()));

-- extrato_asaas
DROP POLICY IF EXISTS "Allow public select on extrato_asaas" ON public.extrato_asaas;
DROP POLICY IF EXISTS "Allow public insert on extrato_asaas" ON public.extrato_asaas;
DROP POLICY IF EXISTS "Allow public update on extrato_asaas" ON public.extrato_asaas;
DROP POLICY IF EXISTS "Allow public delete on extrato_asaas" ON public.extrato_asaas;

CREATE POLICY "Usuários aprovados podem ver extrato_asaas"
ON public.extrato_asaas FOR SELECT
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir extrato_asaas"
ON public.extrato_asaas FOR INSERT
TO authenticated
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar extrato_asaas"
ON public.extrato_asaas FOR UPDATE
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar extrato_asaas"
ON public.extrato_asaas FOR DELETE
TO authenticated
USING (public.is_user_approved(auth.uid()));

-- faixa_comissao
DROP POLICY IF EXISTS "Allow public read access on faixa_comissao" ON public.faixa_comissao;
DROP POLICY IF EXISTS "Allow authenticated insert on faixa_comissao" ON public.faixa_comissao;
DROP POLICY IF EXISTS "Allow authenticated update on faixa_comissao" ON public.faixa_comissao;
DROP POLICY IF EXISTS "Allow authenticated delete on faixa_comissao" ON public.faixa_comissao;

CREATE POLICY "Usuários aprovados podem ver faixa_comissao"
ON public.faixa_comissao FOR SELECT
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir faixa_comissao"
ON public.faixa_comissao FOR INSERT
TO authenticated
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar faixa_comissao"
ON public.faixa_comissao FOR UPDATE
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar faixa_comissao"
ON public.faixa_comissao FOR DELETE
TO authenticated
USING (public.is_user_approved(auth.uid()));

-- fechamento_comissao
DROP POLICY IF EXISTS "Allow public select on fechamento_comissao" ON public.fechamento_comissao;
DROP POLICY IF EXISTS "Allow public insert on fechamento_comissao" ON public.fechamento_comissao;
DROP POLICY IF EXISTS "Allow public update on fechamento_comissao" ON public.fechamento_comissao;
DROP POLICY IF EXISTS "Allow public delete on fechamento_comissao" ON public.fechamento_comissao;

CREATE POLICY "Usuários aprovados podem ver fechamento_comissao"
ON public.fechamento_comissao FOR SELECT
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir fechamento_comissao"
ON public.fechamento_comissao FOR INSERT
TO authenticated
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar fechamento_comissao"
ON public.fechamento_comissao FOR UPDATE
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar fechamento_comissao"
ON public.fechamento_comissao FOR DELETE
TO authenticated
USING (public.is_user_approved(auth.uid()));

-- importacoes_extrato
DROP POLICY IF EXISTS "Allow public select on importacoes_extrato" ON public.importacoes_extrato;
DROP POLICY IF EXISTS "Allow public insert on importacoes_extrato" ON public.importacoes_extrato;
DROP POLICY IF EXISTS "Allow public update on importacoes_extrato" ON public.importacoes_extrato;
DROP POLICY IF EXISTS "Allow public delete on importacoes_extrato" ON public.importacoes_extrato;

CREATE POLICY "Usuários aprovados podem ver importacoes_extrato"
ON public.importacoes_extrato FOR SELECT
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir importacoes_extrato"
ON public.importacoes_extrato FOR INSERT
TO authenticated
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar importacoes_extrato"
ON public.importacoes_extrato FOR UPDATE
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar importacoes_extrato"
ON public.importacoes_extrato FOR DELETE
TO authenticated
USING (public.is_user_approved(auth.uid()));

-- meta_mensal
DROP POLICY IF EXISTS "Allow public select on meta_mensal" ON public.meta_mensal;
DROP POLICY IF EXISTS "Allow public insert on meta_mensal" ON public.meta_mensal;
DROP POLICY IF EXISTS "Allow public update on meta_mensal" ON public.meta_mensal;
DROP POLICY IF EXISTS "Allow public delete on meta_mensal" ON public.meta_mensal;

CREATE POLICY "Usuários aprovados podem ver meta_mensal"
ON public.meta_mensal FOR SELECT
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir meta_mensal"
ON public.meta_mensal FOR INSERT
TO authenticated
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar meta_mensal"
ON public.meta_mensal FOR UPDATE
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar meta_mensal"
ON public.meta_mensal FOR DELETE
TO authenticated
USING (public.is_user_approved(auth.uid()));

-- venda_importada
DROP POLICY IF EXISTS "Allow public select on venda_importada" ON public.venda_importada;
DROP POLICY IF EXISTS "Allow public insert on venda_importada" ON public.venda_importada;
DROP POLICY IF EXISTS "Allow public update on venda_importada" ON public.venda_importada;
DROP POLICY IF EXISTS "Allow public delete on venda_importada" ON public.venda_importada;

CREATE POLICY "Usuários aprovados podem ver venda_importada"
ON public.venda_importada FOR SELECT
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem inserir venda_importada"
ON public.venda_importada FOR INSERT
TO authenticated
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem atualizar venda_importada"
ON public.venda_importada FOR UPDATE
TO authenticated
USING (public.is_user_approved(auth.uid()));

CREATE POLICY "Usuários aprovados podem deletar venda_importada"
ON public.venda_importada FOR DELETE
TO authenticated
USING (public.is_user_approved(auth.uid()));