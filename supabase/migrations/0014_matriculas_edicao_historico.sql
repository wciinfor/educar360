-- ==============================================================================
-- EDUCAR360 - MÓDULO MATRÍCULAS: HISTÓRICO DE ALTERAÇÕES DA MATRÍCULA (FASE 3)
-- ==============================================================================
-- 1. Criação da tabela public.enrollment_history vinculada a enrollments
-- 2. Registro de tipo de ação, valores anteriores, valores novos e justificativa
-- 3. RLS e isolamento estrito por tenant_id
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.enrollment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'ACADEMIC_DATA_UPDATED', 'STATUS_CHANGED', 'ENROLLMENT_CREATED'
    previous_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    new_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    changed_by UUID REFERENCES public.profiles(id),
    changed_by_name VARCHAR(255),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_enrollment_history_tenant ON public.enrollment_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_history_enrollment ON public.enrollment_history(tenant_id, enrollment_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_history_created_at ON public.enrollment_history(created_at DESC);

-- Habilitar Row Level Security
ALTER TABLE public.enrollment_history ENABLE ROW LEVEL SECURITY;

-- 1. Leitura isolada por tenant (equipe autorizada da escola)
DROP POLICY IF EXISTS "Tenant isolation for enrollment_history SELECT" ON public.enrollment_history;
CREATE POLICY "Tenant isolation for enrollment_history SELECT"
ON public.enrollment_history FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

-- 2. Inserção autorizada para equipe escolar autorizada
DROP POLICY IF EXISTS "Tenant staff can INSERT enrollment_history" ON public.enrollment_history;
CREATE POLICY "Tenant staff can INSERT enrollment_history"
ON public.enrollment_history FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'comercial'))
    OR is_platform_admin()
);
