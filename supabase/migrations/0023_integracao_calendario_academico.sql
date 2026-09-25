-- ==============================================================================
-- EDUCAR360 - MÓDULO ACADÊMICO: INTEGRAÇÃO CALENDÁRIO ACADÊMICO (FASE 1)
-- ==============================================================================
-- 1. Adição da coluna school_year_id (UUID nullable) em public.school_classes
-- 2. FK composta tenant-safe (tenant_id, school_year_id) referenciando public.school_years(tenant_id, id) ON DELETE RESTRICT
-- 3. Índice de performance por tenant e school_year_id
-- 4. Backfill idempotente de turmas existentes baseado em tenant_id + academic_year = school_years.year
-- 5. Preservação da coluna legada academic_year para compatibilidade
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADIÇÃO DA COLUNA school_year_id
-- ------------------------------------------------------------------------------
ALTER TABLE public.school_classes 
ADD COLUMN IF NOT EXISTS school_year_id UUID;

-- ------------------------------------------------------------------------------
-- 2. CONSTRAINT FK COMPOSTA TENANT-SAFE
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_school_classes_tenant_school_year'
    ) THEN
        ALTER TABLE public.school_classes
        ADD CONSTRAINT fk_school_classes_tenant_school_year
        FOREIGN KEY (tenant_id, school_year_id)
        REFERENCES public.school_years(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. ÍNDICE DE PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_school_classes_school_year 
ON public.school_classes(tenant_id, school_year_id);

-- ------------------------------------------------------------------------------
-- 4. BACKFILL DE TURMAS EXISTENTES (IDEMPOTENTE)
-- ------------------------------------------------------------------------------
UPDATE public.school_classes sc
SET school_year_id = sy.id
FROM public.school_years sy
WHERE sc.tenant_id = sy.tenant_id
  AND TRIM(sc.academic_year) = TRIM(sy.year)
  AND sc.school_year_id IS NULL;
