-- ==============================================================================
-- EDUCAR360 - MÓDULO ACADÊMICO: ESTRUTURA ACADÊMICA (FASE 1)
-- ==============================================================================
-- 1. Criação das tabelas:
--    - public.courses (cursos / segmentos de ensino)
--    - public.series (séries / anos escolares vinculados a cursos)
--    - public.school_classes (turmas vinculadas a séries, com capacidade e turno)
-- 2. Constraints de integridade, unicidade por tenant e chaves estrangeiras
-- 3. Índices de performance e Row Level Security (RLS) com isolamento por tenant
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CURSOS / SEGMENTOS DE ENSINO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_course_tenant_name UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_courses_tenant ON public.courses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_courses_active ON public.courses(tenant_id, is_active);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for courses SELECT" ON public.courses;
CREATE POLICY "Tenant isolation for courses SELECT"
ON public.courses FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can INSERT courses" ON public.courses;
CREATE POLICY "Tenant staff can INSERT courses"
ON public.courses FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can UPDATE courses" ON public.courses;
CREATE POLICY "Tenant staff can UPDATE courses"
ON public.courses FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can DELETE courses" ON public.courses;
CREATE POLICY "Tenant staff can DELETE courses"
ON public.courses FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 2. SÉRIES / ANOS ESCOLARES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_series_course_name UNIQUE (tenant_id, course_id, name)
);

CREATE INDEX IF NOT EXISTS idx_series_tenant ON public.series(tenant_id);
CREATE INDEX IF NOT EXISTS idx_series_course ON public.series(tenant_id, course_id);
CREATE INDEX IF NOT EXISTS idx_series_active ON public.series(tenant_id, is_active);

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for series SELECT" ON public.series;
CREATE POLICY "Tenant isolation for series SELECT"
ON public.series FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can INSERT series" ON public.series;
CREATE POLICY "Tenant staff can INSERT series"
ON public.series FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can UPDATE series" ON public.series;
CREATE POLICY "Tenant staff can UPDATE series"
ON public.series FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can DELETE series" ON public.series;
CREATE POLICY "Tenant staff can DELETE series"
ON public.series FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 3. TURMAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    shift VARCHAR(30) NOT NULL CHECK (shift IN ('matutino', 'vespertino', 'noturno', 'integral')),
    capacity INTEGER NOT NULL DEFAULT 35 CHECK (capacity > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_class_tenant_year_series_name UNIQUE (tenant_id, academic_year, series_id, name)
);

CREATE INDEX IF NOT EXISTS idx_classes_tenant ON public.school_classes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classes_series ON public.school_classes(tenant_id, series_id);
CREATE INDEX IF NOT EXISTS idx_classes_year ON public.school_classes(tenant_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_classes_active ON public.school_classes(tenant_id, is_active);

ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for school_classes SELECT" ON public.school_classes;
CREATE POLICY "Tenant isolation for school_classes SELECT"
ON public.school_classes FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can INSERT school_classes" ON public.school_classes;
CREATE POLICY "Tenant staff can INSERT school_classes"
ON public.school_classes FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can UPDATE school_classes" ON public.school_classes;
CREATE POLICY "Tenant staff can UPDATE school_classes"
ON public.school_classes FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can DELETE school_classes" ON public.school_classes;
CREATE POLICY "Tenant staff can DELETE school_classes"
ON public.school_classes FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);
