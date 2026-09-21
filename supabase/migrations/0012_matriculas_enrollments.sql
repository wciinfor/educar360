-- ==============================================================================
-- EDUCAR360 - MÓDULO MATRÍCULAS: GESTÃO DO CICLO DE MATRÍCULA ESCOLAR
-- ==============================================================================
-- 1. Criação da tabela public.enrollments com isolamento por tenant_id
-- 2. Associação estrita com students e guardians existentes (reutilização)
-- 3. Controle de estados: pre_matricula, em_analise, matriculado, cancelado, transferido
-- 4. Habilitação de RLS com permissões para admin_escola, coordenacao, secretaria, comercial, financeiro
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
    enrollment_code VARCHAR(50) NOT NULL,
    academic_year VARCHAR(10) NOT NULL DEFAULT '2026',
    course_name VARCHAR(100) NOT NULL,
    grade_level VARCHAR(100) NOT NULL,
    shift VARCHAR(20) NOT NULL DEFAULT 'matutino' CHECK (shift IN ('matutino', 'vespertino', 'noturno', 'integral')),
    status VARCHAR(30) NOT NULL DEFAULT 'pre_matricula' CHECK (status IN ('pre_matricula', 'em_analise', 'matriculado', 'cancelado', 'transferido')),
    status_notes TEXT,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    exit_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tenant_enrollment_code UNIQUE (tenant_id, enrollment_code)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_enrollments_tenant ON public.enrollments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_guardian ON public.enrollments(tenant_id, guardian_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_year ON public.enrollments(tenant_id, academic_year);

-- Habilitar Row Level Security
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- 1. Leitura isolada por tenant
DROP POLICY IF EXISTS "Tenant isolation for enrollments SELECT" ON public.enrollments;
CREATE POLICY "Tenant isolation for enrollments SELECT"
ON public.enrollments FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

-- 2. Inserção autorizada para equipe escolar (admin_escola, coordenacao, secretaria, comercial)
DROP POLICY IF EXISTS "Tenant staff can INSERT enrollments" ON public.enrollments;
CREATE POLICY "Tenant staff can INSERT enrollments"
ON public.enrollments FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'comercial'))
    OR is_platform_admin()
);

-- 3. Atualização de status e dados da matrícula
DROP POLICY IF EXISTS "Tenant staff can UPDATE enrollments" ON public.enrollments;
CREATE POLICY "Tenant staff can UPDATE enrollments"
ON public.enrollments FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'comercial'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'comercial'))
    OR is_platform_admin()
);

-- 4. Exclusão apenas para gestores (admin_escola ou secretaria)
DROP POLICY IF EXISTS "Tenant staff can DELETE enrollments" ON public.enrollments;
CREATE POLICY "Tenant staff can DELETE enrollments"
ON public.enrollments FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'secretaria'))
    OR is_platform_admin()
);
