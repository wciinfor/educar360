-- ==============================================================================
-- EDUCAR360 - FUNDAÇÃO MULTI-TENANT, AUTENTICAÇÃO, RBAC E AUDITORIA
-- ==============================================================================
-- Regra central: Cada tenant representa UMA única instituição escolar.
-- Todas as entidades de negócio devem possuir tenant_id e isolamento rigoroso por RLS.
-- ==============================================================================

-- 1. Extensões essenciais
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Tenants (Instituições Escolares)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    slug VARCHAR(100) NOT NULL UNIQUE,
    cnpj VARCHAR(18) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'inactive')),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);

-- 3. Tabela de Perfis de Usuários (Profiles vinculados ao auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(30),
    is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. Tabela de Associação Usuário-Tenant com RBAC
-- Papéis escolares padrão:
-- - admin_escola (diretoria / mantenedor da escola)
-- - coordenacao (coordenação pedagógica)
-- - secretaria (secretaria escolar / atendimento)
-- - financeiro (setor financeiro / tesouraria)
-- - professor (corpo docente)
-- - responsavel (pai, mãe ou responsável legal)
-- - aluno (discente)
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (
        role IN (
            'admin_escola',
            'coordenacao',
            'secretaria',
            'financeiro',
            'professor',
            'responsavel',
            'aluno'
        )
    ),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    custom_permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_lookup ON public.tenant_users(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON public.tenant_users(tenant_id, role);

-- 5. Tabela de Auditoria Estruturada (Audit Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- ex: 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'
    entity_name VARCHAR(100) NOT NULL, -- ex: 'matriculas', 'alunos', 'mensalidades'
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(tenant_id, entity_name, entity_id);

-- ==============================================================================
-- 6. Funções de Segurança e Contexto de Tenant
-- ==============================================================================

-- Obter os tenants aos quais o usuário autenticado pertence
CREATE OR REPLACE FUNCTION public.get_auth_tenant_ids()
RETURNS TABLE (tenant_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tu.tenant_id
    FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid()
      AND tu.is_active = TRUE;
$$;

-- Obter papel do usuário no tenant especificado
CREATE OR REPLACE FUNCTION public.get_auth_role_in_tenant(p_tenant_id UUID)
RETURNS VARCHAR(50)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tu.role
    FROM public.tenant_users tu
    WHERE tu.tenant_id = p_tenant_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = TRUE
    LIMIT 1;
$$;

-- Verificar se o usuário autenticado é admin da plataforma
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT p.is_platform_admin FROM public.profiles p WHERE p.id = auth.uid()),
        FALSE
    );
$$;

-- ==============================================================================
-- 7. Row-Level Security (RLS) - Isolamento Rigoroso
-- ==============================================================================

-- A) Tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_select_policy"
ON public.tenants
FOR SELECT
USING (
    public.is_platform_admin()
    OR id IN (SELECT get_auth_tenant_ids())
);

CREATE POLICY "tenants_update_policy"
ON public.tenants
FOR UPDATE
USING (
    public.is_platform_admin()
    OR (id IN (SELECT get_auth_tenant_ids()) AND public.get_auth_role_in_tenant(id) = 'admin_escola')
)
WITH CHECK (
    public.is_platform_admin()
    OR (id IN (SELECT get_auth_tenant_ids()) AND public.get_auth_role_in_tenant(id) = 'admin_escola')
);

-- B) Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own_or_same_tenant"
ON public.profiles
FOR SELECT
USING (
    id = auth.uid()
    OR public.is_platform_admin()
    OR id IN (
        SELECT tu2.user_id
        FROM public.tenant_users tu1
        JOIN public.tenant_users tu2 ON tu1.tenant_id = tu2.tenant_id
        WHERE tu1.user_id = auth.uid()
          AND tu1.is_active = TRUE
          AND tu2.is_active = TRUE
    )
);

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- C) Tenant Users
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_users_select_policy"
ON public.tenant_users
FOR SELECT
USING (
    public.is_platform_admin()
    OR tenant_id IN (SELECT get_auth_tenant_ids())
);

CREATE POLICY "tenant_users_admin_write_policy"
ON public.tenant_users
FOR ALL
USING (
    public.is_platform_admin()
    OR (
        tenant_id IN (SELECT get_auth_tenant_ids())
        AND public.get_auth_role_in_tenant(tenant_id) = 'admin_escola'
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR (
        tenant_id IN (SELECT get_auth_tenant_ids())
        AND public.get_auth_role_in_tenant(tenant_id) = 'admin_escola'
    )
);

-- D) Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_policy"
ON public.audit_logs
FOR SELECT
USING (
    public.is_platform_admin()
    OR (
        tenant_id IN (SELECT get_auth_tenant_ids())
        AND public.get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao')
    )
);

CREATE POLICY "audit_logs_insert_policy"
ON public.audit_logs
FOR INSERT
WITH CHECK (
    tenant_id IN (SELECT get_auth_tenant_ids())
);

-- ==============================================================================
-- 8. Trigger para criação automática de Profile ao registrar no Supabase Auth
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
