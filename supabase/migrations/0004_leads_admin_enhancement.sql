-- ==============================================================================
-- EDUCAR360 - EVOLUÇÃO DA GESTÃO DE LEADS NO BACKOFFICE
-- ==============================================================================
-- Adiciona campos de anotações internas e vínculo com usuário operador
-- mantendo RLS restrito exclusivamente aos Super Administradores da Plataforma.
-- ==============================================================================

ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Validação do check de status garantindo a integridade dos 5 estados
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'discarded'));

CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);
