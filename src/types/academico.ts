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

// ==============================================================================
// ETAPA 1: DIÁRIO DE CLASSE E FREQUÊNCIA
// ==============================================================================

export type AttendanceStatus = "presente" | "falta" | "justificada";

export const ACADEMIC_PERIODS = [
  "1º Bimestre",
  "2º Bimestre",
  "3º Bimestre",
  "4º Bimestre",
  "1º Trimestre",
  "2º Trimestre",
  "3º Trimestre",
  "Semestre 1",
  "Semestre 2",
  "Anual",
] as const;

export interface TeacherClassAllocation {
  id: string;
  tenant_id: string;
  class_id: string;
  user_id: string;
  subject_name?: string | null;
  academic_year: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  teacher_name?: string;
  teacher_email?: string;
  class_name?: string;
}

export interface ClassLesson {
  id: string;
  tenant_id: string;
  class_id: string;
  teacher_id: string;
  lesson_date: string; // YYYY-MM-DD
  academic_period: string;
  subject_name?: string | null;
  title: string;
  content_summary: string;
  pedagogical_notes?: string | null;
  created_at: string;
  updated_at: string;
  teacher_name?: string;
  class_name?: string;
  attendances_count?: number;
  present_count?: number;
  absent_count?: number;
  justified_count?: number;
}

export interface LessonAttendance {
  id: string;
  tenant_id: string;
  lesson_id: string;
  student_id: string;
  enrollment_id?: string | null;
  status: AttendanceStatus;
  justification_reason?: string | null;
  recorded_by?: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_cpf?: string | null;
}

// DTOs para Aula / Diário de Classe
export interface SaveClassLessonInput {
  id?: string;
  class_id: string;
  lesson_date: string;
  academic_period: string;
  subject_name?: string;
  title: string;
  content_summary: string;
  pedagogical_notes?: string;
}

// DTOs para Frequência
export interface AttendanceRecordItemInput {
  student_id: string;
  enrollment_id?: string | null;
  status: AttendanceStatus;
  justification_reason?: string;
}

export interface SaveLessonAttendancesInput {
  lesson_id: string;
  attendances: AttendanceRecordItemInput[];
}

export interface StudentAttendanceSummary {
  student_id: string;
  enrollment_id?: string | null;
  student_name: string;
  student_cpf?: string | null;
  total_lessons: number;
  presences: number;
  absences: number;
  justified: number;
  attendance_percentage: number;
}

export interface ClassAttendanceConsolidatedReport {
  school_class: SchoolClass;
  period: string;
  total_lessons: number;
  students_summary: StudentAttendanceSummary[];
  overall_attendance_rate: number;
}

// ==============================================================================
// ETAPA 2: AVALIAÇÕES, LANÇAMENTO DE NOTAS E BOLETIM ESCOLAR
// ==============================================================================

export type AssessmentType =
  | "prova"
  | "trabalho"
  | "seminario"
  | "teste"
  | "participacao"
  | "recuperacao"
  | "outro";

export type CalculationFormula = "media_aritmetica" | "media_ponderada" | "soma_pontos";

export type RoundingRule = "padrao" | "baixo" | "cima" | "sem_arredondamento";

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  prova: "Prova / Avaliação Escrita",
  trabalho: "Trabalho Individual / Grupo",
  seminario: "Seminário / Apresentação",
  teste: "Teste / Simulado",
  participacao: "Participação / Atividades",
  recuperacao: "Recuperação Paralela",
  outro: "Outro Instrumento",
};

export interface AcademicSettings {
  id?: string;
  tenant_id: string;
  passing_grade: number;
  max_score_per_period: number;
  calculation_formula: CalculationFormula;
  rounding_rule: RoundingRule;
  decimal_places: number;
  recovery_enabled: boolean;
  recovery_replaces_lowest: boolean;
  min_attendance_percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicAssessment {
  id: string;
  tenant_id: string;
  class_id: string;
  subject_name: string;
  academic_period: string;
  title: string;
  description?: string | null;
  assessment_date: string; // YYYY-MM-DD
  assessment_type: AssessmentType;
  max_score: number;
  weight: number;
  is_locked: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  class_name?: string;
  creator_name?: string;
  grades_count?: number;
  average_score?: number;
}

export interface StudentAssessmentGrade {
  id: string;
  tenant_id: string;
  assessment_id: string;
  student_id: string;
  enrollment_id?: string | null;
  score?: number | null;
  is_absent: boolean;
  feedback_notes?: string | null;
  recorded_by?: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_cpf?: string | null;
}

export interface AcademicPeriodClosing {
  id: string;
  tenant_id: string;
  class_id: string;
  academic_period: string;
  subject_name?: string | null;
  is_closed: boolean;
  closed_at: string;
  closed_by?: string | null;
  closure_notes?: string | null;
  closer_name?: string;
}

// DTOs para Avaliação
export interface SaveAssessmentInput {
  id?: string;
  class_id: string;
  subject_name: string;
  academic_period: string;
  title: string;
  description?: string;
  assessment_date: string;
  assessment_type: AssessmentType;
  max_score: number;
  weight: number;
}

// DTOs para Lançamento de Notas
export interface GradeItemInput {
  student_id: string;
  enrollment_id?: string | null;
  score?: number | null;
  is_absent: boolean;
  feedback_notes?: string;
}

export interface SaveStudentGradesInput {
  assessment_id: string;
  grades: GradeItemInput[];
}

export interface TogglePeriodClosingInput {
  class_id: string;
  academic_period: string;
  subject_name?: string;
  is_closed: boolean;
  closure_notes?: string;
}

export interface SaveAcademicSettingsInput {
  passing_grade: number;
  max_score_per_period: number;
  calculation_formula: CalculationFormula;
  rounding_rule: RoundingRule;
  decimal_places: number;
  recovery_enabled: boolean;
  recovery_replaces_lowest: boolean;
  min_attendance_percentage: number;
}

// ==============================================================================
// ESTRUTURA DO BOLETIM ESCOLAR (REPORT CARD)
// ==============================================================================

export interface PeriodGradeDetail {
  period: string;
  assessments: {
    id: string;
    title: string;
    type: AssessmentType;
    max_score: number;
    weight: number;
    score: number | null;
    is_absent: boolean;
  }[];
  calculated_grade: number | null; // Média ou Soma do período
  recovery_grade?: number | null;
  final_period_grade: number | null;
  is_closed: boolean;
}

export interface SubjectReportItem {
  subject_name: string;
  periods: Record<string, PeriodGradeDetail>;
  annual_average: number | null;
  final_exam_grade?: number | null;
  final_grade: number | null;
  total_lessons: number;
  presences: number;
  absences: number;
  attendance_percentage: number;
  situation: "aprovado" | "reprovado" | "recuperacao" | "em_andamento";
}

export interface StudentReportCard {
  student_id: string;
  student_name: string;
  student_cpf?: string | null;
  enrollment_id?: string | null;
  enrollment_number?: string | null;
  school_class: SchoolClass;
  academic_year: string;
  settings: AcademicSettings;
  subjects: SubjectReportItem[];
  overall_average: number | null;
  overall_attendance_percentage: number;
  overall_situation: "aprovado" | "reprovado" | "recuperacao" | "em_andamento";
}

// ==============================================================================
// ETAPA 3: HISTÓRICO ESCOLAR E SNAPSHOTS IMUTÁVEIS
// ==============================================================================

export type HistoryOriginType =
  | "interna"
  | "externa_transferencia"
  | "aproveitamento_estudos";

export type HistoryFinalResult =
  | "aprovado"
  | "reprovado"
  | "recuperacao"
  | "transferido"
  | "em_curso"
  | "concluido"
  | "classificado"
  | "dispensado";

export const HISTORY_RESULT_LABELS: Record<HistoryFinalResult, string> = {
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  recuperacao: "Recuperação",
  transferido: "Transferido",
  em_curso: "Em Curso (Ano Letivo Atual)",
  concluido: "Concluído",
  classificado: "Classificado",
  dispensado: "Dispensado / Aproveitamento",
};

export interface HistoryCurriculumSubject {
  subject_name: string;
  workload_hours?: number | null;
  final_score?: number | null;
  recovery_score?: number | null;
  absences?: number | null;
  attendance_pct?: number | null;
  situation: HistoryFinalResult;
}

export interface StudentAcademicHistoryRecord {
  id: string;
  tenant_id: string;
  student_id: string;
  enrollment_id?: string | null;
  academic_year: string;
  grade_level: string;
  course_name: string;
  school_name: string;
  school_city?: string | null;
  school_state?: string | null;
  origin_type: HistoryOriginType;
  shift?: string | null;
  total_days?: number | null;
  total_workload_hours?: number | null;
  student_attendance_hours?: number | null;
  attendance_percentage?: number | null;
  final_result: HistoryFinalResult;
  is_locked: boolean;
  consolidated_at: string;
  consolidated_by?: string | null;
  observations?: string | null;
  curriculum_snapshot: HistoryCurriculumSubject[];
  created_at: string;
  updated_at: string;
  consolidator_name?: string | null;
}

export interface HistoryRectification {
  id: string;
  tenant_id: string;
  history_record_id: string;
  student_id: string;
  rectified_by: string;
  rectified_at: string;
  reason: string;
  previous_snapshot: any;
  new_snapshot: any;
  rectifier_name?: string | null;
}

export interface StudentBioProfile {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  cpf?: string | null;
  rg?: string | null;
  rg_issuer?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  photo_url?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  guardians?: {
    name: string;
    kinship: string;
    cpf?: string | null;
    phone?: string | null;
  }[];
}

export interface CompleteStudentHistoryDocument {
  student: StudentBioProfile;
  institution: {
    name: string;
    cnpj?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  consolidated_records: StudentAcademicHistoryRecord[];
  current_year_record?: {
    enrollment_id: string;
    academic_year: string;
    grade_level: string;
    course_name: string;
    school_class_name: string;
    shift: string;
    enrollment_number?: string | null;
    enrollment_status: string;
    overall_average: number | null;
    overall_attendance_percentage: number;
    overall_situation: string;
    subjects: HistoryCurriculumSubject[];
    is_in_progress: true;
  } | null;
  rectifications?: HistoryRectification[];
}

// DTOs para Histórico
export interface SaveExternalHistoryInput {
  student_id: string;
  academic_year: string;
  grade_level: string;
  course_name: string;
  school_name: string;
  school_city?: string;
  school_state?: string;
  origin_type: HistoryOriginType;
  shift?: string;
  total_days?: number;
  total_workload_hours?: number;
  attendance_percentage?: number;
  final_result: HistoryFinalResult;
  observations?: string;
  curriculum: HistoryCurriculumSubject[];
}

export interface ConsolidateCurrentYearHistoryInput {
  student_id: string;
  enrollment_id: string;
  total_days?: number;
  total_workload_hours?: number;
  final_result: HistoryFinalResult;
  observations?: string;
}

export interface RectifyHistoryInput {
  history_record_id: string;
  reason: string;
  updated_record: Partial<SaveExternalHistoryInput>;
}


