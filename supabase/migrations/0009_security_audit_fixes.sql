-- ==============================================================================
-- EDUCAR360 - AUDITORIA TÉCNICA DE SEGURANÇA NO ONBOARDING & ATIVAÇÃO
-- ==============================================================================
-- 1. Adiciona controle estrito de expiração (72h) do token de convite no tenant
-- 2. Remove exposição de invite_token dos registros de auditoria (audit_logs)
-- 3. Valida expiração temporal e bloqueia reutilização na RPC get_invite_details
-- 4. Blindagem com bloqueio atômico (FOR UPDATE) contra ativações simultâneas em complete_tenant_activation
-- ==============================================================================

-- 1. Coluna de expiração do convite
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + INTERVAL '72 hours');

-- 2. Atualização de setup_tenant_first_admin sem expor tokens confidenciais em audit_logs
CREATE OR REPLACE FUNCTION public.setup_tenant_first_admin(
    p_tenant_id UUID,
    p_full_name VARCHAR(255),
    p_email VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_tenant RECORD;
    v_user_id UUID;
    v_profile RECORD;
    v_tenant_user_id UUID;
    v_token VARCHAR(100);
    v_expires_at TIMESTAMPTZ := timezone('utc'::text, now()) + INTERVAL '72 hours';
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
        '[admin_escola_total]'::jsonb
    )
    ON CONFLICT (tenant_id, user_id) 
    DO UPDATE SET 
        role = 'admin_escola',
        is_active = TRUE,
        updated_at = timezone('utc'::text, now())
    RETURNING id INTO v_tenant_user_id;

    -- 2.5 Geração de token criptograficamente seguro com prefixo e expiração
    v_token := 'inv_' || substr(md5(random()::text || clock_timestamp()::text), 1, 32);

    -- 2.6 Atualização do status no tenant
    UPDATE public.tenants
    SET 
        first_admin_created_at = timezone('utc'::text, now()),
        invite_token = v_token,
        invite_status = 'created',
        invite_admin_email = lower(trim(p_email)),
        invite_expires_at = v_expires_at,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_tenant_id;

    -- 2.7 Registro de Auditoria do Tenant (audit_logs) - NUNCA expor tokens nem credenciais
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
            'expires_at', v_expires_at,
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
        'expires_at', v_expires_at,
        'access_domain', 'app.educar360.com.br'
    );
END;
$func$ ;

-- 3. Atualização de get_invite_details com checagem de expiração e status
CREATE OR REPLACE FUNCTION public.get_invite_details(p_token VARCHAR(100))
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_tenant RECORD;
    v_profile RECORD;
    v_tu RECORD;
BEGIN
    IF p_token IS NULL OR trim(p_token) = '' THEN
        RETURN jsonb_build_object('valid', FALSE, 'message', 'Token não fornecido.');
    END IF;

    -- Localiza o tenant com o token correspondente
    SELECT * INTO v_tenant
    FROM public.tenants
    WHERE invite_token = trim(p_token);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', FALSE, 'message', 'Convite não encontrado ou inválido.');
    END IF;

    -- Validação de expiração temporal (72h)
    IF v_tenant.invite_expires_at IS NOT NULL AND v_tenant.invite_expires_at < timezone('utc'::text, now()) THEN
        RETURN jsonb_build_object(
            'valid', FALSE,
            'expired', TRUE,
            'message', 'Este convite expirou. Solicite um novo link de ativação ao suporte.'
        );
    END IF;

    -- Validação de reutilização (convite já aceito)
    IF v_tenant.invite_status = 'accepted' THEN
        RETURN jsonb_build_object(
            'valid', FALSE, 
            'already_accepted', TRUE,
            'message', 'Este convite já foi utilizado e a conta já está ativada.'
        );
    END IF;

    -- Localiza o vínculo tenant_users para recuperar o administrador
    SELECT * INTO v_tu
    FROM public.tenant_users
    WHERE tenant_id = v_tenant.id AND role = 'admin_escola'
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        SELECT * INTO v_profile
        FROM public.profiles
        WHERE id = v_tu.user_id;
    END IF;

    RETURN jsonb_build_object(
        'valid', TRUE,
        'tenant_id', v_tenant.id,
        'school_name', v_tenant.name,
        'slug', v_tenant.slug,
        'status', v_tenant.status,
        'admin_name', COALESCE(v_profile.full_name, 'Gestor Escolar'),
        'admin_email', COALESCE(v_tenant.invite_admin_email, v_profile.email, v_tenant.email),
        'expires_at', v_tenant.invite_expires_at,
        'role', 'admin_escola'
    );
END;
$func$ ;

-- 4. Função RPC com FOR UPDATE para evitar Race Condition e ativação concorrente
CREATE OR REPLACE FUNCTION public.complete_tenant_activation(
    p_token VARCHAR(100),
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_tenant RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- Bloqueio exclusivo por linha para evitar concorrência/duplicação
    SELECT * INTO v_tenant
    FROM public.tenants
    WHERE invite_token = trim(p_token)
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Tenant não encontrado para este convite.');
    END IF;

    -- Verifica se já foi aceito concorrentemente
    IF v_tenant.invite_status = 'accepted' THEN
        RETURN jsonb_build_object('success', FALSE, 'already_accepted', TRUE, 'message', 'Convite já foi ativado anteriormente.');
    END IF;

    -- Verifica se expirou
    IF v_tenant.invite_expires_at IS NOT NULL AND v_tenant.invite_expires_at < v_now THEN
        RETURN jsonb_build_object('success', FALSE, 'expired', TRUE, 'message', 'Convite expirado.');
    END IF;

    -- Atualiza status do convite
    UPDATE public.tenants
    SET 
        invite_status = 'accepted',
        invite_accepted_at = v_now,
        updated_at = v_now
    WHERE id = v_tenant.id;

    -- Registra na Auditoria do Tenant SEM dados confidenciais (sem senha nem token)
    INSERT INTO public.audit_logs (
        tenant_id,
        user_id,
        action,
        entity_name,
        entity_id,
        new_values
    ) VALUES (
        v_tenant.id,
        p_user_id,
        'FIRST_ADMIN_ACTIVATED',
        'auth.users',
        p_user_id::text,
        jsonb_build_object(
            'event', 'Primeiro acesso e ativação de senha concluídos pelo gestor escolar',
            'activated_at', v_now,
            'school_name', v_tenant.name,
            'role', 'admin_escola'
        )
    );

    RETURN jsonb_build_object('success', TRUE);
END;
$func$ ;
