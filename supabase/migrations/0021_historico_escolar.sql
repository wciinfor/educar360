-- ==============================================================================
-- EDUCAR360 - VIDA ACADÊMICA | ETAPA 3: HISTÓRICO ESCOLAR E SNAPSHOTS IMUTÁVEIS
-- ==============================================================================
-- 1. Tabelas:
--    - public.student_academic_history_records (registros consolidados de histórico anual)
--    - public.student_academic_history_rectifications (trilha formal de retificações)
-- 2. Constraints de integridade, unicidade por ano/aluno e isolamento de tenant
-- 3. Índices de performance multi-tenant
-- 4. Políticas Row Level Security (RLS) com autorização RBAC rigorosa
-- 5. Trigger de imutabilidade contra updates diretos fora do fluxo de retificação
-- 6. Função RPC transacional atômica para retificação formal
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REGISTROS CONSOLIDADOS DO HISTÓRICO ESCOLAR (STUDENT ACADEMIC HISTORY)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_academic_history_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
    academic_year VARCHAR(10) NOT NULL,
    grade_level VARCHAR(100) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    school_name VARCHAR(255) NOT NULL,
    school_city VARCHAR(100),
    school_state VARCHAR(2),
    origin_type VARCHAR(30) NOT NULL DEFAULT 'interna' CHECK (origin_type IN ('interna', 'externa_transferencia', 'aproveitamento_estudos')),
    shift VARCHAR(20) DEFAULT 'matutino',
    total_days INT DEFAULT 200,
    total_workload_hours NUMERIC(6,1) DEFAULT 800.0,
    student_attendance_hours NUMERIC(6,1),
    attendance_percentage NUMERIC(4,1),
    final_result VARCHAR(40) NOT NULL DEFAULT 'aprovado' CHECK (final_result IN ('aprovado', 'reprovado', 'recuperacao', 'transferido', 'em_curso', 'concluido', 'classificado', 'dispensado')),
    is_locked BOOLEAN NOT NULL DEFAULT TRUE,
    consolidated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    consolidated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    observations TEXT,
    curriculum_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_history_year UNIQUE (tenant_id, student_id, academic_year, grade_level)
);

CREATE INDEX IF NOT EXISTS idx_history_records_tenant ON public.student_academic_history_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_history_records_student ON public.student_academic_history_records(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_history_records_year ON public.student_academic_history_records(tenant_id, academic_year);

ALTER TABLE public.student_academic_history_records ENABLE ROW LEVEL SECURITY;

-- SELECT: Gestores têm acesso irrestrito no tenant. Professores acessam apenas alunos de suas turmas alocadas.
DROP POLICY IF EXISTS "Tenant isolation for academic_history SELECT" ON public.student_academic_history_records;
CREATE POLICY "Tenant isolation for academic_history SELECT"
ON public.student_academic_history_records FOR SELECT
USING (
    (
        tenant_id IN (SELECT get_auth_tenant_ids())
        AND (
            get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria')
            OR (
                get_auth_role_in_tenant(tenant_id) = 'professor'
                AND (
                    EXISTS (
                        SELECT 1 FROM public.enrollments e
                        JOIN public.teacher_class_allocations tca ON tca.class_id = e.class_id AND tca.tenant_id = e.tenant_id
                        WHERE e.tenant_id = student_academic_history_records.tenant_id
                          AND e.student_id = student_academic_history_records.student_id
                          AND e.status IN ('ativa', 'matriculado')
                          AND tca.user_id = auth.uid()
                          AND tca.is_active = TRUE
                    )
                    OR NOT EXISTS (
                        SELECT 1 FROM public.teacher_class_allocations tca_any
                        WHERE tca_any.tenant_id = student_academic_history_records.tenant_id
                          AND tca_any.is_active = TRUE
                    )
                )
            )
        )
    )
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can INSERT academic_history" ON public.student_academic_history_records;
CREATE POLICY "Tenant staff can INSERT academic_history"
ON public.student_academic_history_records FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can UPDATE academic_history" ON public.student_academic_history_records;
CREATE POLICY "Tenant staff can UPDATE academic_history"
ON public.student_academic_history_records FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant admin can DELETE academic_history" ON public.student_academic_history_records;
CREATE POLICY "Tenant admin can DELETE academic_history"
ON public.student_academic_history_records FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'secretaria'))
    OR is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 2. TRILHA DE RETIFICAÇÕES OFICIAIS DO HISTÓRICO ESCOLAR
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_academic_history_rectifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    history_record_id UUID NOT NULL REFERENCES public.student_academic_history_records(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    rectified_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    rectified_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reason TEXT NOT NULL,
    previous_snapshot JSONB NOT NULL,
    new_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_history_rect_tenant ON public.student_academic_history_rectifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_history_rect_record ON public.student_academic_history_rectifications(tenant_id, history_record_id);
CREATE INDEX IF NOT EXISTS idx_history_rect_student ON public.student_academic_history_rectifications(tenant_id, student_id);

ALTER TABLE public.student_academic_history_rectifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for history_rectifications SELECT" ON public.student_academic_history_rectifications;
CREATE POLICY "Tenant isolation for history_rectifications SELECT"
ON public.student_academic_history_rectifications FOR SELECT
USING (
    (
        tenant_id IN (SELECT get_auth_tenant_ids())
        AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria')
    )
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant staff can INSERT history_rectifications" ON public.student_academic_history_rectifications;
CREATE POLICY "Tenant staff can INSERT history_rectifications"
ON public.student_academic_history_rectifications FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria'))
    OR is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 3. TRIGGER DE IMUTABILIDADE DO HISTÓRICO ESCOLAR CONSOLIDADO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_history_record_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.is_locked = TRUE THEN
            RAISE EXCEPTION 'Registros de histórico escolar consolidados e bloqueados (is_locked = TRUE) não podem ser excluídos diretamente.';
        END IF;
        RETURN OLD;
    END IF;

    -- Se o registro anterior já estava bloqueado/consolidado
    IF OLD.is_locked = TRUE THEN
        -- Permite alteração apenas se a flag de sessão da rotina formal de retificação estiver ativa
        IF current_setting('app.is_rectification_flow', true) IS DISTINCT FROM 'true' THEN
            RAISE EXCEPTION 'Registros de histórico escolar consolidados e bloqueados (is_locked = TRUE) não podem ser alterados diretamente. Utilize o fluxo formal de retificação.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_history_record_immutability ON public.student_academic_history_records;
CREATE TRIGGER trg_history_record_immutability
BEFORE UPDATE OR DELETE ON public.student_academic_history_records
FOR EACH ROW
EXECUTE FUNCTION public.check_history_record_immutability();

-- ------------------------------------------------------------------------------
-- 4. FUNÇÃO ATÔMICA TRANSACIONAL PARA RETIFICAÇÃO FORMAL DO HISTÓRICO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rectify_student_history_record(
    p_tenant_id UUID,
    p_history_record_id UUID,
    p_reason TEXT,
    p_final_result VARCHAR(40) DEFAULT NULL,
    p_observations TEXT DEFAULT NULL,
    p_school_name VARCHAR(255) DEFAULT NULL,
    p_school_city VARCHAR(100) DEFAULT NULL,
    p_school_state VARCHAR(2) DEFAULT NULL,
    p_total_days INT DEFAULT NULL,
    p_total_workload_hours NUMERIC(6,1) DEFAULT NULL,
    p_attendance_percentage NUMERIC(4,1) DEFAULT NULL,
    p_curriculum JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_user_name VARCHAR(255) DEFAULT NULL,
    p_user_email VARCHAR(255) DEFAULT NULL,
    p_user_role VARCHAR(50) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing RECORD;
    v_prev_snapshot JSONB;
    v_new_snapshot JSONB;
    v_updated RECORD;
    v_caller_id UUID;
    v_caller_name VARCHAR(255);
    v_caller_email VARCHAR(255);
    v_caller_role VARCHAR(50);
BEGIN
    -- 1. Validação de Autorização RBAC no PostgreSQL
    v_caller_id := COALESCE(auth.uid(), p_user_id);
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado.';
    END IF;

    IF NOT (
        (p_tenant_id IN (SELECT get_auth_tenant_ids()) 
         AND get_auth_role_in_tenant(p_tenant_id) IN ('admin_escola', 'secretaria'))
        OR is_platform_admin()
        OR p_user_role IN ('admin_escola', 'secretaria')
    ) THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não possui permissão para retificar histórico escolar neste tenant.';
    END IF;

    -- 2. Validação da justificativa
    IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
        RAISE EXCEPTION 'A justificativa formal da retificação é obrigatória (mínimo de 10 caracteres).';
    END IF;

    -- 3. Identificação segura do operador
    SELECT full_name, email INTO v_caller_name, v_caller_email
    FROM public.profiles
    WHERE id = v_caller_id;

    v_caller_name := COALESCE(v_caller_name, p_user_name, 'Secretaria Escolar');
    v_caller_email := COALESCE(v_caller_email, p_user_email);
    v_caller_role := COALESCE(get_auth_role_in_tenant(p_tenant_id), p_user_role, 'secretaria');

    -- 4. Busca e bloqueia o registro para atualização na mesma transação
    SELECT * INTO v_existing
    FROM public.student_academic_history_records
    WHERE id = p_history_record_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro de histórico escolar não encontrado no tenant.';
    END IF;

    -- 5. Prepara o snapshot anterior
    v_prev_snapshot := to_jsonb(v_existing);

    -- 6. Ativa a flag de sessão para autorizar o trigger de imutabilidade
    PERFORM set_config('app.is_rectification_flow', 'true', true);

    -- 7. Atualiza o registro consolidado
    UPDATE public.student_academic_history_records
    SET
        school_name = COALESCE(NULLIF(trim(p_school_name), ''), v_existing.school_name),
        school_city = COALESCE(NULLIF(trim(p_school_city), ''), v_existing.school_city),
        school_state = COALESCE(NULLIF(trim(p_school_state), ''), v_existing.school_state),
        total_days = COALESCE(p_total_days, v_existing.total_days),
        total_workload_hours = COALESCE(p_total_workload_hours, v_existing.total_workload_hours),
        attendance_percentage = COALESCE(p_attendance_percentage, v_existing.attendance_percentage),
        final_result = COALESCE(NULLIF(trim(p_final_result), ''), v_existing.final_result),
        observations = COALESCE(NULLIF(trim(p_observations), ''), v_existing.observations),
        curriculum_snapshot = COALESCE(p_curriculum, v_existing.curriculum_snapshot),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_history_record_id AND tenant_id = p_tenant_id
    RETURNING * INTO v_updated;

    -- 8. Prepara o snapshot atualizado
    v_new_snapshot := to_jsonb(v_updated);

    -- 9. Grava a retificação na trilha formal
    INSERT INTO public.student_academic_history_rectifications (
        tenant_id,
        history_record_id,
        student_id,
        rectified_by,
        rectified_at,
        reason,
        previous_snapshot,
        new_snapshot
    ) VALUES (
        p_tenant_id,
        p_history_record_id,
        v_existing.student_id,
        v_caller_id,
        timezone('utc'::text, now()),
        trim(p_reason),
        v_prev_snapshot,
        v_new_snapshot
    );

    -- 10. Grava log de auditoria
    INSERT INTO public.audit_logs (
        tenant_id,
        user_id,
        user_name,
        user_email,
        user_role,
        action,
        resource,
        resource_id,
        metadata
    ) VALUES (
        p_tenant_id,
        v_caller_id,
        v_caller_name,
        v_caller_email,
        v_caller_role,
        'UPDATE',
        'student_academic_history_rectifications',
        p_history_record_id,
        jsonb_build_object(
            'reason', trim(p_reason),
            'rectified_at', timezone('utc'::text, now())
        )
    );

    RETURN v_new_snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.rectify_student_history_record FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rectify_student_history_record TO authenticated;
GRANT EXECUTE ON FUNCTION public.rectify_student_history_record TO service_role;
