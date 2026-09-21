-- ==============================================================================
-- EDUCAR360 - MÓDULO MATRÍCULAS: DOCUMENTAÇÃO E CHECKLIST DE MATRÍCULA
-- ==============================================================================
-- 1. Criação da tabela public.enrollment_documents vinculada a enrollments
-- 2. Status: pendente, recebido, dispensado, rejeitado
-- 3. RLS e isolamento estrito por tenant_id
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.enrollment_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'dispensado', 'rejeitado')),
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    received_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_enrollment_doc_type UNIQUE (tenant_id, enrollment_id, document_type)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_enrollment_docs_tenant ON public.enrollment_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_docs_enrollment ON public.enrollment_documents(tenant_id, enrollment_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_docs_status ON public.enrollment_documents(tenant_id, status);

-- Habilitar Row Level Security
ALTER TABLE public.enrollment_documents ENABLE ROW LEVEL SECURITY;

-- 1. Leitura isolada por tenant (toda a equipe da escola autorizada)
DROP POLICY IF EXISTS "Tenant isolation for enrollment_documents SELECT" ON public.enrollment_documents;
CREATE POLICY "Tenant isolation for enrollment_documents SELECT"
ON public.enrollment_documents FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

-- 2. Inserção autorizada para equipe escolar
DROP POLICY IF EXISTS "Tenant staff can INSERT enrollment_documents" ON public.enrollment_documents;
CREATE POLICY "Tenant staff can INSERT enrollment_documents"
ON public.enrollment_documents FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'comercial'))
    OR is_platform_admin()
);

-- 3. Atualização de status documental (recebimento, dispensa, rejeição)
DROP POLICY IF EXISTS "Tenant staff can UPDATE enrollment_documents" ON public.enrollment_documents;
CREATE POLICY "Tenant staff can UPDATE enrollment_documents"
ON public.enrollment_documents FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'comercial'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao', 'secretaria', 'comercial'))
    OR is_platform_admin()
);

-- 4. Exclusão restrita a gestores
DROP POLICY IF EXISTS "Tenant staff can DELETE enrollment_documents" ON public.enrollment_documents;
CREATE POLICY "Tenant staff can DELETE enrollment_documents"
ON public.enrollment_documents FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'secretaria'))
    OR is_platform_admin()
);
