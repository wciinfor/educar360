-- ==============================================================================
-- EDUCAR360 - MÓDULO MATRÍCULAS: EXCLUSÃO ATÔMICA E AUDITORIA TRANSACIONAL
-- ==============================================================================
-- 1. Criação da função public.delete_enrollment_atomic
-- 2. Garante que DELETE em enrollments e INSERT em audit_logs ocorram na mesma transação
-- 3. Se a auditoria ou a exclusão falhar, toda a operação sofre ROLLBACK automático
-- 4. Validação estrita de RBAC, tenant e integridade acadêmica no PostgreSQL
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_enrollment_atomic(
    p_tenant_id UUID,
    p_enrollment_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_user_name VARCHAR DEFAULT NULL,
    p_user_role VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role VARCHAR(50);
    v_enr RECORD;
    v_student RECORD;
    v_student_name VARCHAR(255);
    v_doc_count INTEGER;
BEGIN
    -- 1. Validação de Identidade e RBAC dentro do banco (Hardening contra chamadas diretas não autorizadas)
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL THEN
        IF NOT public.is_platform_admin() THEN
            v_caller_role := public.get_auth_role_in_tenant(p_tenant_id);
            IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin_escola', 'secretaria') THEN
                RETURN jsonb_build_object(
                    'success', FALSE,
                    'error', 'Acesso não autorizado: seu perfil não possui permissão para excluir matrículas.'
                );
            END IF;
        ELSE
            v_caller_role := 'super_admin';
        END IF;
    ELSE
        v_caller_role := COALESCE(p_user_role, 'admin_escola');
    END IF;

    -- 2. Busca a matrícula com LOCK DE LINHA (FOR UPDATE)
    SELECT id, tenant_id, student_id, guardian_id, class_id, enrollment_code,
           academic_year, course_name, grade_level, shift, status, status_notes,
           entry_date, exit_date, created_at
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

    -- 3. Regras de Negócio e Integridade:
    -- Regra A: Matrícula com status 'transferido' possui guia/registro oficial e não pode ser excluída fisicamente
    IF v_enr.status = 'transferido' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Não é permitido excluir definitivamente uma matrícula com situação "Transferido", pois ela possui registro oficial de transferência escolar. Para manter a integridade documental, o registro deve permanecer arquivado.'
        );
    END IF;

    -- Regra B: Matrícula 'matriculado' para papel 'secretaria' deve ser cancelada, não excluída
    IF v_enr.status = 'matriculado' AND v_caller_role = 'secretaria' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Matrículas com situação "Matriculado" representam vagas confirmadas. Para encerrar o vínculo deste aluno, altere a situação para "Cancelado". A exclusão definitiva de matrículas ativas é restrita aos administradores da escola.'
        );
    END IF;

    -- 4. Busca nome do aluno para enriquecer a auditoria antes da exclusão
    SELECT first_name, last_name, full_name
    INTO v_student
    FROM public.students
    WHERE id = v_enr.student_id AND tenant_id = p_tenant_id;

    IF FOUND THEN
        v_student_name := COALESCE(v_student.full_name, trim(v_student.first_name || ' ' || COALESCE(v_student.last_name, '')));
    ELSE
        v_student_name := 'Aluno não identificado';
    END IF;

    -- 5. Conta documentos anexados para histórico de auditoria
    SELECT COUNT(*)::INTEGER
    INTO v_doc_count
    FROM public.enrollment_documents
    WHERE enrollment_id = p_enrollment_id AND tenant_id = p_tenant_id;

    -- 6. Exclui a matrícula fisicamente (as tabelas filhas enrollment_documents e enrollment_history sofrem ON DELETE CASCADE automaticamente pelo Postgres)
    DELETE FROM public.enrollments
    WHERE id = p_enrollment_id AND tenant_id = p_tenant_id;

    -- 7. Registro de Auditoria ATÔMICO na mesma transação PostgreSQL (public.audit_logs)
    -- Se esta inserção falhar por qualquer motivo de constraint/permissão, toda a transação e o DELETE sofrem ROLLBACK automático!
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
        COALESCE(v_caller_id, p_user_id),
        'ENROLLMENT_DELETED',
        'enrollments',
        p_enrollment_id::text,
        jsonb_build_object(
            'enrollment_code', v_enr.enrollment_code,
            'student_id', v_enr.student_id,
            'student_name', v_student_name,
            'guardian_id', v_enr.guardian_id,
            'class_id', v_enr.class_id,
            'academic_year', v_enr.academic_year,
            'course_name', v_enr.course_name,
            'grade_level', v_enr.grade_level,
            'shift', v_enr.shift,
            'status', v_enr.status,
            'entry_date', v_enr.entry_date,
            'exit_date', v_enr.exit_date,
            'associated_documents_count', v_doc_count,
            'deleted_by_name', p_user_name,
            'deleted_by_role', v_caller_role
        ),
        NULL
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'enrollment_code', v_enr.enrollment_code,
        'student_name', v_student_name
    );
END;
$$;

-- Permissões de Execução
REVOKE EXECUTE ON FUNCTION public.delete_enrollment_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_enrollment_atomic TO authenticated, service_role;
