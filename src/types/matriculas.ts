import { Student, Guardian } from "./secretaria";
import { SchoolClass, Course, Series } from "./academico";

export type EnrollmentStatus =
  | "pre_matricula"
  | "em_analise"
  | "matriculado"
  | "cancelado"
  | "transferido";

export type EnrollmentShift = "matutino" | "vespertino" | "noturno" | "integral";

export type EnrollmentDocumentStatus =
  | "pendente"
  | "recebido"
  | "dispensado"
  | "rejeitado";

export interface EnrollmentDocumentItem {
  id: string;
  enrollment_id: string;
  tenant_id: string;
  document_type: string;
  document_name: string;
  status: EnrollmentDocumentStatus;
  is_required: boolean;
  received_at: string | null;
  verified_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrollmentDocumentTemplate {
  id: string;
  document_type: string;
  document_name: string;
  is_required: boolean;
  description?: string;
}

export interface EnrollmentDocumentProgress {
  total: number;
  received: number;
  dispensed: number;
  pending: number;
  rejected: number;
  percent: number;
  isComplete: boolean;
}

export interface Enrollment {
  id: string;
  tenant_id: string;
  enrollment_code: string;
  academic_year: string;
  student_id: string;
  guardian_id: string | null;
  course_name: string;
  grade_level: string;
  shift: EnrollmentShift;
  status: EnrollmentStatus;
  status_notes: string | null;
  entry_date: string;
  exit_date: string | null;
  class_id?: string | null;
  created_at: string;
  updated_at: string;

  // Relações carregadas
  student?: Student;
  guardian?: Guardian | null;
  school_class?: SchoolClass | null;
  documents?: EnrollmentDocumentItem[];
  document_progress?: EnrollmentDocumentProgress;
  history?: EnrollmentHistoryItem[];
}

export type EnrollmentActionType =
  | "ENROLLMENT_CREATED"
  | "ACADEMIC_DATA_UPDATED"
  | "STATUS_CHANGED"
  | "DOCUMENT_UPDATED";

export interface EnrollmentHistoryItem {
  id: string;
  tenant_id: string;
  enrollment_id: string;
  action_type: EnrollmentActionType | string;
  previous_values: Record<string, any>;
  new_values: Record<string, any>;
  changed_by: string | null;
  changed_by_name: string | null;
  reason: string;
  created_at: string;
}

export interface UpdateEnrollmentAcademicDataInput {
  enrollmentId: string;
  academic_year: string;
  course_name: string;
  grade_level: string;
  shift: EnrollmentShift;
  class_id?: string | null;
  reason: string;
}


export interface UpdateEnrollmentDocumentInput {
  enrollmentId: string;
  documentId?: string;
  documentType: string;
  status: EnrollmentDocumentStatus;
  notes?: string;
}

export interface AddCustomEnrollmentDocumentInput {
  enrollmentId: string;
  documentName: string;
  documentType?: string;
  isRequired: boolean;
  notes?: string;
}

export interface SaveChecklistSettingsInput {
  templates: EnrollmentDocumentTemplate[];
}

export const DEFAULT_DOCUMENT_TEMPLATES: EnrollmentDocumentTemplate[] = [
  {
    id: "certidao_nascimento",
    document_type: "certidao_nascimento",
    document_name: "Certidão de Nascimento ou Casamento",
    is_required: true,
    description: "Cópia legível da certidão de registro civil do aluno.",
  },
  {
    id: "historico_escolar",
    document_type: "historico_escolar",
    document_name: "Histórico Escolar / Declaração de Transferência",
    is_required: true,
    description: "Declaração de transferência ou histórico escolar da escola anterior.",
  },
  {
    id: "comprovante_residencia",
    document_type: "comprovante_residencia",
    document_name: "Comprovante de Residência Atualizado",
    is_required: true,
    description: "Conta de água, luz ou telefone recente (últimos 90 dias).",
  },
  {
    id: "carteira_vacinacao",
    document_type: "carteira_vacinacao",
    document_name: "Carteira de Vacinação Atualizada",
    is_required: true,
    description: "Folha de identificação e registro de vacinas atualizadas.",
  },
  {
    id: "documento_aluno",
    document_type: "documento_aluno",
    document_name: "RG e CPF do Estudante",
    is_required: true,
    description: "Documento oficial de identidade com foto do estudante.",
  },
  {
    id: "documento_responsavel",
    document_type: "documento_responsavel",
    document_name: "RG e CPF do Responsável Legal / Financeiro",
    is_required: true,
    description: "Documento oficial de identidade dos pais ou responsável.",
  },
  {
    id: "declaracao_quitacao",
    document_type: "declaracao_quitacao",
    document_name: "Declaração de Quitação da Escola Anterior",
    is_required: false,
    description: "Comprovação de adimplemento da instituição de origem.",
  },
  {
    id: "foto_3x4",
    document_type: "foto_3x4",
    document_name: "Foto 3x4 Recente",
    is_required: false,
    description: "Foto padrão para prontuário e carteirinha estudantil.",
  },
];

export const DOCUMENT_STATUS_CONFIG: Record<
  EnrollmentDocumentStatus,
  { label: string; badgeColor: string; iconColor: string }
> = {
  pendente: {
    label: "Pendente",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    iconColor: "text-amber-500",
  },
  recebido: {
    label: "Recebido",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconColor: "text-emerald-500",
  },
  dispensado: {
    label: "Dispensado",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    iconColor: "text-slate-400",
  },
  rejeitado: {
    label: "Rejeitado",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    iconColor: "text-rose-500",
  },
};

export interface EnrollmentFilters {
  search?: string;
  status?: "all" | EnrollmentStatus;
  academicYear?: string;
  course?: string;
  gradeLevel?: string;
  classId?: string;
  shift?: "all" | EnrollmentShift;
}

export interface CreateEnrollmentInput {
  // Aluno
  isExistingStudent: boolean;
  studentId?: string;
  newStudent?: {
    first_name: string;
    last_name: string;
    cpf?: string;
    birth_date?: string;
    gender?: "male" | "female" | "other" | "uninformed";
    email?: string;
    phone?: string;
  };

  // Responsável
  isExistingGuardian: boolean;
  guardianId?: string;
  newGuardian?: {
    name: string;
    cpf: string;
    kinship: "pai" | "mae" | "avo" | "tio" | "tutor" | "outro";
    phone?: string;
    email?: string;
  };

  // Dados da Matrícula
  academic_year: string;
  course_name: string;
  grade_level: string;
  shift: EnrollmentShift;
  class_id?: string | null;
  initial_status: EnrollmentStatus;
  notes?: string;
}


export interface UpdateEnrollmentStatusInput {
  enrollmentId: string;
  targetStatus: EnrollmentStatus;
  notes?: string;
}

export const ENROLLMENT_STATUS_LABELS: Record<
  EnrollmentStatus,
  { label: string; desc: string; badgeColor: string }
> = {
  pre_matricula: {
    label: "Pré-matrícula",
    desc: "Inscrição preliminar / captação comercial.",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  em_analise: {
    label: "Em Análise",
    desc: "Documentação ou crédito em verificação na secretaria.",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  matriculado: {
    label: "Matriculado",
    desc: "Matrícula confirmada e ativa no ano letivo.",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  transferido: {
    label: "Transferido",
    desc: "Transferência expedida para outra instituição.",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  cancelado: {
    label: "Cancelado",
    desc: "Desistência, cancelamento ou vaga indeferida.",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
};
