-- ==============================================================================
-- EDUCAR360 - MÓDULO ACADÊMICO: INTEGRAÇÃO CALENDÁRIO ↔ DIÁRIO/FREQUÊNCIA (FASE 2)
-- ==============================================================================
-- 1. Adição das colunas school_year_id e academic_term_id (UUID nullable) em public.class_lessons
-- 2. FKs compostas tenant-safe referenciando public.school_years e public.academic_terms com ON DELETE RESTRICT
-- 3. Índices de performance por tenant_id + school_year_id e tenant_id + academic_term_id
-- 4. Backfill idempotente de aulas existentes:
--    - Vinculação de school_year_id a partir da turma
--    - Vinculação de academic_term_id a partir do intervalo de datas do período acadêmico
-- 5. Preservação da coluna legada academic_period para compatibilidade
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADIÇÃO DAS COLUNAS school_year_id E academic_term_id
-- ------------------------------------------------------------------------------
ALTER TABLE public.class_lessons 
ADD COLUMN IF NOT EXISTS school_year_id UUID;

ALTER TABLE public.class_lessons 
ADD COLUMN IF NOT EXISTS academic_term_id UUID;

-- ------------------------------------------------------------------------------
-- 2. CONSTRAINTS FK COMPOSTAS TENANT-SAFE
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_class_lessons_tenant_school_year'
    ) THEN
        ALTER TABLE public.class_lessons
        ADD CONSTRAINT fk_class_lessons_tenant_school_year
        FOREIGN KEY (tenant_id, school_year_id)
        REFERENCES public.school_years(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_class_lessons_tenant_academic_term'
    ) THEN
        ALTER TABLE public.class_lessons
        ADD CONSTRAINT fk_class_lessons_tenant_academic_term
        FOREIGN KEY (tenant_id, academic_term_id)
        REFERENCES public.academic_terms(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. ÍNDICES DE PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_class_lessons_school_year 
ON public.class_lessons(tenant_id, school_year_id);

CREATE INDEX IF NOT EXISTS idx_class_lessons_academic_term 
ON public.class_lessons(tenant_id, academic_term_id);

-- ------------------------------------------------------------------------------
-- 4. BACKFILL IDEMPOTENTE DE AULAS EXISTENTES
-- ------------------------------------------------------------------------------
-- 4.1. Vinculação de school_year_id a partir da turma vinculada
UPDATE public.class_lessons cl
SET school_year_id = sc.school_year_id
FROM public.school_classes sc
WHERE cl.class_id = sc.id
  AND cl.tenant_id = sc.tenant_id
  AND sc.school_year_id IS NOT NULL
  AND cl.school_year_id IS NULL;

-- 4.2. Fallback de vinculação de school_year_id caso a turma tenha ano em texto
UPDATE public.class_lessons cl
SET school_year_id = sy.id
FROM public.school_classes sc
JOIN public.school_years sy ON sy.tenant_id = sc.tenant_id AND TRIM(sy.year) = TRIM(sc.academic_year)
WHERE cl.class_id = sc.id
  AND cl.tenant_id = sc.tenant_id
  AND cl.school_year_id IS NULL;

-- 4.3. Vinculação de academic_term_id a partir da vigência temporal da data da aula
UPDATE public.class_lessons cl
SET academic_term_id = at.id
FROM public.academic_terms at
WHERE cl.school_year_id = at.school_year_id
  AND cl.tenant_id = at.tenant_id
  AND cl.lesson_date >= at.start_date
  AND cl.lesson_date <= at.end_date
  AND cl.academic_term_id IS NULL;
