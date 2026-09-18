-- ==============================================================================
-- EDUCAR360 - MÓDULO SECRETARIA: ALUNOS, RESPONSÁVEIS E ASSOCIAÇÕES
-- ==============================================================================
-- 1. Tabela de Alunos (students) com dados cadastrais completos e isolamento por tenant_id
-- 2. Tabela de Responsáveis (guardians) com indicadores financeiro e pedagógico
-- 3. Tabela associativa Aluno-Responsável (student_guardians) N:N com parentesco
-- 4. Triggers de auditoria e policies de RLS para perfis autorizados (admin_escola, coordenacao, secretaria)
-- ==============================================================================

-- 1. Tabela de Alunos
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    full_name VARCHAR(255) GENERATED ALWAYS AS (trim(first_name || ' ' || last_name)) STORED,
    cpf VARCHAR(14),
    rg VARCHAR(20),
    rg_issuer VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'uninformed')),
    photo_url TEXT,
    email VARCHAR(255),
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    postal_code VARCHAR(10),
    street VARCHAR(255),
    number VARCHAR(30),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    medical_notes TEXT,
    general_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_students_tenant ON public.students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_cpf ON public.students(tenant_id, cpf);
CREATE INDEX IF NOT EXISTS idx_students_active ON public.students(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(tenant_id, first_name, last_name);

-- 2. Tabela de Responsáveis
CREATE TABLE IF NOT EXISTS public.guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    rg VARCHAR(20),
    kinship VARCHAR(50) DEFAULT 'outro', -- pai, mae, avo, tio, tutor, outro
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    email VARCHAR(255),
    profession VARCHAR(100),
    workplace VARCHAR(150),
    postal_code VARCHAR(10),
    street VARCHAR(255),
    number VARCHAR(30),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    notes TEXT,
    is_financial_responsible BOOLEAN NOT NULL DEFAULT FALSE,
    is_pedagogical_responsible BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_guardians_tenant ON public.guardians(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guardians_cpf ON public.guardians(tenant_id, cpf);
CREATE INDEX IF NOT EXISTS idx_guardians_active ON public.guardians(tenant_id, is_active);

-- 3. Tabela Associativa Aluno <-> Responsável (N:N)
CREATE TABLE IF NOT EXISTS public.student_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
    kinship VARCHAR(50) NOT NULL DEFAULT 'outro',
    is_financial BOOLEAN NOT NULL DEFAULT FALSE,
    is_pedagogical BOOLEAN NOT NULL DEFAULT FALSE,
    is_emergency_contact BOOLEAN NOT NULL DEFAULT FALSE,
    has_custody BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(tenant_id, student_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS idx_std_guard_student ON public.student_guardians(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_std_guard_guardian ON public.student_guardians(tenant_id, guardian_id);

-- 4. Habilitar RLS em todas as tabelas
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

-- 5. Policies de Isolamento Estrito por Tenant para Students
CREATE POLICY Tenant isolation for students SELECT
ON public.students FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

CREATE POLICY Tenant staff can INSERT students
ON public.students FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

CREATE POLICY Tenant staff can UPDATE students
ON public.students FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

CREATE POLICY Tenant staff can DELETE students
ON public.students FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'secretaria'))
    OR is_platform_admin()
);

-- 6. Policies de Isolamento Estrito por Tenant para Guardians
CREATE POLICY Tenant isolation for guardians SELECT
ON public.guardians FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

CREATE POLICY Tenant staff can INSERT guardians
ON public.guardians FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

CREATE POLICY Tenant staff can UPDATE guardians
ON public.guardians FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

CREATE POLICY Tenant staff can DELETE guardians
ON public.guardians FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'secretaria'))
    OR is_platform_admin()
);

-- 7. Policies de Isolamento Estrito por Tenant para Student_Guardians
CREATE POLICY Tenant isolation for student_guardians SELECT
ON public.student_guardians FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

CREATE POLICY Tenant staff can INSERT student_guardians
ON public.student_guardians FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

CREATE POLICY Tenant staff can UPDATE student_guardians
ON public.student_guardians FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

CREATE POLICY Tenant staff can DELETE student_guardians
ON public.student_guardians FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'secretaria'))
    OR is_platform_admin()
);
