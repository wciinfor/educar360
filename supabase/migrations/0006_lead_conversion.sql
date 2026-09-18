-- ==============================================================================
-- EDUCAR360 - FLUXO DE CONVERSÃO ATÔMICA: LEAD -> TENANT -> TRIAL 14 DIAS
-- ==============================================================================

-- 1. Vínculo bidirecional e rastreabilidade entre leads e tenants
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS converted_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Evita que o mesmo lead seja vinculado a mais de um tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_converted_tenant_unique 
  ON public.leads(converted_tenant_id) 
  WHERE converted_tenant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_lead_id_unique 
  ON public.tenants(lead_id) 
  WHERE lead_id IS NOT NULL;

-- 2. Função de Conversão Atômica (Transacional via RPC PostgreSQL)
CREATE OR REPLACE FUNCTION public.convert_lead_to_tenant(
    p_lead_id UUID,
    p_plan_code VARCHAR(50),
    p_custom_slug VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lead RECORD;
    v_plan RECORD;
    v_tenant_id UUID;
    v_subscription_id UUID;
    v_slug VARCHAR(100);
    v_trial_start TIMESTAMPTZ := timezone('utc'::text, now());
    v_trial_end TIMESTAMPTZ := timezone('utc'::text, now()) + INTERVAL '14 days';
    v_next_due DATE := (timezone('utc'::text, now()) + INTERVAL '14 days')::DATE;
    v_current_user_id UUID := auth.uid();
BEGIN
    -- 2.1 Verificação estrita de privilégios de Super Administrador da Plataforma
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Acesso negado: Apenas Super Administradores da Plataforma podem converter leads.';
    END IF;

    -- 2.2 Bloqueio de linha e leitura do lead
    SELECT * INTO v_lead
    FROM public.leads
    WHERE id = p_lead_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead com ID % não foi encontrado.', p_lead_id;
    END IF;

    -- 2.3 Proteção rigorosa contra conversão duplicada
    IF v_lead.converted_tenant_id IS NOT NULL OR v_lead.status = 'converted' THEN
        RAISE EXCEPTION 'Este lead já foi convertido anteriormente em uma instituição escolar.';
    END IF;

    -- 2.4 Busca do plano escolhido
    SELECT * INTO v_plan
    FROM public.saas_plans
    WHERE code = p_plan_code AND is_active = TRUE
    LIMIT 1;

    IF NOT FOUND THEN
        -- Fallback para o plano informado no próprio lead ou plano profissional
        SELECT * INTO v_plan
        FROM public.saas_plans
        WHERE code = COALESCE(v_lead.plan_interest, 'profissional')
        LIMIT 1;

        IF NOT FOUND THEN
            SELECT * INTO v_plan
            FROM public.saas_plans
            ORDER BY price_cents ASC
            LIMIT 1;
        END IF;
    END IF;

    -- 2.5 Definição e sanitização do slug do tenant
    IF p_custom_slug IS NOT NULL AND trim(p_custom_slug) <> '' THEN
        v_slug := lower(trim(regexp_replace(p_custom_slug, '[^a-zA-Z0-9\-]', '-', 'g')));
    ELSE
        v_slug := lower(trim(regexp_replace(v_lead.school_name, '[^a-zA-Z0-9\-]', '-', 'g')));
    END IF;

    -- Garante slug único adicionando sufixo aleatório se já existir
    IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) THEN
        v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
    END IF;

    -- 2.6 Criação do Tenant com status 'trial'
    INSERT INTO public.tenants (
        name,
        trade_name,
        slug,
        email,
        phone,
        status,
        lead_id,
        settings
    ) VALUES (
        v_lead.school_name,
        v_lead.school_name,
        v_slug,
        v_lead.email,
        v_lead.phone,
        'trial',
        v_lead.id,
        jsonb_build_object(
            'converted_from_lead_at', v_trial_start,
            'contact_name', v_lead.contact_name,
            'role_in_school', v_lead.role_in_school,
            'students_range', v_lead.students_range
        )
    )
    RETURNING id INTO v_tenant_id;

    -- 2.7 Criação da Assinatura SaaS com Trial de exatamente 14 dias
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

    -- 2.8 Histórico da Assinatura: Evento CREATED
    INSERT INTO public.saas_subscription_history (
        subscription_id,
        tenant_id,
        event_type,
        new_plan_id,
        new_status,
        reason,
        actor_user_id
    ) VALUES (
        v_subscription_id,
        v_tenant_id,
        'CREATED',
        v_plan.id,
        'trial',
        'Criação inicial da assinatura via conversão comercial de Lead',
        v_current_user_id
    );

    -- 2.9 Histórico da Assinatura: Evento TRIAL_STARTED
    INSERT INTO public.saas_subscription_history (
        subscription_id,
        tenant_id,
        event_type,
        new_plan_id,
        new_status,
        reason,
        actor_user_id
    ) VALUES (
        v_subscription_id,
        v_tenant_id,
        'TRIAL_STARTED',
        v_plan.id,
        'trial',
        format('Período de avaliação de 14 dias iniciado (término em %s)', to_char(v_trial_end, 'DD/MM/YYYY')),
        v_current_user_id
    );

    -- 2.10 Atualização do Lead para status 'converted' com vínculo do tenant criado
    UPDATE public.leads
    SET 
        status = 'converted',
        converted_tenant_id = v_tenant_id,
        internal_notes = COALESCE(internal_notes || E'\n\n', '') || 
                         format('[%s] Lead convertido em escola (Tenant ID: %s, Slug: %s) com trial de 14 dias no plano %s.',
                                to_char(v_trial_start, 'DD/MM/YYYY HH24:MI'),
                                v_tenant_id,
                                v_slug,
                                v_plan.name),
        updated_at = v_trial_start
    WHERE id = p_lead_id;

    -- 2.11 Retorno estruturado do resultado atômico
    RETURN jsonb_build_object(
        'success', TRUE,
        'tenant_id', v_tenant_id,
        'tenant_slug', v_slug,
        'subscription_id', v_subscription_id,
        'plan_name', v_plan.name,
        'plan_code', v_plan.code,
        'trial_starts_at', v_trial_start,
        'trial_ends_at', v_trial_end,
        'next_due_date', v_next_due
    );
END;
$$;
