-- ==============================================================================
-- EDUCAR360 - MÓDULO ACADÊMICO: INTEGRAÇÃO CALENDÁRIO ↔ AVALIAÇÕES / NOTAS (FASE 3)
-- ==============================================================================
-- 1. Adição das colunas school_year_id e academic_term_id (UUID nullable) em public.academic_assessments
-- 2. Adição da coluna academic_term_id (UUID nullable) em public.academic_period_closings
-- 3. FKs compostas tenant-safe referenciando public.school_years e public.academic_terms com ON DELETE RESTRICT
-- 4. Índices de performance por tenant_id + school_year_id e tenant_id + academic_term_id
-- 5. Backfill idempotente de avaliações e fechamentos de período existentes
-- 6. Preservação das colunas legadas academic_period para compatibilidade total
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADIÇÃO DAS COLUNAS EM academic_assessments E academic_period_closings
-- ------------------------------------------------------------------------------
ALTER TABLE public.academic_assessments 
ADD COLUMN IF NOT EXISTS school_year_id UUID;

ALTER TABLE public.academic_assessments 
ADD COLUMN IF NOT EXISTS academic_term_id UUID;

ALTER TABLE public.academic_period_closings 
ADD COLUMN IF NOT EXISTS academic_term_id UUID;

-- ------------------------------------------------------------------------------
-- 2. CONSTRAINTS FK COMPOSTAS TENANT-SAFE
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- FK academic_assessments -> school_years
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_academic_assessments_tenant_school_year'
    ) THEN
        ALTER TABLE public.academic_assessments
        ADD CONSTRAINT fk_academic_assessments_tenant_school_year
        FOREIGN KEY (tenant_id, school_year_id)
        REFERENCES public.school_years(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;

    -- FK academic_assessments -> academic_terms
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_academic_assessments_tenant_academic_term'
    ) THEN
        ALTER TABLE public.academic_assessments
        ADD CONSTRAINT fk_academic_assessments_tenant_academic_term
        FOREIGN KEY (tenant_id, academic_term_id)
        REFERENCES public.academic_terms(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;

    -- FK academic_period_closings -> academic_terms
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_academic_period_closings_tenant_term'
    ) THEN
        ALTER TABLE public.academic_period_closings
        ADD CONSTRAINT fk_academic_period_closings_tenant_term
        FOREIGN KEY (tenant_id, academic_term_id)
        REFERENCES public.academic_terms(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. ÍNDICES DE PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_academic_assessments_school_year 
ON public.academic_assessments(tenant_id, school_year_id);

CREATE INDEX IF NOT EXISTS idx_academic_assessments_academic_term 
ON public.academic_assessments(tenant_id, academic_term_id);

CREATE INDEX IF NOT EXISTS idx_academic_period_closings_term 
ON public.academic_period_closings(tenant_id, academic_term_id);

-- ------------------------------------------------------------------------------
-- 4. BACKFILL IDEMPOTENTE DE AVALIAÇÕES EXISTENTES
-- ------------------------------------------------------------------------------
-- 4.1. Vinculação de school_year_id a partir da turma
UPDATE public.academic_assessments aa
SET school_year_id = sc.school_year_id
FROM public.school_classes sc
WHERE aa.class_id = sc.id
  AND aa.tenant_id = sc.tenant_id
  AND sc.school_year_id IS NOT NULL
  AND aa.school_year_id IS NULL;

-- 4.2. Fallback de vinculação de school_year_id caso a turma tenha ano em texto
UPDATE public.academic_assessments aa
SET school_year_id = sy.id
FROM public.school_classes sc
JOIN public.school_years sy ON sy.tenant_id = sc.tenant_id AND TRIM(sy.year) = TRIM(sc.academic_year)
WHERE aa.class_id = sc.id
  AND aa.tenant_id = sc.tenant_id
  AND aa.school_year_id IS NULL;

-- 4.3. Vinculação de academic_term_id em avaliações a partir da vigência da data da avaliação
UPDATE public.academic_assessments aa
SET academic_term_id = at.id
FROM public.academic_terms at
WHERE aa.school_year_id = at.school_year_id
  AND aa.tenant_id = at.tenant_id
  AND aa.assessment_date >= at.start_date
  AND aa.assessment_date <= at.end_date
  AND aa.academic_term_id IS NULL;

-- 4.4. Fallback de academic_term_id em avaliações a partir do nome do período legado
UPDATE public.academic_assessments aa
SET academic_term_id = at.id
FROM public.academic_terms at
WHERE aa.school_year_id = at.school_year_id
  AND aa.tenant_id = at.tenant_id
  AND TRIM(LOWER(at.name)) = TRIM(LOWER(aa.academic_period))
  AND aa.academic_term_id IS NULL;

-- ------------------------------------------------------------------------------
-- 5. BACKFILL IDEMPOTENTE DE FECHAMENTOS DE PERÍODO (academic_period_closings)
-- ------------------------------------------------------------------------------
UPDATE public.academic_period_closings apc
SET academic_term_id = at.id
FROM public.school_classes sc
JOIN public.academic_terms at ON at.tenant_id = sc.tenant_id AND at.school_year_id = sc.school_year_id
WHERE apc.class_id = sc.id
  AND apc.tenant_id = sc.tenant_id
  AND TRIM(LOWER(at.name)) = TRIM(LOWER(apc.academic_period))
  AND apc.academic_term_id IS NULL;
