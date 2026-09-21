export type AcademicShift = "matutino" | "vespertino" | "noturno" | "integral";

export interface Course {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  series_count?: number;
}

export interface Series {
  id: string;
  tenant_id: string;
  course_id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  course?: Course;
  classes_count?: number;
}

export interface SchoolClass {
  id: string;
  tenant_id: string;
  series_id: string;
  name: string;
  academic_year: string;
  shift: AcademicShift;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  series?: Series;
  students_enrolled_count?: number;
}

// DTOs para Cursos
export interface CreateCourseInput {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateCourseInput {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

// DTOs para Séries
export interface CreateSeriesInput {
  course_id: string;
  name: string;
  description?: string;
  order_index?: number;
  is_active?: boolean;
}

export interface UpdateSeriesInput {
  id: string;
  course_id: string;
  name: string;
  description?: string;
  order_index?: number;
  is_active: boolean;
}

// DTOs para Turmas
export interface CreateSchoolClassInput {
  series_id: string;
  name: string;
  academic_year: string;
  shift: AcademicShift;
  capacity: number;
  is_active?: boolean;
}

export interface UpdateSchoolClassInput {
  id: string;
  series_id: string;
  name: string;
  academic_year: string;
  shift: AcademicShift;
  capacity: number;
  is_active: boolean;
}
