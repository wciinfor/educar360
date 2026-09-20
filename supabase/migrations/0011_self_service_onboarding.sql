-- ==============================================================================
-- EDUCAR360 - ONBOARDING SELF-SERVICE TRANSIÇÃO ATÔMICA
-- ==============================================================================
-- Cria atopicamente: Lead -> Tenant (status trial) -> Subscription (trial 14 dias)
-- -> Subscription History (CREATED + TRIAL_STARTED) -> Profile (is_platform_admin = false)
-- -> Tenant User (admin_escola) -> Token de Convite de 1º Acesso
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.self_service_onboard_tenant(
    p_school_name VARCHAR(255),
    p_contact_name VARCHAR(255),
    p_email VARCHAR(255),
    p_phone VARCHAR(30),
    p_role_in_school VARCHAR(100) DEFAULT NULL,
    p_students_range VARCHAR(50) DEFAULT NULL,
    p_plan_code VARCHAR(50) DEFAULT 'profissional',
    p_message TEXT DEFAULT NULL,
    p_invite_token VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_email VARCHAR(255) := lower(trim(p_email));
    v_clean_school VARCHAR(255) := trim(p_school_name);
    v_clean_contact VARCHAR(255) := trim(p_contact_name);
    v_clean_phone VARCHAR(30) := trim(p_phone);
    v_plan RECORD;
    v_lead_id UUID;
    v_tenant_id UUID;
    v_user_id UUID;
    v_subscription_id UUID;
    v_slug VARCHAR(100);
    v_token VARCHAR(100);
    v_trial_start TIMESTAMPTZ := timezone('utc'::text, now());
    v_trial_end TIMESTAMPTZ := timezone('utc'::text, now()) + INTERVAL '14 days';
    v_next_due DATE := (timezone('utc'::text, now()) + INTERVAL '14 days')::DATE;
    v_existing_tenant RECORD;
BEGIN
    -- 1. Validação dos dados obrigatórios
    IF v_clean_email = '' OR v_clean_school = '' OR v_clean_contact = '' OR v_clean_phone = '' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Preencha todos os campos obrigatórios (Escola, Nome, E-mail e Telefone).'
        );
    END IF;

    -- 2. Proteção contra duplicação de tenant ativo para o mesmo e-mail
    SELECT t.* INTO v_existing_tenant
    FROM public.tenants t
    WHERE lower(t.email) = v_clean_email
      AND t.status IN ('active', 'trial')
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'already_exists', TRUE,
            'error', 'Já existe uma instituição cadastrada com este e-mail. Faça login ou recupere seu acesso.',
            'tenant_id', v_existing_tenant.id,
            'tenant_slug', v_existing_tenant.slug
        );
    END IF;

    -- 3. Resolução do plano escolhido
    SELECT * INTO v_plan
    FROM public.saas_plans
    WHERE code = p_plan_code AND is_active = TRUE
    LIMIT 1;

    IF NOT FOUND THEN
        SELECT * INTO v_plan
        FROM public.saas_plans
        WHERE code = 'profissional'
        LIMIT 1;

        IF NOT FOUND THEN
            SELECT * INTO v_plan
            FROM public.saas_plans
            ORDER BY price_cents ASC
            LIMIT 1;
        END IF;
    END IF;

    -- 4. Geração do Slug único para a escola
    v_slug := lower(trim(regexp_replace(v_clean_school, '[^a-zA-Z0-9\-]', '-', 'g')));
    v_slug := regexp_replace(v_slug, '-+', '-', 'g');
    v_slug := trim(both '-' from v_slug);

    IF v_slug = '' THEN
        v_slug := 'escola';
    END IF;

    IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) THEN
        v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
    END IF;

    -- 5. Definição do token de convite
    IF p_invite_token IS NOT NULL AND trim(p_invite_token) <> '' THEN
        v_token := trim(p_invite_token);
    ELSE
        v_token := 'inv_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 8);
    END IF;

    -- 6. Criação do Lead comercial (com status 'converted' direto)
    INSERT INTO public.leads (
        school_name,
        contact_name,
        email,
        phone,
        role_in_school,
        students_range,
        plan_interest,
        message,
        status,
        internal_notes
    ) VALUES (
        v_clean_school,
        v_clean_contact,
        v_clean_email,
        v_clean_phone,
        p_role_in_school,
        p_students_range,
        v_plan.code,
        p_message,
        'converted',
        format('[%s] Onboarding Self-Service via Landing Page com Trial de 14 dias.', to_char(v_trial_start, 'DD/MM/YYYY HH24:MI'))
    )
    RETURNING id INTO v_lead_id;

    -- 7. Criação do Tenant (status 'trial')
    INSERT INTO public.tenants (
        name,
        trade_name,
        slug,
        email,
        phone,
        status,
        lead_id,
        invite_token,
        invite_status,
        invite_admin_email,
        first_admin_created_at,
        settings
    ) VALUES (
        v_clean_school,
        v_clean_school,
        v_slug,
        v_clean_email,
        v_clean_phone,
        'trial',
        v_lead_id,
        v_token,
        'created',
        v_clean_email,
        v_trial_start,
        jsonb_build_object(
            'self_service', TRUE,
            'contact_name', v_clean_contact,
            'role_in_school', p_role_in_school,
            'students_range', p_students_range,
            'converted_from_lead_at', v_trial_start
        )
    )
    RETURNING id INTO v_tenant_id;

    -- Atualiza lead com o tenant_id
    UPDATE public.leads
    SET converted_tenant_id = v_tenant_id
    WHERE id = v_lead_id;

    -- 8. Criação da Assinatura SaaS com Trial de 14 dias
    INSERT INTO public.saas_subscriptions (
        tenant_id,
        plan_id,
        status,
        trial_starts_at,
        trial_ends_at,
        current_period_start,
        current_period_end,
        next_due_date,
        amount_cents,
        payment_status
    ) VALUES (
        v_tenant_id,
        v_plan.id,
        'trial',
        v_trial_start,
        v_trial_end,
        v_trial_start,
        v_trial_end,
        v_next_due,
        v_plan.price_cents,
        'pending'
    )
    RETURNING id INTO v_subscription_id;

    -- 9. Histórico da Assinatura: CREATED e TRIAL_STARTED
    INSERT INTO public.saas_subscription_history (
        subscription_id,
        tenant_id,
        event_type,
        new_plan_id,
        new_status,
        reason
    ) VALUES 
    (
        v_subscription_id,
        v_tenant_id,
        'CREATED',
        v_plan.id,
        'trial',
        'Criação da assinatura via Onboarding Self-Service'
    ),
    (
        v_subscription_id,
        v_tenant_id,
        'TRIAL_STARTED',
        v_plan.id,
        'trial',
        format('Período de avaliação de 14 dias iniciado (término em %s)', to_char(v_trial_end, 'DD/MM/YYYY'))
    );

    -- 10. Criação ou Vinculação de Perfil de Usuário (is_platform_admin = FALSE)
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE lower(email) = v_clean_email;

    IF v_user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET 
            full_name = v_clean_contact,
            is_platform_admin = FALSE,
            updated_at = v_trial_start
        WHERE id = v_user_id;
    ELSE
        v_user_id := gen_random_uuid();
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            phone,
            is_platform_admin
        ) VALUES (
            v_user_id,
            v_clean_email,
            v_clean_contact,
            v_clean_phone,
            FALSE -- NUNCA PLATFORM ADMIN
        );
    END IF;

    -- 11. Vinculação em tenant_users como admin_escola
    INSERT INTO public.tenant_users (
        tenant_id,
        user_id,
        role,
        is_active,
        custom_permissions
    ) VALUES (
        v_tenant_id,
        v_user_id,
        'admin_escola',
        TRUE,
        '["admin_escola_total"]'::jsonb
    )
    ON CONFLICT (tenant_id, user_id)
    DO UPDATE SET
        role = 'admin_escola',
        is_active = TRUE,
        updated_at = v_trial_start;

    -- 12. Retorno com os dados da criação
    RETURN jsonb_build_object(
        'success', TRUE,
        'tenant_id', v_tenant_id,
        'tenant_name', v_clean_school,
        'tenant_slug', v_slug,
        'admin_email', v_clean_email,
        'admin_name', v_clean_contact,
        'plan_name', v_plan.name,
        'plan_code', v_plan.code,
        'invite_token', v_token,
        'trial_starts_at', v_trial_start,
        'trial_ends_at', v_trial_end
    );
END;
$$;
