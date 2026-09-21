-- ==============================================================================
-- EDUCAR360 - INTEGRAÇÃO ACADÊMICA | FASE 2: MATRÍCULAS E TURMAS (CORREÇÃO ATÔMICA)
-- ==============================================================================
-- 1. Adição da coluna class_id (FK opcional para public.school_classes) em enrollments
-- 2. Preserva compatibilidade total com matrículas legadas (class_id IS NULL)
-- 3. Índices de performance por tenant e turma
-- 4. Operações SQL transacionais que realizam SELECT ... FOR UPDATE e gravação
--    na mesma transação (criação, confirmação de status e troca de turma).
-- ==============================================================================

-- 1. Coluna class_id na tabela public.enrollments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'enrollments' 
          AND column_name = 'class_id'
    ) THEN
        ALTER TABLE public.enrollments 
        ADD COLUMN class_id UUID REFERENCES public.school_classes(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 2. Índices para consultas de alunos por turma com isolamento de tenant
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id 
ON public.enrollments(tenant_id, class_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_class_status 
ON public.enrollments(tenant_id, class_id, status);

-- ==============================================================================
-- 3. FUNÇÃO ATÔMICA 1: CRIAÇÃO DE MATRÍCULA COM LOCK DE TURMA NA MESMA TRANSAÇÃO
--    INCLUINDO GRAVAÇÃO CONSISTENTE DE HISTÓRICO E AUDIT_LOGS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_enrollment_atomic(
    p_tenant_id UUID,
    p_student_id UUID,
    p_guardian_id UUID,
    p_enrollment_code VARCHAR,
    p_academic_year VARCHAR,
    p_course_name VARCHAR,
    p_grade_level VARCHAR,
    p_shift VARCHAR,
    p_class_id UUID,
    p_status VARCHAR,
    p_status_notes TEXT,
    p_entry_date DATE DEFAULT CURRENT_DATE,
    p_user_id UUID DEFAULT NULL,
    p_user_name VARCHAR DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_class_record RECORD;
    v_enrolled_count INTEGER;
    v_new_id UUID;
    v_effective_reason TEXT;
    v_caller_id UUID;
    v_caller_role VARCHAR(50);
BEGIN
    -- Validação de Identidade e RBAC dentro do banco (Hardening contra chamadas diretas não autorizadas)
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        -- Se invocado no contexto de usuário autenticado, valida se ele pertence ao tenant e possui role autorizada
        IF NOT public.is_platform_admin() THEN
            v_caller_role := public.get_auth_role_in_tenant(p_tenant_id);
            IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin_escola', 'coordenacao', 'secretaria', 'comercial') THEN
                RETURN jsonb_build_object(
                    'success', FALSE,
                    'error', 'Acesso não autorizado: usuário sem permissão para matricular nesta instituição.'
                );
            END IF;
        END IF;
    END IF;

    -- Se houver turma especificada, valida e bloqueia a linha da turma
    IF p_class_id IS NOT NULL THEN
        SELECT sc.id, sc.tenant_id, sc.capacity, sc.is_active, sc.name, sc.academic_year, sc.shift,
               s.name AS series_name, c.name AS course_name
        INTO v_class_record
        FROM public.school_classes sc
        JOIN public.series s ON s.id = sc.series_id AND s.tenant_id = p_tenant_id
        JOIN public.courses c ON c.id = s.course_id AND c.tenant_id = p_tenant_id
        WHERE sc.id = p_class_id AND sc.tenant_id = p_tenant_id
        FOR UPDATE OF sc;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'A turma selecionada não foi encontrada ou não pertence à instituição ativa.'
            );
        END IF;

        IF NOT v_class_record.is_active THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('A turma "%s" está inativa e não aceita novas matrículas.', v_class_record.name)
            );
        END IF;

        -- Validação de integridade acadêmica no servidor
        IF v_class_record.academic_year <> p_academic_year THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('O ano letivo da turma (%s) diverge do ano letivo da matrícula (%s).', v_class_record.academic_year, p_academic_year)
            );
        END IF;

        IF v_class_record.shift <> p_shift THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('O turno da turma (%s) diverge do turno da matrícula (%s).', v_class_record.shift, p_shift)
            );
        END IF;

        IF LOWER(TRIM(v_class_record.course_name)) <> LOWER(TRIM(p_course_name)) THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('O curso da turma (%s) não corresponde ao curso informado (%s).', v_class_record.course_name, p_course_name)
            );
        END IF;

        IF LOWER(TRIM(v_class_record.series_name)) <> LOWER(TRIM(p_grade_level)) THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('A série da turma (%s) não corresponde à série informada (%s).', v_class_record.series_name, p_grade_level)
            );
        END IF;

        -- Contagem de alunos matriculados
        SELECT COUNT(*)::INTEGER
        INTO v_enrolled_count
        FROM public.enrollments
        WHERE class_id = p_class_id
          AND tenant_id = p_tenant_id
          AND status = 'matriculado';

        IF p_status = 'matriculado' AND v_enrolled_count >= v_class_record.capacity THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('A turma "%s" atingiu a capacidade máxima de %s vagas (%s alunos matriculados).', v_class_record.name, v_class_record.capacity, v_enrolled_count)
            );
        END IF;
    END IF;

    -- Inserção da matrícula mantendo o lock ativo até o COMMIT da transação
    INSERT INTO public.enrollments (
        tenant_id,
        student_id,
        guardian_id,
        enrollment_code,
        academic_year,
        course_name,
        grade_level,
        shift,
        class_id,
        status,
        status_notes,
        entry_date
    ) VALUES (
        p_tenant_id,
        p_student_id,
        p_guardian_id,
        p_enrollment_code,
        p_academic_year,
        p_course_name,
        p_grade_level,
        p_shift,
        p_class_id,
        p_status,
        p_status_notes,
        p_entry_date
    )
    RETURNING id INTO v_new_id;

    -- Inserção atômica consistente no histórico essencial (public.enrollment_history)
    v_effective_reason := COALESCE(NULLIF(TRIM(p_reason), ''), NULLIF(TRIM(p_status_notes), ''), 'Registro inicial de matrícula realizado na plataforma.');
    INSERT INTO public.enrollment_history (
        tenant_id,
        enrollment_id,
        action_type,
        previous_values,
        new_values,
        changed_by,
        changed_by_name,
        reason
    ) VALUES (
        p_tenant_id,
        v_new_id,
        'ENROLLMENT_CREATED',
        '{}'::jsonb,
        jsonb_build_object(
            'enrollment_code', p_enrollment_code,
            'academic_year', p_academic_year,
            'course_name', p_course_name,
            'grade_level', p_grade_level,
            'shift', p_shift,
            'class_id', p_class_id,
            'status', p_status
        ),
        p_user_id,
        p_user_name,
        v_effective_reason
    );

    -- Registro atômico de auditoria geral (public.audit_logs)
    INSERT INTO public.audit_logs (
        tenant_id,
        user_id,
        action,
        entity_name,
        entity_id,
        new_values
    ) VALUES (
        p_tenant_id,
        p_user_id,
        'ENROLLMENT_CREATED',
        'enrollments',
        v_new_id::text,
        jsonb_build_object(
            'enrollment_code', p_enrollment_code,
            'student_id', p_student_id,
            'academic_year', p_academic_year,
            'course_name', p_course_name,
            'grade_level', p_grade_level,
            'shift', p_shift,
            'class_id', p_class_id,
            'status', p_status
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'enrollment_id', v_new_id
    );
END;
$$;

-- ==============================================================================
-- 4. FUNÇÃO ATÔMICA 2: ATUALIZAÇÃO DE STATUS COM LOCK DE TURMA NA MESMA TRANSAÇÃO
--    INCLUINDO GRAVAÇÃO CONSISTENTE DE HISTÓRICO E AUDIT_LOGS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_enrollment_status_atomic(
    p_tenant_id UUID,
    p_enrollment_id UUID,
    p_target_status VARCHAR,
    p_notes TEXT,
    p_exit_date DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_user_name VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_enr RECORD;
    v_class_record RECORD;
    v_enrolled_count INTEGER;
    v_effective_reason TEXT;
    v_caller_id UUID;
    v_caller_role VARCHAR(50);
BEGIN
    -- Validação de Identidade e RBAC dentro do banco (Hardening contra chamadas diretas não autorizadas)
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        IF NOT public.is_platform_admin() THEN
            v_caller_role := public.get_auth_role_in_tenant(p_tenant_id);
            IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin_escola', 'coordenacao', 'secretaria') THEN
                RETURN jsonb_build_object(
                    'success', FALSE,
                    'error', 'Acesso não autorizado: usuário sem permissão para alterar status de matrícula.'
                );
            END IF;
        END IF;
    END IF;

    -- Busca a matrícula com lock de linha
    SELECT id, tenant_id, class_id, status, student_id
    INTO v_enr
    FROM public.enrollments
    WHERE id = p_enrollment_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Matrícula não encontrada ou não pertence a esta instituição.'
        );
    END IF;

    -- Se a nova situação for 'matriculado' e houver turma vinculada, bloqueia e valida capacidade
    IF p_target_status = 'matriculado' AND v_enr.class_id IS NOT NULL THEN
        SELECT id, capacity, name, is_active
        INTO v_class_record
        FROM public.school_classes
        WHERE id = v_enr.class_id AND tenant_id = p_tenant_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'Turma vinculada não encontrada nesta instituição.'
            );
        END IF;

        IF NOT v_class_record.is_active THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('A turma "%s" está inativa e não aceita novas confirmações.', v_class_record.name)
            );
        END IF;

        SELECT COUNT(*)::INTEGER
        INTO v_enrolled_count
        FROM public.enrollments
        WHERE class_id = v_enr.class_id
          AND tenant_id = p_tenant_id
          AND status = 'matriculado'
          AND id <> p_enrollment_id;

        IF v_enrolled_count >= v_class_record.capacity THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('A turma "%s" atingiu a capacidade máxima de %s vagas (%s alunos matriculados).', v_class_record.name, v_class_record.capacity, v_enrolled_count)
            );
        END IF;
    END IF;

    -- Atualiza o status
    UPDATE public.enrollments
    SET status = p_target_status,
        status_notes = p_notes,
        exit_date = p_exit_date,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_enrollment_id AND tenant_id = p_tenant_id;

    -- Inserção atômica consistente no histórico essencial (public.enrollment_history)
    v_effective_reason := COALESCE(NULLIF(TRIM(p_notes), ''), format('Situação alterada de %s para %s', v_enr.status, p_target_status));
    INSERT INTO public.enrollment_history (
        tenant_id,
        enrollment_id,
        action_type,
        previous_values,
        new_values,
        changed_by,
        changed_by_name,
        reason
    ) VALUES (
        p_tenant_id,
        p_enrollment_id,
        'STATUS_CHANGED',
        jsonb_build_object('status', v_enr.status),
        jsonb_build_object('status', p_target_status, 'exit_date', p_exit_date),
        p_user_id,
        p_user_name,
        v_effective_reason
    );

    -- Registro atômico de auditoria geral (public.audit_logs)
    INSERT INTO public.audit_logs (
        tenant_id,
        user_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        p_tenant_id,
        p_user_id,
        'ENROLLMENT_STATUS_UPDATED',
        'enrollments',
        p_enrollment_id::text,
        jsonb_build_object('previous_status', v_enr.status),
        jsonb_build_object(
            'previous_status', v_enr.status,
            'target_status', p_target_status,
            'notes', p_notes,
            'exit_date', p_exit_date
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'old_status', v_enr.status,
        'student_id', v_enr.student_id
    );
END;
$$;

-- ==============================================================================
-- 5. FUNÇÃO ATÔMICA 3: EDIÇÃO ACADÊMICA / TROCA DE TURMA COM LOCK NA MESMA TRANSAÇÃO
--    INCLUINDO GRAVAÇÃO CONSISTENTE DE HISTÓRICO E AUDIT_LOGS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_enrollment_academic_atomic(
    p_tenant_id UUID,
    p_enrollment_id UUID,
    p_academic_year VARCHAR,
    p_course_name VARCHAR,
    p_grade_level VARCHAR,
    p_shift VARCHAR,
    p_class_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_user_name VARCHAR DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_previous_class_name VARCHAR DEFAULT NULL,
    p_new_class_name VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_enr RECORD;
    v_class_record RECORD;
    v_enrolled_count INTEGER;
    v_previous_values JSONB;
    v_new_values JSONB;
    v_caller_id UUID;
    v_caller_role VARCHAR(50);
BEGIN
    -- Validação de Identidade e RBAC dentro do banco (Hardening contra chamadas diretas não autorizadas)
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        IF NOT public.is_platform_admin() THEN
            v_caller_role := public.get_auth_role_in_tenant(p_tenant_id);
            IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin_escola', 'coordenacao', 'secretaria') THEN
                RETURN jsonb_build_object(
                    'success', FALSE,
                    'error', 'Acesso não autorizado: usuário sem permissão para editar dados acadêmicos de matrícula.'
                );
            END IF;
        END IF;
    END IF;

    -- Busca a matrícula com lock de linha
    SELECT id, tenant_id, class_id, status, academic_year, course_name, grade_level, shift
    INTO v_enr
    FROM public.enrollments
    WHERE id = p_enrollment_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Matrícula não encontrada ou não pertence a esta instituição.'
        );
    END IF;

    IF v_enr.status IN ('cancelado', 'transferido') THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Não é permitido alterar dados acadêmicos de matrículas canceladas ou transferidas.'
        );
    END IF;

    -- Se for informada uma nova turma
    IF p_class_id IS NOT NULL THEN
        SELECT sc.id, sc.capacity, sc.is_active, sc.name, sc.academic_year, sc.shift,
               s.name AS series_name, c.name AS course_name
        INTO v_class_record
        FROM public.school_classes sc
        JOIN public.series s ON s.id = sc.series_id AND s.tenant_id = p_tenant_id
        JOIN public.courses c ON c.id = s.course_id AND c.tenant_id = p_tenant_id
        WHERE sc.id = p_class_id AND sc.tenant_id = p_tenant_id
        FOR UPDATE OF sc;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'A turma selecionada não foi encontrada ou não pertence à instituição.'
            );
        END IF;

        IF NOT v_class_record.is_active THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('A turma "%s" está inativa.', v_class_record.name)
            );
        END IF;

        -- Validação de integridade acadêmica
        IF v_class_record.academic_year <> p_academic_year THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('O ano letivo da turma (%s) diverge do ano letivo informado (%s).', v_class_record.academic_year, p_academic_year)
            );
        END IF;

        IF v_class_record.shift <> p_shift THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('O turno da turma (%s) diverge do turno informado (%s).', v_class_record.shift, p_shift)
            );
        END IF;

        IF LOWER(TRIM(v_class_record.course_name)) <> LOWER(TRIM(p_course_name)) THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('O curso da turma (%s) não corresponde ao curso informado (%s).', v_class_record.course_name, p_course_name)
            );
        END IF;

        IF LOWER(TRIM(v_class_record.series_name)) <> LOWER(TRIM(p_grade_level)) THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', format('A série da turma (%s) não corresponde à série informada (%s).', v_class_record.series_name, p_grade_level)
            );
        END IF;

        -- Validação de capacidade caso a matrícula esteja 'matriculado'
        IF v_enr.status = 'matriculado' THEN
            SELECT COUNT(*)::INTEGER
            INTO v_enrolled_count
            FROM public.enrollments
            WHERE class_id = p_class_id
              AND tenant_id = p_tenant_id
              AND status = 'matriculado'
              AND id <> p_enrollment_id;

            IF v_enrolled_count >= v_class_record.capacity THEN
                RETURN jsonb_build_object(
                    'success', FALSE,
                    'error', format('A turma "%s" atingiu a capacidade máxima de %s vagas (%s alunos matriculados).', v_class_record.name, v_class_record.capacity, v_enrolled_count)
                );
            END IF;
        END IF;
    END IF;

    -- Montagem dos snapshots de auditoria
    v_previous_values := jsonb_build_object(
        'academic_year', v_enr.academic_year,
        'course_name', v_enr.course_name,
        'grade_level', v_enr.grade_level,
        'shift', v_enr.shift,
        'class_id', v_enr.class_id,
        'class_name', p_previous_class_name
    );

    v_new_values := jsonb_build_object(
        'academic_year', p_academic_year,
        'course_name', p_course_name,
        'grade_level', p_grade_level,
        'shift', p_shift,
        'class_id', p_class_id,
        'class_name', p_new_class_name
    );

    -- Atualiza os dados acadêmicos
    UPDATE public.enrollments
    SET academic_year = p_academic_year,
        course_name = p_course_name,
        grade_level = p_grade_level,
        shift = p_shift,
        class_id = p_class_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_enrollment_id AND tenant_id = p_tenant_id;

    -- Inserção atômica consistente no histórico essencial (public.enrollment_history)
    INSERT INTO public.enrollment_history (
        tenant_id,
        enrollment_id,
        action_type,
        previous_values,
        new_values,
        changed_by,
        changed_by_name,
        reason
    ) VALUES (
        p_tenant_id,
        p_enrollment_id,
        'ACADEMIC_DATA_UPDATED',
        v_previous_values,
        v_new_values,
        p_user_id,
        p_user_name,
        COALESCE(NULLIF(TRIM(p_reason), ''), 'Alteração de alocação acadêmica')
    );

    -- Registro atômico de auditoria geral (public.audit_logs)
    INSERT INTO public.audit_logs (
        tenant_id,
        user_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        p_tenant_id,
        p_user_id,
        'ENROLLMENT_ACADEMIC_DATA_UPDATED',
        'enrollments',
        p_enrollment_id::text,
        v_previous_values,
        jsonb_build_object(
            'previous', v_previous_values,
            'updated', v_new_values,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'previous_class_id', v_enr.class_id,
        'new_class_id', p_class_id
    );
END;
$$;

-- ==============================================================================
-- 6. FUNÇÃO ATÔMICA 4: ATUALIZAÇÃO DE CAPACIDADE DE TURMA COM LOCK FOR UPDATE
--    Elimina a janela de corrida entre edição de capacidade e confirmação de matrículas
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_school_class_atomic(
    p_tenant_id UUID,
    p_class_id UUID,
    p_series_id UUID,
    p_name VARCHAR,
    p_academic_year VARCHAR,
    p_shift VARCHAR,
    p_capacity INTEGER,
    p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_class_record RECORD;
    v_enrolled_count INTEGER;
    v_caller_id UUID;
    v_caller_role VARCHAR(50);
BEGIN
    -- Validação de Identidade e RBAC dentro do banco
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        IF NOT public.is_platform_admin() THEN
            v_caller_role := public.get_auth_role_in_tenant(p_tenant_id);
            IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin_escola', 'coordenacao', 'secretaria') THEN
                RETURN jsonb_build_object(
                    'success', FALSE,
                    'error', 'Acesso não autorizado: usuário sem permissão para gerenciar turmas.'
                );
            END IF;
        END IF;
    END IF;

    -- Bloqueia a linha da turma com FOR UPDATE para sincronizar com operações concorrentes de matrícula
    SELECT id, tenant_id, capacity, name, is_active
    INTO v_class_record
    FROM public.school_classes
    WHERE id = p_class_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'A turma informada não foi encontrada ou não pertence à instituição ativa.'
        );
    END IF;

    -- Conta atomicamente as matrículas confirmadas na mesma transação com o lock ativo
    SELECT COUNT(*)::INTEGER
    INTO v_enrolled_count
    FROM public.enrollments
    WHERE class_id = p_class_id
      AND tenant_id = p_tenant_id
      AND status = 'matriculado';

    -- Impede reduzir a capacidade abaixo do número de alunos matriculados
    IF p_capacity < v_enrolled_count THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', format('Não é possível reduzir a capacidade para %s vagas, pois a turma já possui %s aluno(s) com matrícula confirmada. Remaneje os alunos excedentes antes de diminuir a capacidade.', p_capacity, v_enrolled_count)
        );
    END IF;

    -- Atualiza os dados da turma mantendo a garantia atômica
    UPDATE public.school_classes
    SET series_id = p_series_id,
        name = p_name,
        academic_year = p_academic_year,
        shift = p_shift,
        capacity = p_capacity,
        is_active = p_is_active,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_class_id AND tenant_id = p_tenant_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'class_id', p_class_id,
        'enrolled_count', v_enrolled_count,
        'capacity', p_capacity
    );
END;
$$;

-- ==============================================================================
-- 7. PERMISSÕES EXPLÍCITAS DE EXECUÇÃO (HARDENING CONTRA CHAMADAS NÃO AUTORIZADAS)
-- ==============================================================================
-- Revoga execução pública irrestrita de todas as procedures atômicas
REVOKE EXECUTE ON FUNCTION public.create_enrollment_atomic FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_enrollment_status_atomic FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_enrollment_academic_atomic FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_school_class_atomic FROM PUBLIC;

-- Concede privilégio de execução somente para usuários autenticados e service_role
GRANT EXECUTE ON FUNCTION public.create_enrollment_atomic TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_enrollment_status_atomic TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_enrollment_academic_atomic TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_school_class_atomic TO authenticated, service_role;

