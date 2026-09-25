-- ==============================================================================
-- EDUCAR360 - MÓDULO ACADÊMICO: FUNDAÇÃO DO CALENDÁRIO ACADÊMICO (0022)
-- ==============================================================================
-- 1. Tabelas com isolamento multi-tenant estrito e integridade referencial composta:
--    - public.school_years (anos letivos com restrição de unicidade parcial para is_current)
--    - public.academic_terms (etapas/períodos com FK composta por tenant_id)
--    - public.calendar_event_categories (categorias de datas e eventos do calendário)
--    - public.calendar_events (eventos, feriados, recessos e datas pedagógicas)
-- 2. Integridade de chaves estrangeiras com ON DELETE RESTRICT para evitar perda de dados
-- 3. Trigger de validação temporal estrita (datas do evento dentro do ano e período)
-- 4. Políticas Row Level Security (RLS) com isolamento rigoroso por tenant e RBAC
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ANOS LETIVOS (SCHOOL YEARS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    year VARCHAR(10) NOT NULL,
    title VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_school_days INT NOT NULL DEFAULT 200 CHECK (total_school_days > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'ativo', 'encerrado', 'bloqueado')),
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_school_years_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT uq_school_years_tenant_year UNIQUE (tenant_id, year),
    CONSTRAINT chk_school_years_dates CHECK (end_date >= start_date)
);

-- Garantia em nível de banco: Apenas um ano letivo pode ter is_current = TRUE por tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_years_tenant_current 
ON public.school_years(tenant_id) 
WHERE (is_current = TRUE);

CREATE INDEX IF NOT EXISTS idx_school_years_tenant ON public.school_years(tenant_id);
CREATE INDEX IF NOT EXISTS idx_school_years_tenant_year ON public.school_years(tenant_id, year);
CREATE INDEX IF NOT EXISTS idx_school_years_tenant_status ON public.school_years(tenant_id, status);

ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for school_years SELECT" ON public.school_years;
CREATE POLICY "Tenant isolation for school_years SELECT"
ON public.school_years FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant managers can INSERT school_years" ON public.school_years;
CREATE POLICY "Tenant managers can INSERT school_years"
ON public.school_years FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant managers can UPDATE school_years" ON public.school_years;
CREATE POLICY "Tenant managers can UPDATE school_years"
ON public.school_years FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant managers can DELETE school_years" ON public.school_years;
CREATE POLICY "Tenant managers can DELETE school_years"
ON public.school_years FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 2. ETAPAS / PERÍODOS ACADÊMICOS (ACADEMIC TERMS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    school_year_id UUID NOT NULL REFERENCES public.school_years(id) ON DELETE RESTRICT,
    term_type VARCHAR(30) NOT NULL DEFAULT 'bimestre' CHECK (term_type IN ('bimestre', 'trimestre', 'semestre', 'etapa', 'anual', 'outro')),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL,
    sequence_order INT NOT NULL DEFAULT 1 CHECK (sequence_order > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado', 'bloqueado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_academic_terms_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT uq_academic_terms_tenant_year_code UNIQUE (tenant_id, school_year_id, code),
    CONSTRAINT chk_academic_terms_dates CHECK (end_date >= start_date),
    CONSTRAINT fk_academic_terms_tenant_school_year FOREIGN KEY (tenant_id, school_year_id) 
        REFERENCES public.school_years(tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_academic_terms_tenant ON public.academic_terms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_year ON public.academic_terms(tenant_id, school_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_order ON public.academic_terms(tenant_id, school_year_id, sequence_order);

ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for academic_terms SELECT" ON public.academic_terms;
CREATE POLICY "Tenant isolation for academic_terms SELECT"
ON public.academic_terms FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant managers can INSERT academic_terms" ON public.academic_terms;
CREATE POLICY "Tenant managers can INSERT academic_terms"
ON public.academic_terms FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant managers can UPDATE academic_terms" ON public.academic_terms;
CREATE POLICY "Tenant managers can UPDATE academic_terms"
ON public.academic_terms FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant managers can DELETE academic_terms" ON public.academic_terms;
CREATE POLICY "Tenant managers can DELETE academic_terms"
ON public.academic_terms FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 3. CATEGORIAS DE DATAS E EVENTOS DO CALENDÁRIO (CALENDAR EVENT CATEGORIES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_event_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    color_hex VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    is_school_day BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['admin_escola', 'coordenacao', 'secretaria']::TEXT[],
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_calendar_categories_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT uq_calendar_categories_tenant_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_calendar_categories_tenant ON public.calendar_event_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_categories_active ON public.calendar_event_categories(tenant_id, is_active);

ALTER TABLE public.calendar_event_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for calendar_event_categories SELECT" ON public.calendar_event_categories;
CREATE POLICY "Tenant isolation for calendar_event_categories SELECT"
ON public.calendar_event_categories FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant managers can INSERT calendar_event_categories" ON public.calendar_event_categories;
CREATE POLICY "Tenant managers can INSERT calendar_event_categories"
ON public.calendar_event_categories FOR INSERT
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant managers can UPDATE calendar_event_categories" ON public.calendar_event_categories;
CREATE POLICY "Tenant managers can UPDATE calendar_event_categories"
ON public.calendar_event_categories FOR UPDATE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
)
WITH CHECK (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Tenant managers can DELETE calendar_event_categories" ON public.calendar_event_categories;
CREATE POLICY "Tenant managers can DELETE calendar_event_categories"
ON public.calendar_event_categories FOR DELETE
USING (
    (tenant_id IN (SELECT get_auth_tenant_ids()) AND get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao'))
    OR is_platform_admin()
);

-- ------------------------------------------------------------------------------
-- 4. EVENTOS E DATAS DO CALENDÁRIO (CALENDAR EVENTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    school_year_id UUID NOT NULL REFERENCES public.school_years(id) ON DELETE RESTRICT,
    academic_term_id UUID REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES public.calendar_event_categories(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_full_day BOOLEAN NOT NULL DEFAULT TRUE,
    start_time TIME,
    end_time TIME,
    is_school_day BOOLEAN NOT NULL DEFAULT FALSE,
    target_audience VARCHAR(30) NOT NULL DEFAULT 'todos' CHECK (target_audience IN ('todos', 'professores', 'alunos_responsaveis', 'equipe_pedagogica', 'secretaria')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_calendar_events_dates CHECK (end_date >= start_date),
    -- Integridade referencial multi-tenant composta estrita
    CONSTRAINT fk_calendar_events_tenant_school_year FOREIGN KEY (tenant_id, school_year_id) 
        REFERENCES public.school_years(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_calendar_events_tenant_category FOREIGN KEY (tenant_id, category_id) 
        REFERENCES public.calendar_event_categories(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_calendar_events_tenant_term FOREIGN KEY (tenant_id, academic_term_id) 
        REFERENCES public.academic_terms(tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant ON public.calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_school_year ON public.calendar_events(tenant_id, school_year_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_category ON public.calendar_events(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON public.calendar_events(tenant_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_term ON public.calendar_events(tenant_id, academic_term_id);

-- ------------------------------------------------------------------------------
-- 5. TRIGGER DE VALIDAÇÃO TEMPORAL DE EVENTOS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_calendar_event_temporal_integrity()
RETURNS TRIGGER AS $$
DECLARE
    v_year_start DATE;
    v_year_end DATE;
    v_term_start DATE;
    v_term_end DATE;
    v_term_year_id UUID;
BEGIN
    -- 1. Obter e validar contra o ano letivo
    SELECT start_date, end_date INTO v_year_start, v_year_end
    FROM public.school_years
    WHERE id = NEW.school_year_id AND tenant_id = NEW.tenant_id;

    IF v_year_start IS NULL THEN
        RAISE EXCEPTION 'Ano letivo não encontrado para o evento ou divergência de tenant.';
    END IF;

    IF NEW.start_date < v_year_start OR NEW.end_date > v_year_end THEN
        RAISE EXCEPTION 'As datas do evento (% a %) devem estar contidas no intervalo do ano letivo (% a %).',
            NEW.start_date, NEW.end_date, v_year_start, v_year_end;
    END IF;

    -- 2. Se vinculado a um período acadêmico, validar correspondência
    IF NEW.academic_term_id IS NOT NULL THEN
        SELECT start_date, end_date, school_year_id INTO v_term_start, v_term_end, v_term_year_id
        FROM public.academic_terms
        WHERE id = NEW.academic_term_id AND tenant_id = NEW.tenant_id;

        IF v_term_start IS NULL THEN
            RAISE EXCEPTION 'Período acadêmico não encontrado ou divergência de tenant.';
        END IF;

        IF v_term_year_id <> NEW.school_year_id THEN
            RAISE EXCEPTION 'O período acadêmico informado não pertence ao ano letivo do evento.';
        END IF;

        IF NEW.start_date < v_term_start OR NEW.end_date > v_term_end THEN
            RAISE EXCEPTION 'As datas do evento (% a %) devem estar contidas no intervalo do período acadêmico (% a %).',
                NEW.start_date, NEW.end_date, v_term_start, v_term_end;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_calendar_event_temporal ON public.calendar_events;
CREATE TRIGGER trg_validate_calendar_event_temporal
BEFORE INSERT OR UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.check_calendar_event_temporal_integrity();

-- ------------------------------------------------------------------------------
-- 6. POLÍTICAS RLS PARA CALENDAR_EVENTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for calendar_events SELECT" ON public.calendar_events;
CREATE POLICY "Tenant isolation for calendar_events SELECT"
ON public.calendar_events FOR SELECT
USING (
    tenant_id IN (SELECT get_auth_tenant_ids()) 
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Authorized staff can INSERT calendar_events" ON public.calendar_events;
CREATE POLICY "Authorized staff can INSERT calendar_events"
ON public.calendar_events FOR INSERT
WITH CHECK (
    (
        tenant_id IN (SELECT get_auth_tenant_ids()) 
        AND (
            get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao')
            OR (
                get_auth_role_in_tenant(tenant_id) = 'secretaria'
                AND EXISTS (
                    SELECT 1 FROM public.calendar_event_categories cec
                    WHERE cec.id = calendar_events.category_id
                      AND cec.tenant_id = calendar_events.tenant_id
                      AND 'secretaria' = ANY(cec.allowed_roles)
                      AND cec.is_active = TRUE
                )
            )
        )
    )
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Authorized staff can UPDATE calendar_events" ON public.calendar_events;
CREATE POLICY "Authorized staff can UPDATE calendar_events"
ON public.calendar_events FOR UPDATE
USING (
    (
        tenant_id IN (SELECT get_auth_tenant_ids()) 
        AND (
            get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao')
            OR (
                get_auth_role_in_tenant(tenant_id) = 'secretaria'
                AND (created_by = auth.uid() OR created_by IS NULL)
                AND EXISTS (
                    SELECT 1 FROM public.calendar_event_categories cec
                    WHERE cec.id = calendar_events.category_id
                      AND cec.tenant_id = calendar_events.tenant_id
                      AND 'secretaria' = ANY(cec.allowed_roles)
                      AND cec.is_active = TRUE
                )
            )
        )
    )
    OR is_platform_admin()
)
WITH CHECK (
    (
        tenant_id IN (SELECT get_auth_tenant_ids()) 
        AND (
            get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao')
            OR (
                get_auth_role_in_tenant(tenant_id) = 'secretaria'
                AND (created_by = auth.uid() OR created_by IS NULL)
                AND EXISTS (
                    SELECT 1 FROM public.calendar_event_categories cec
                    WHERE cec.id = calendar_events.category_id
                      AND cec.tenant_id = calendar_events.tenant_id
                      AND 'secretaria' = ANY(cec.allowed_roles)
                      AND cec.is_active = TRUE
                )
            )
        )
    )
    OR is_platform_admin()
);

DROP POLICY IF EXISTS "Authorized staff can DELETE calendar_events" ON public.calendar_events;
CREATE POLICY "Authorized staff can DELETE calendar_events"
ON public.calendar_events FOR DELETE
USING (
    (
        tenant_id IN (SELECT get_auth_tenant_ids()) 
        AND (
            get_auth_role_in_tenant(tenant_id) IN ('admin_escola', 'coordenacao')
            OR (
                get_auth_role_in_tenant(tenant_id) = 'secretaria'
                AND (created_by = auth.uid() OR created_by IS NULL)
            )
        )
    )
    OR is_platform_admin()
);
