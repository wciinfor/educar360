-- ==============================================================================
-- EDUCAR360 - VIDA ACADÊMICA | ETAPA 2: AVALIAÇÕES, NOTAS E BOLETIM ESCOLAR
-- ==============================================================================
-- 1. Tabelas:
--    - public.academic_settings (regras de cálculo, média para aprovação, arredondamento)
--    - public.academic_assessments (avaliações / trabalhos / provas por turma e disciplina)
--    - public.student_assessment_grades (notas dos alunos por avaliação)
--    - public.academic_period_closings (fechamento/trancamento de períodos letivos)
-- 2. Constraints de integridade, checagem de limites de notas e unicidade
-- 3. Índices de performance multi-tenant
-- 4. Políticas Row Level Security (RLS) com isolamento rigoroso por tenant
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CONFIGURAÇÕES ACADÊMICAS DO TENANT (MÉDIAS, FÓRMULAS, ARREDONDAMENTO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    passing_grade NUMERIC(4,2) NOT NULL DEFAULT 6.00 CHECK (passing_grade >= 0 AND passing_grade <= 100),
    max_score_per_period NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (max_score_per_period > 0),
    calculation_formula VARCHAR(30) NOT NULL DEFAULT 'media_aritmetica' CHECK (calculation_formula IN ('media_aritmetica', 'media_ponderada', 'soma_pontos')),
    rounding_rule VARCHAR(30) NOT NULL DEFAULT 'padrao' CHECK (rounding_rule IN ('padrao', 'baixo', 'cima', 'sem_arredondamento')),
    decimal_places INT NOT NULL DEFAULT 1 CHECK (decimal_places BETWEEN 0 AND 2),
    recovery_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    recovery_replaces_lowest BOOLEAN NOT NULL DEFAULT TRUE,
    min_attendance_percentage NUMERIC(4,1) NOT NULL DEFAULT 75.0 CHECK (min_attendance_percentage >= 0 AND min_attendance_percentage <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_academic_settings_tenant ON public.academic_settings(tenant_id);

ALTER TABLE public.academic_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for academic_settings SELECT" ON public.academic_settings;
CREATE POLICY "Tenant isolation for academic_settings SELECT"
ON public.academic_settings FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant admin/coord can INSERT/UPDATE academic_settings" ON public.academic_settings;
CREATE POLICY "Tenant admin/coord can INSERT/UPDATE academic_settings"
ON public.academic_settings FOR ALL
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 2. FECHAMENTO DE PERÍODOS LETIVOS (TRAVA DE SEGURANÇA CONTRA EDIÇÕES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_period_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
    academic_period VARCHAR(50) NOT NULL,
    subject_name VARCHAR(150),
    is_closed BOOLEAN NOT NULL DEFAULT TRUE,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    closure_notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_period_closing ON public.academic_period_closings (tenant_id, class_id, academic_period, COALESCE(subject_name, ''));

CREATE INDEX IF NOT EXISTS idx_period_closings_tenant ON public.academic_period_closings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_period_closings_class ON public.academic_period_closings(tenant_id, class_id);
CREATE INDEX IF NOT EXISTS idx_period_closings_period ON public.academic_period_closings(tenant_id, academic_period);

ALTER TABLE public.academic_period_closings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for academic_period_closings SELECT" ON public.academic_period_closings;
CREATE POLICY "Tenant isolation for academic_period_closings SELECT"
ON public.academic_period_closings FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can manage academic_period_closings" ON public.academic_period_closings;
CREATE POLICY "Tenant staff can manage academic_period_closings"
ON public.academic_period_closings FOR ALL
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 3. AVALIAÇÕES ACADÊMICAS (ACADEMIC ASSESSMENTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE RESTRICT,
    subject_name VARCHAR(150) NOT NULL,
    academic_period VARCHAR(50) NOT NULL DEFAULT '1º Bimestre',
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assessment_date DATE NOT NULL,
    assessment_type VARCHAR(50) NOT NULL DEFAULT 'prova' CHECK (assessment_type IN ('prova', 'trabalho', 'seminario', 'teste', 'participacao', 'recuperacao', 'outro')),
    max_score NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (max_score > 0),
    weight NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (weight > 0),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_assessments_tenant ON public.academic_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assessments_class ON public.academic_assessments(tenant_id, class_id);
CREATE INDEX IF NOT EXISTS idx_assessments_subject ON public.academic_assessments(tenant_id, subject_name);
CREATE INDEX IF NOT EXISTS idx_assessments_period ON public.academic_assessments(tenant_id, academic_period);
CREATE INDEX IF NOT EXISTS idx_assessments_date ON public.academic_assessments(tenant_id, assessment_date DESC);

ALTER TABLE public.academic_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for academic_assessments SELECT" ON public.academic_assessments;
CREATE POLICY "Tenant isolation for academic_assessments SELECT"
ON public.academic_assessments FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff/teachers can INSERT academic_assessments" ON public.academic_assessments;
CREATE POLICY "Tenant staff/teachers can INSERT academic_assessments"
ON public.academic_assessments FOR INSERT
WITH CHECK (
    (
        tenant_id IN (SELECT get_auth_tenant_ids()) 
        AND (
            get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria')
            OR (
                get_auth_role_in_tenant(tenant_id) = 'professor'
                AND created_by = auth.uid()
                AND (
                    EXISTS (
                        SELECT 1 FROM public.teacher_class_allocations tca
                        WHERE tca.tenant_id = academic_assessments.tenant_id
                          AND tca.class_id = academic_assessments.class_id
                          AND tca.user_id = auth.uid()
                          AND tca.is_active = TRUE
                    )
                    OR NOT EXISTS (
                        SELECT 1 FROM public.teacher_class_allocations tca_any
                        WHERE tca_any.tenant_id = academic_assessments.tenant_id
                          AND tca_any.class_id = academic_assessments.class_id
                          AND tca_any.is_active = TRUE
                    )
                )
            )
        )
    )
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff/teachers can UPDATE academic_assessments" ON public.academic_assessments;
CREATE POLICY "Tenant staff/teachers can UPDATE academic_assessments"
ON public.academic_assessments FOR UPDATE
USING (
    (
        tenant_id IN (SELECT get_auth_tenant_ids()) 
        AND (
            get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria')
            OR (
                get_auth_role_in_tenant(tenant_id) = 'professor'
                AND created_by = auth.uid()
            )
        )
    )
    OR is_platform_admin()
)
WITH CHECK (
    (
        tenant_id IN (SELECT get_auth_tenant_ids()) 
        AND (
            get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria')
            OR (
                get_auth_role_in_tenant(tenant_id) = 'professor'
                AND created_by = auth.uid()
            )
        )
    )
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff/teachers can DELETE academic_assessments" ON public.academic_assessments;
CREATE POLICY "Tenant staff/teachers can DELETE academic_assessments"
ON public.academic_assessments FOR DELETE
USING (
    (
        tenant_id IN (SELECT get_auth_tenant_ids()) 
        AND (
            get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao')
            OR (
                get_auth_role_in_tenant(tenant_id) = 'professor'
                AND created_by = auth.uid()
            )
        )
    )
    OR is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 4. NOTAS DOS ALUNOS POR AVALIAÇÃO (STUDENT ASSESSMENT GRADES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_assessment_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES public.academic_assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
    score NUMERIC(5,2) CHECK (score >= 0),
    is_absent BOOLEAN NOT NULL DEFAULT FALSE,
    feedback_notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_assessment_grade UNIQUE (tenant_id, assessment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_grades_tenant ON public.student_assessment_grades(tenant_id);
CREATE INDEX IF NOT EXISTS idx_grades_assessment ON public.student_assessment_grades(tenant_id, assessment_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON public.student_assessment_grades(tenant_id, student_id);

ALTER TABLE public.student_assessment_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for student_assessment_grades SELECT" ON public.student_assessment_grades;
CREATE POLICY "Tenant isolation for student_assessment_grades SELECT"
ON public.student_assessment_grades FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff/teachers can INSERT student_assessment_grades" ON public.student_assessment_grades;
CREATE POLICY "Tenant staff/teachers can INSERT student_assessment_grades"
ON public.student_assessment_grades FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'professor'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff/teachers can UPDATE student_assessment_grades" ON public.student_assessment_grades;
CREATE POLICY "Tenant staff/teachers can UPDATE student_assessment_grades"
ON public.student_assessment_grades FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'professor'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'professor'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff/teachers can DELETE student_assessment_grades" ON public.student_assessment_grades;
CREATE POLICY "Tenant staff/teachers can DELETE student_assessment_grades"
ON public.student_assessment_grades FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'professor'))
    OR is_platform_admin()
);
