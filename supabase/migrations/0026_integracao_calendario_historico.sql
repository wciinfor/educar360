-- ==============================================================================
-- EDUCAR360 - VIDA ACADÊMICA | FASE 5: INTEGRAÇÃO CALENDÁRIO ↔ HISTÓRICO ESCOLAR
-- ==============================================================================
-- 1. Vínculo de public.student_academic_history_records com public.school_years
-- 2. Backfill tenant-safe de registros históricos existentes
-- 3. Índices e integridade multi-tenant
-- 4. Reforço de segurança da função RPC de retificação formal (rectify_student_history_record)
-- ==============================================================================

-- 1. Coluna school_year_id na tabela student_academic_history_records
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'student_academic_history_records' 
          AND column_name = 'school_year_id'
    ) THEN
        ALTER TABLE public.student_academic_history_records 
        ADD COLUMN school_year_id UUID REFERENCES public.school_years(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 2. Índice de performance por tenant e school_year_id
CREATE INDEX IF NOT EXISTS idx_history_records_school_year 
ON public.student_academic_history_records(tenant_id, school_year_id);

-- 3. Backfill tenant-safe dos registros de histórico existentes
UPDATE public.student_academic_history_records r
SET school_year_id = sy.id
FROM public.school_years sy
WHERE r.school_year_id IS NULL
  AND sy.tenant_id = r.tenant_id
  AND sy.year = r.academic_year;

-- ------------------------------------------------------------------------------
-- 4. REFORÇO DE SEGURANÇA NA FUNÇÃO RPC DE RETIFICAÇÃO FORMAL DO HISTÓRICO
-- ------------------------------------------------------------------------------
-- Remove versões anteriores com assinaturas diferentes para evitar ambiguidade
DROP FUNCTION IF EXISTS public.rectify_student_history_record(UUID, UUID, TEXT, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, INT, NUMERIC, NUMERIC, JSONB, UUID, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.rectify_student_history_record(UUID, UUID, TEXT, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, INT, NUMERIC, NUMERIC, JSONB, UUID, VARCHAR, VARCHAR, VARCHAR, UUID);

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
    p_user_role VARCHAR(50) DEFAULT NULL,
    p_school_year_id UUID DEFAULT NULL
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
    v_auth_role VARCHAR(50);
BEGIN
    -- 1. Validação estrita de Tenant e Identificação do Usuário
    IF p_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Identificador de tenant não informado.';
    END IF;

    -- Prioriza o auth.uid() da sessão JWT para impedir spoofing
    v_caller_id := COALESCE(auth.uid(), p_user_id);
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado.';
    END IF;

    -- Validação RBAC estrita contra o banco de dados
    v_auth_role := get_auth_role_in_tenant(p_tenant_id);

    IF NOT (
        (p_tenant_id IN (SELECT get_auth_tenant_ids()) AND v_auth_role IN ('admin_escola', 'secretaria'))
        OR is_platform_admin()
        OR (auth.uid() IS NULL AND p_user_role IN ('admin_escola', 'secretaria'))
    ) THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não possui permissão para retificar histórico escolar neste tenant.';
    END IF;

    -- 2. Validação da justificativa formal
    IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
        RAISE EXCEPTION 'A justificativa formal da retificação é obrigatória (mínimo de 10 caracteres).';
    END IF;

    -- 3. Identificação segura do operador
    SELECT full_name, email INTO v_caller_name, v_caller_email
    FROM public.profiles
    WHERE id = v_caller_id;

    v_caller_name := COALESCE(v_caller_name, p_user_name, 'Secretaria Escolar');
    v_caller_email := COALESCE(v_caller_email, p_user_email);
    v_caller_role := COALESCE(v_auth_role, p_user_role, 'secretaria');

    -- 4. Busca e bloqueia o registro para atualização na mesma transação com isolamento de tenant
    SELECT * INTO v_existing
    FROM public.student_academic_history_records
    WHERE id = p_history_record_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro de histórico escolar não encontrado no tenant.';
    END IF;

    -- 5. Validação de Ano Letivo oficial se fornecido
    IF p_school_year_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.school_years
            WHERE id = p_school_year_id AND tenant_id = p_tenant_id
        ) THEN
            RAISE EXCEPTION 'Ano Letivo oficial informado para retificação não pertence a esta instituição.';
        END IF;
    END IF;

    -- 6. Prepara o snapshot anterior
    v_prev_snapshot := to_jsonb(v_existing);

    -- 7. Ativa a flag de sessão para autorizar o trigger de imutabilidade
    PERFORM set_config('app.is_rectification_flow', 'true', true);

    -- 8. Atualiza o registro consolidado
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
        school_year_id = COALESCE(p_school_year_id, v_existing.school_year_id),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_history_record_id AND tenant_id = p_tenant_id
    RETURNING * INTO v_updated;

    -- 9. Prepara o snapshot atualizado
    v_new_snapshot := to_jsonb(v_updated);

    -- 10. Grava a retificação na trilha formal
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

    -- 11. Grava log de auditoria
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
        v_caller_id,
        'UPDATE',
        'student_academic_history_records',
        p_history_record_id,
        v_prev_snapshot,
        jsonb_build_object(
            'reason', trim(p_reason),
            'rectified_at', timezone('utc'::text, now()),
            'previous_result', v_existing.final_result,
            'new_result', v_updated.final_result
        )
    );

    RETURN v_new_snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.rectify_student_history_record(UUID, UUID, TEXT, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, INT, NUMERIC, NUMERIC, JSONB, UUID, VARCHAR, VARCHAR, VARCHAR, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rectify_student_history_record(UUID, UUID, TEXT, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, INT, NUMERIC, NUMERIC, JSONB, UUID, VARCHAR, VARCHAR, VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rectify_student_history_record(UUID, UUID, TEXT, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, INT, NUMERIC, NUMERIC, JSONB, UUID, VARCHAR, VARCHAR, VARCHAR, UUID) TO service_role;
