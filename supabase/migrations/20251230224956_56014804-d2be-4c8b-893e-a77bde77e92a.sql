-- 1. Criar Enum de Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Criar Tabela de Roles de Usuario
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Criar Tabela de Modulos do Sistema
CREATE TABLE public.modulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    icone TEXT,
    rota TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

-- 4. Criar Tabela de Funcionalidades por Modulo
CREATE TABLE public.funcionalidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo_id UUID REFERENCES public.modulos(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    codigo TEXT NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funcionalidades ENABLE ROW LEVEL SECURITY;

-- 5. Criar Tabela de Permissoes de Usuario
CREATE TABLE public.permissoes_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    funcionalidade_id UUID REFERENCES public.funcionalidades(id) ON DELETE CASCADE NOT NULL,
    permitido BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, funcionalidade_id)
);

ALTER TABLE public.permissoes_usuario ENABLE ROW LEVEL SECURITY;

-- 6. Funcao para verificar se usuario tem role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 7. Funcao para verificar se usuario eh admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- 8. Funcao para verificar permissao em funcionalidade
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _codigo TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT permitido FROM public.permissoes_usuario pu
     JOIN public.funcionalidades f ON f.id = pu.funcionalidade_id
     WHERE pu.user_id = _user_id AND f.codigo = _codigo),
    public.is_admin(_user_id)
  )
$$;

-- 9. RLS Policies para user_roles
CREATE POLICY "Admins podem ver todos os roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Usuarios podem ver proprio role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem inserir roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- 10. RLS Policies para modulos
CREATE POLICY "Usuarios aprovados podem ver modulos"
ON public.modulos FOR SELECT
TO authenticated
USING (is_user_approved(auth.uid()));

CREATE POLICY "Admins podem gerenciar modulos"
ON public.modulos FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- 11. RLS Policies para funcionalidades
CREATE POLICY "Usuarios aprovados podem ver funcionalidades"
ON public.funcionalidades FOR SELECT
TO authenticated
USING (is_user_approved(auth.uid()));

CREATE POLICY "Admins podem gerenciar funcionalidades"
ON public.funcionalidades FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- 12. RLS Policies para permissoes_usuario
CREATE POLICY "Admins podem ver todas permissoes"
ON public.permissoes_usuario FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Usuarios podem ver proprias permissoes"
ON public.permissoes_usuario FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar permissoes"
ON public.permissoes_usuario FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- 13. Inserir Modulos iniciais
INSERT INTO public.modulos (nome, descricao, icone, rota, ordem) VALUES
('Comissões', 'Gestão de comissões de vendas', 'Calculator', '/comissoes', 1),
('Extrato Asaas', 'Gestão de extratos financeiros', 'FileSpreadsheet', '/extrato-asaas', 2),
('Administração', 'Painel administrativo', 'Settings', '/admin', 3);

-- 14. Inserir Funcionalidades
INSERT INTO public.funcionalidades (modulo_id, nome, codigo, descricao) VALUES
((SELECT id FROM modulos WHERE nome = 'Comissões'), 'Visualizar', 'comissoes.visualizar', 'Ver fechamentos e histórico'),
((SELECT id FROM modulos WHERE nome = 'Comissões'), 'Criar Fechamento', 'comissoes.criar', 'Importar e criar novos fechamentos'),
((SELECT id FROM modulos WHERE nome = 'Comissões'), 'Editar Configurações', 'comissoes.configurar', 'Alterar faixas e metas'),
((SELECT id FROM modulos WHERE nome = 'Extrato Asaas'), 'Visualizar', 'extrato.visualizar', 'Ver extratos importados'),
((SELECT id FROM modulos WHERE nome = 'Extrato Asaas'), 'Importar', 'extrato.importar', 'Importar novos extratos'),
((SELECT id FROM modulos WHERE nome = 'Administração'), 'Gerenciar Usuários', 'admin.usuarios', 'Aprovar e gerenciar usuários'),
((SELECT id FROM modulos WHERE nome = 'Administração'), 'Gerenciar Permissões', 'admin.permissoes', 'Definir permissões por usuário');

-- 15. Definir usuario atual como Admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('c7506e77-18a0-4669-89c8-8b85e6b8e52b', 'admin');

-- 16. Atualizar trigger handle_new_user para criar role padrao
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Criar profile
  INSERT INTO public.profiles (user_id, nome, email, departamento, aprovado)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data ->> 'departamento',
    false
  );
  
  -- Criar role padrao
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;