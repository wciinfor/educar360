-- ==============================================================================
-- EDUCAR360 - NÚCLEO ADMINISTRATIVO DA PLATAFORMA SAAS
-- ==============================================================================
-- Estrutura exclusiva do Backoffice Central da Empresa Mantenedora.
-- Gateway de pagamento único: ASAAS.
-- ==============================================================================

-- 1. Atualização dos status permitidos para a tabela tenants
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_status_check 
  CHECK (status IN ('active', 'trial', 'suspended', 'canceled', 'inactive'));

-- 2. Tabela de Planos SaaS
CREATE TABLE IF NOT EXISTS public.saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE, -- ex: 'essencial', 'pro', 'enterprise'
    description TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0, -- Valor em centavos (ex: 39900 = R$ 399,00)
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    max_students INTEGER, -- null = ilimitado
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_saas_plans_code ON public.saas_plans(code);
CREATE INDEX IF NOT EXISTS idx_saas_plans_active ON public.saas_plans(is_active);

-- 3. Tabela de Assinaturas das Escolas (Tenants)
CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    plan_id UUID NOT NULL REFERENCES public.saas_plans(id),
    status VARCHAR(30) NOT NULL DEFAULT 'trial' CHECK (
        status IN ('trial', 'active', 'suspended', 'canceled', 'past_due')
    ),
    trial_starts_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    current_period_end TIMESTAMPTZ,
    next_due_date DATE,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        payment_status IN ('up_to_date', 'pending', 'overdue')
    ),
    -- Campos exclusivos do Gateway ASAAS
    asaas_customer_id VARCHAR(100),
    asaas_subscription_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_tenant ON public.saas_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_status ON public.saas_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_asaas_sub ON public.saas_subscriptions(asaas_subscription_id);

-- 4. Tabela de Histórico de Assinatura (Auditoria de Eventos da Assinatura)
CREATE TABLE IF NOT EXISTS public.saas_subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.saas_subscriptions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'CREATED', 'TRIAL_STARTED', 'PLAN_CHANGED', 'RENEWED', 'SUSPENDED', 'REACTIVATED', 'CANCELED'
    old_plan_id UUID REFERENCES public.saas_plans(id),
    new_plan_id UUID REFERENCES public.saas_plans(id),
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    reason TEXT,
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_saas_sub_history_sub ON public.saas_subscription_history(subscription_id, created_at DESC);

-- 5. Tabela de Faturas da Plataforma (Previsão Direta com ASAAS)
CREATE TABLE IF NOT EXISTS public.saas_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.saas_subscriptions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'paid', 'overdue', 'canceled')
    ),
    paid_at TIMESTAMPTZ,
    -- Campos diretos da cobrança no ASAAS
    asaas_payment_id VARCHAR(100) UNIQUE,
    asaas_invoice_url TEXT,
    asaas_bank_slip_url TEXT,
    asaas_pix_qrcode TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_saas_invoices_tenant ON public.saas_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_status ON public.saas_invoices(status);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_due ON public.saas_invoices(due_date);

-- ==============================================================================
-- 6. Row-Level Security (RLS) - Exclusivo para Super Administradores da Plataforma
-- ==============================================================================
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;

-- Planos: Leitura pública ou autenticada para landing page e super admin, escrita só super admin
CREATE POLICY "saas_plans_select_all"
ON public.saas_plans FOR SELECT
USING (TRUE);

CREATE POLICY "saas_plans_admin_write"
ON public.saas_plans FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Assinaturas: Restrito exclusivamente para Super Admins
CREATE POLICY "saas_subscriptions_admin_all"
ON public.saas_subscriptions FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Histórico de Assinaturas: Restrito para Super Admins
CREATE POLICY "saas_sub_history_admin_all"
ON public.saas_subscription_history FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Faturas da Plataforma: Restrito para Super Admins
CREATE POLICY "saas_invoices_admin_all"
ON public.saas_invoices FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- ==============================================================================
-- 7. Seed Inicial de Planos Padrão
-- ==============================================================================
INSERT INTO public.saas_plans (name, code, description, price_cents, billing_cycle, max_students, features)
VALUES 
(
  'Essencial',
  'essencial',
  'Ideal para pequenas escolas em fase inicial com até 150 alunos.',
  39900,
  'monthly',
  150,
  '["Secretaria Escolar", "Módulo Acadêmico", "Matrículas Básicas", "Portal do Aluno", "Suporte por Email"]'::jsonb
),
(
  'Profissional',
  'profissional',
  'Para escolas consolidadas com até 500 alunos.',
  79900,
  'monthly',
  500,
  '["Secretaria & Acadêmico", "Matrículas Avançadas", "Financeiro & Cobrança", "Comunicação com Pais", "Portais Aluno, Professor e Pais", "Suporte Prioritário"]'::jsonb
),
(
  'Enterprise',
  'enterprise',
  'Para redes de ensino e instituições acima de 500 alunos.',
  149900,
  'monthly',
  NULL,
  '["Alunos Ilimitados", "Todos os Módulos", "Múltiplas Unidades", "Auditoria Avançada", "APIs e Integrações", "Gerente de Sucesso Dedicado"]'::jsonb
)
ON CONFLICT (code) DO NOTHING;
