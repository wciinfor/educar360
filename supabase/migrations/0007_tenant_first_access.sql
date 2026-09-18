-- ==============================================================================
-- EDUCAR360 - ONBOARDING & PRIMEIRO ACESSO DO ADMINISTRADOR ESCOLAR
-- ==============================================================================
-- Cadastra o primeiro usuário com papel admin_escola vinculado exclusivamente à instituição,
-- com is_platform_admin = false (sem acesso ao /admin da plataforma), token de convite desacoplado
-- e registro na auditoria do tenant.
-- ==============================================================================

-- 1. Campos de controle de convite e primeiro acesso no tenant
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS first_admin_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_token VARCHAR(100),
  ADD COLUMN IF NOT EXISTS invite_status VARCHAR(30) DEFAULT 'pending' 
    CHECK (invite_status IN ('pending', 'created', 'sent', 'accepted'));

-- 2. Função Transacional para criação do primeiro administrador da escola
CREATE OR REPLACE FUNCTION public.setup_tenant_first_admin(
    p_tenant_id UUID,
    p_full_name VARCHAR(255),
    p_email VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant RECORD;
    v_user_id UUID;
    v_profile RECORD;
    v_tenant_user_id UUID;
    v_token VARCHAR(100);
    v_current_operator_id UUID := auth.uid();
BEGIN
    -- 2.1 Verificação estrita de Super Admin da plataforma
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: Somente Super Administradores da Plataforma podem configurar o primeiro acesso de uma escola.';
    END IF;

    -- 2.2 Verificação do tenant
    SELECT * INTO v_tenant
    FROM public.tenants
    WHERE id = p_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Instituição escolar com ID % não foi encontrada.', p_tenant_id;
    END IF;

    -- 2.3 Gera ou localiza o profile correspondente
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE lower(email) = lower(trim(p_email));

    IF FOUND THEN
        v_user_id := v_profile.id;
        
        -- Garante categoricamente que o perfil escolar NÃO seja super admin da plataforma
        UPDATE public.profiles
        SET 
            full_name = p_full_name,
            is_platform_admin = FALSE,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_user_id;
    ELSE
        -- Gera UUID para o perfil escolar pré-provisionado
        v_user_id := gen_random_uuid();
        
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            is_platform_admin
        ) VALUES (
            v_user_id,
            lower(trim(p_email)),
            p_full_name,
            FALSE -- NUNCA PLATFORM ADMIN
        );
    END IF;

    -- 2.4 Criação ou atualização do vínculo em tenant_users com papel exclusivo admin_escola
    INSERT INTO public.tenant_users (
        tenant_id,
        user_id,
        role,
        is_active,
        custom_permissions
    ) VALUES (
        p_tenant_id,
        v_user_id,
        'admin_escola',
        TRUE,
        '["admin_escola_total"]'::jsonb
    )
    ON CONFLICT (tenant_id, user_id) 
    DO UPDATE SET 
        role = 'admin_escola',
        is_active = TRUE,
        updated_at = timezone('utc'::text, now())
    RETURNING id INTO v_tenant_user_id;

    -- 2.5 Geração de token de convite desacoplado
    v_token := 'inv_' || substr(md5(random()::text || clock_timestamp()::text), 1, 32);

    -- 2.6 Atualização do status no tenant
    UPDATE public.tenants
    SET 
        first_admin_created_at = timezone('utc'::text, now()),
        invite_token = v_token,
        invite_status = 'created',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_tenant_id;

    -- 2.7 Registro de Auditoria do Tenant (audit_logs)
    INSERT INTO public.audit_logs (
        tenant_id,
        user_id,
        action,
        entity_name,
        entity_id,
        new_values
    ) VALUES (
        p_tenant_id,
        v_current_operator_id,
        'FIRST_ADMIN_SETUP',
        'tenant_users',
        v_tenant_user_id::text,
        jsonb_build_object(
            'admin_name', p_full_name,
            'admin_email', lower(trim(p_email)),
            'role', 'admin_escola',
            'invite_token', v_token,
            'school_name', v_tenant.name,
            'access_url', 'app.educar360.com.br'
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'tenant_id', p_tenant_id,
        'user_id', v_user_id,
        'admin_name', p_full_name,
        'admin_email', lower(trim(p_email)),
        'role', 'admin_escola',
        'invite_token', v_token,
        'access_domain', 'app.educar360.com.br'
    );
END;
$$;
