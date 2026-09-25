/**
 * EDUCAR360 - TIPOS DO MÓDULO CALENDÁRIO ACADÊMICO
 * 
 * Modelagem de tipos para Ano Letivo, Períodos/Etapas Acadêmicas,
 * Categorias de Eventos e Eventos do Calendário Escolar.
 */

export type SchoolYearStatus = "planejamento" | "ativo" | "encerrado" | "bloqueado";

export interface SchoolYear {
  id: string;
  tenant_id: string;
  year: string;
  title: string;
  start_date: string;
  end_date: string;
  total_school_days: number;
  status: SchoolYearStatus;
  is_current: boolean;
  created_at: string;
  updated_at: string;
  academic_terms?: AcademicTerm[];
}

export interface CreateSchoolYearInput {
  year: string;
  title: string;
  start_date: string;
  end_date: string;
  total_school_days?: number;
  status?: SchoolYearStatus;
  is_current?: boolean;
}

export interface UpdateSchoolYearInput {
  id: string;
  year?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  total_school_days?: number;
  status?: SchoolYearStatus;
  is_current?: boolean;
}

export type AcademicTermType =
  | "bimestre"
  | "trimestre"
  | "semestre"
  | "etapa"
  | "anual"
  | "outro";

export type AcademicTermStatus = "aberto" | "fechado" | "bloqueado";

export interface AcademicTerm {
  id: string;
  tenant_id: string;
  school_year_id: string;
  term_type: AcademicTermType;
  name: string;
  code: string;
  sequence_order: number;
  start_date: string;
  end_date: string;
  status: AcademicTermStatus;
  created_at: string;
  updated_at: string;
  school_year?: SchoolYear;
}

export interface CreateAcademicTermInput {
  school_year_id: string;
  term_type?: AcademicTermType;
  name: string;
  code: string;
  sequence_order?: number;
  start_date: string;
  end_date: string;
  status?: AcademicTermStatus;
}

export interface UpdateAcademicTermInput {
  id: string;
  term_type?: AcademicTermType;
  name?: string;
  code?: string;
  sequence_order?: number;
  start_date?: string;
  end_date?: string;
  status?: AcademicTermStatus;
}

export interface CalendarEventCategory {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string | null;
  color_hex: string;
  is_school_day: boolean;
  allowed_roles: string[];
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCalendarEventCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  color_hex?: string;
  is_school_day?: boolean;
  allowed_roles?: string[];
  is_system?: boolean;
  is_active?: boolean;
}

export interface UpdateCalendarEventCategoryInput {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  color_hex?: string;
  is_school_day?: boolean;
  allowed_roles?: string[];
  is_active?: boolean;
}

export type EventTargetAudience =
  | "todos"
  | "professores"
  | "alunos_responsaveis"
  | "equipe_pedagogica"
  | "secretaria";

export interface CalendarEvent {
  id: string;
  tenant_id: string;
  school_year_id: string;
  academic_term_id?: string | null;
  category_id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  is_full_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
  is_school_day: boolean;
  target_audience: EventTargetAudience;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  category?: CalendarEventCategory;
  academic_term?: AcademicTerm;
  school_year?: SchoolYear;
}

export interface CreateCalendarEventInput {
  school_year_id: string;
  academic_term_id?: string | null;
  category_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_full_day?: boolean;
  start_time?: string | null;
  end_time?: string | null;
  is_school_day?: boolean;
  target_audience?: EventTargetAudience;
}

export interface UpdateCalendarEventInput {
  id: string;
  academic_term_id?: string | null;
  category_id?: string;
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_full_day?: boolean;
  start_time?: string | null;
  end_time?: string | null;
  is_school_day?: boolean;
  target_audience?: EventTargetAudience;
}

export interface CalendarEventsFilter {
  school_year_id?: string;
  academic_term_id?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
  target_audience?: EventTargetAudience;
  is_school_day?: boolean;
}
