-- ==============================================================================
-- EDUCAR360 - ATIVAÇÃO REAL DE CONVITE E PRIMEIRO ACESSO DO GESTOR ESCOLAR
-- ==============================================================================

-- 1. Redundância de e-mail e data de aceite na tabela de tenants
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS invite_admin_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMPTZ;

-- 2. Função RPC pública (com token) para consultar detalhes do convite
CREATE OR REPLACE FUNCTION public.get_invite_details(p_token VARCHAR(100))
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        RETURN jsonb_build_object('valid', FALSE, 'message', 'Convite não encontrado ou expirado.');
    END IF;

    IF v_tenant.invite_status = 'accepted' THEN
        RETURN jsonb_build_object(
            'valid', FALSE, 
            'already_accepted', TRUE,
            'message', 'Este convite já foi utilizado e ativado anteriormente.'
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
        'admin_email', COALESCE(v_profile.email, v_tenant.email),
        'role', 'admin_escola'
    );
END;
$$;

-- 3. Função RPC para registrar conclusão da ativação e auditoria
CREATE OR REPLACE FUNCTION public.complete_tenant_activation(
    p_token VARCHAR(100),
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    SELECT * INTO v_tenant
    FROM public.tenants
    WHERE invite_token = trim(p_token)
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Tenant não encontrado para este convite.');
    END IF;

    -- Atualiza status do convite
    UPDATE public.tenants
    SET 
        invite_status = 'accepted',
        invite_accepted_at = v_now,
        updated_at = v_now
    WHERE id = v_tenant.id;

    -- Registra na Auditoria do Tenant
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
            'event', 'Primeiro acesso e ativação de senha concluídos pelo gestor',
            'activated_at', v_now,
            'school_name', v_tenant.name,
            'role', 'admin_escola'
        )
    );

    RETURN jsonb_build_object('success', TRUE);
END;
$$;
