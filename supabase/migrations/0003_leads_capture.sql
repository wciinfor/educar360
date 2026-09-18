-- ==============================================================================
-- EDUCAR360 - TABELA DE CAPTAÇÃO DE LEADS COM RLS PÚBLICA APENAS PARA INSERT
-- ==============================================================================
-- Permite que visitantes da Landing Page enviem seus dados para trial / contato comercial,
-- sem qualquer permissão pública de leitura. Apenas Super Admins podem consultar os leads.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    role_in_school VARCHAR(100),
    students_range VARCHAR(50), -- ex: "Até 100", "100 a 300", "300 a 700", "Mais de 700"
    plan_interest VARCHAR(50) DEFAULT 'profissional', -- "essencial", "profissional", "enterprise", "indeciso"
    message TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'discarded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);

-- ==============================================================================
-- Row-Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 1. Qualquer visitante (mesmo não autenticado / anônimo) pode enviar seu formulário de lead
CREATE POLICY "leads_insert_public_policy"
ON public.leads
FOR INSERT
WITH CHECK (true);

-- 2. Somente Super Administradores da Plataforma possuem permissão de leitura
CREATE POLICY "leads_select_super_admin_only"
ON public.leads
FOR SELECT
USING (public.is_platform_admin());

-- 3. Somente Super Administradores da Plataforma podem atualizar o status do lead
CREATE POLICY "leads_update_super_admin_only"
ON public.leads
FOR UPDATE
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());
