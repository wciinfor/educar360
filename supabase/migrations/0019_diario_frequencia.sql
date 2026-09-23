-- ==============================================================================
-- EDUCAR360 - VIDA ACADÊMICA | ETAPA 1: DIÁRIO DE CLASSE E FREQUÊNCIA
-- ==============================================================================
-- 1. Criação das tabelas:
--    - public.teacher_class_allocations (alocação de professor na turma e disciplina)
--    - public.class_lessons (aulas / registros de diário de classe)
--    - public.lesson_attendances (frequências / presenças dos alunos por aula)
-- 2. Constraints de integridade, unicidade por tenant/aula/aluno e chaves estrangeiras
-- 3. Índices de performance por tenant, turma, data e aluno
-- 4. Políticas Row Level Security (RLS) com isolamento rigoroso por tenant e autorização
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ALOCAÇÃO DE PROFESSORES NAS TURMAS / DISCIPLINAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_class_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_name VARCHAR(150),
    academic_year VARCHAR(10) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_class_subject ON public.teacher_class_allocations (tenant_id, class_id, user_id, COALESCE(subject_name, ''));

CREATE INDEX IF NOT EXISTS idx_alloc_tenant ON public.teacher_class_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alloc_user ON public.teacher_class_allocations(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_alloc_class ON public.teacher_class_allocations(tenant_id, class_id);
CREATE INDEX IF NOT EXISTS idx_alloc_year ON public.teacher_class_allocations(tenant_id, academic_year);

ALTER TABLE public.teacher_class_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for teacher_class_allocations SELECT" ON public.teacher_class_allocations;
CREATE POLICY "Tenant isolation for teacher_class_allocations SELECT"
ON public.teacher_class_allocations FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can INSERT teacher_class_allocations" ON public.teacher_class_allocations;
CREATE POLICY "Tenant staff can INSERT teacher_class_allocations"
ON public.teacher_class_allocations FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can UPDATE teacher_class_allocations" ON public.teacher_class_allocations;
CREATE POLICY "Tenant staff can UPDATE teacher_class_allocations"
ON public.teacher_class_allocations FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can DELETE teacher_class_allocations" ON public.teacher_class_allocations;
CREATE POLICY "Tenant staff can DELETE teacher_class_allocations"
ON public.teacher_class_allocations FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 2. DIÁRIO DE CLASSE / AULAS MINISTRADAS (CLASS LESSONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    lesson_date DATE NOT NULL,
    academic_period VARCHAR(50) NOT NULL DEFAULT '1º Bimestre',
    subject_name VARCHAR(150),
    title VARCHAR(200) NOT NULL,
    content_summary TEXT NOT NULL,
    pedagogical_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_lessons_tenant ON public.class_lessons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lessons_class ON public.class_lessons(tenant_id, class_id);
CREATE INDEX IF NOT EXISTS idx_lessons_date ON public.class_lessons(tenant_id, lesson_date DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON public.class_lessons(tenant_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_period ON public.class_lessons(tenant_id, academic_period);

ALTER TABLE public.class_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for class_lessons SELECT" ON public.class_lessons;
CREATE POLICY "Tenant isolation for class_lessons SELECT"
ON public.class_lessons FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff/teachers can INSERT class_lessons" ON public.class_lessons;
CREATE POLICY "Tenant staff/teachers can INSERT class_lessons"
ON public.class_lessons FOR INSERT
WITH CHECK (
    (
        tenant_id IN (SELECT get_auth_tenant_ids()) 
        AND (
            get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria')
            OR (
                get_auth_role_in_tenant(tenant_id) = 'professor'
                AND teacher_id = auth.uid()
                AND (
                    EXISTS (
                        SELECT 1 FROM public.teacher_class_allocations tca
                        WHERE tca.tenant_id = class_lessons.tenant_id
                          AND tca.class_id = class_lessons.class_id
                          AND tca.user_id = auth.uid()
                          AND tca.is_active = TRUE
                    )
                    OR NOT EXISTS (
                        SELECT 1 FROM public.teacher_class_allocations tca_any
                        WHERE tca_any.tenant_id = class_lessons.tenant_id
                          AND tca_any.class_id = class_lessons.class_id
                          AND tca_any.is_active = TRUE
                    )
                )
            )
        )
    )
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff/teachers can UPDATE class_lessons" ON public.class_lessons;
CREATE POLICY "Tenant staff/teachers can UPDATE class_lessons"
ON public.class_lessons FOR UPDATE
USING (
    (
        tenant_id IN (SELECT get_auth_tenant_ids()) 
        AND (
            get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria')
            OR (
                get_auth_role_in_tenant(tenant_id) = 'professor'
                AND teacher_id = auth.uid()
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
                AND teacher_id = auth.uid()
            )
        )
    )
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff/teachers can DELETE class_lessons" ON public.class_lessons;
CREATE POLICY "Tenant staff/teachers can DELETE class_lessons"
ON public.class_lessons FOR DELETE
USING (
    (
        tenant_id IN (SELECT get_auth_tenant_ids()) 
        AND (
            get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao')
            OR (
                get_auth_role_in_tenant(tenant_id) = 'professor'
                AND teacher_id = auth.uid()
            )
        )
    )
    OR is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 3. FREQUÊNCIAS DOS ALUNOS POR AULA (LESSON ATTENDANCES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.class_lessons(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'presente' CHECK (status IN ('presente', 'falta', 'justificada')),
    justification_reason TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_lesson_attendance_student UNIQUE (tenant_id, lesson_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendances_tenant ON public.lesson_attendances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendances_lesson ON public.lesson_attendances(tenant_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_attendances_student ON public.lesson_attendances(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON public.lesson_attendances(tenant_id, status);

ALTER TABLE public.lesson_attendances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for lesson_attendances SELECT" ON public.lesson_attendances;
CREATE POLICY "Tenant isolation for lesson_attendances SELECT"
ON public.lesson_attendances FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff/teachers can INSERT lesson_attendances" ON public.lesson_attendances;
CREATE POLICY "Tenant staff/teachers can INSERT lesson_attendances"
ON public.lesson_attendances FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'professor'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff/teachers can UPDATE lesson_attendances" ON public.lesson_attendances;
CREATE POLICY "Tenant staff/teachers can UPDATE lesson_attendances"
ON public.lesson_attendances FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'professor'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'professor'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff/teachers can DELETE lesson_attendances" ON public.lesson_attendances;
CREATE POLICY "Tenant staff/teachers can DELETE lesson_attendances"
ON public.lesson_attendances FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'professor'))
    OR is_platform_admin()
);
