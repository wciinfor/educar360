export type Gender = 'male' | 'female' | 'other' | 'uninformed';

export type Kinship = 'pai' | 'mae' | 'avo' | 'tio' | 'tutor' | 'outro';

export interface Student {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  cpf: string | null;
  rg: string | null;
  rg_issuer: string | null;
  birth_date: string | null;
  gender: Gender;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  postal_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  medical_notes: string | null;
  general_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  guardians?: StudentGuardianLink[];
}

export interface Guardian {
  id: string;
  tenant_id: string;
  name: string;
  cpf: string;
  rg: string | null;
  kinship: Kinship;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  profession: string | null;
  workplace: string | null;
  postal_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  is_financial_responsible: boolean;
  is_pedagogical_responsible: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  students_count?: number;
}

export interface StudentGuardianLink {
  id: string;
  tenant_id: string;
  student_id: string;
  guardian_id: string;
  kinship: Kinship;
  is_financial: boolean;
  is_pedagogical: boolean;
  is_emergency_contact: boolean;
  has_custody: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  guardian?: Guardian;
  student?: Student;
}

export interface StudentInput {
  first_name: string;
  last_name: string;
  cpf?: string;
  rg?: string;
  rg_issuer?: string;
  birth_date?: string;
  gender?: Gender;
  photo_url?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  postal_code?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  medical_notes?: string;
  general_notes?: string;
  is_active?: boolean;
  guardians?: Array<{
    guardian_id: string;
    kinship: Kinship;
    is_financial: boolean;
    is_pedagogical: boolean;
    is_emergency_contact?: boolean;
    has_custody?: boolean;
    notes?: string;
  }>;
}

export interface GuardianInput {
  name: string;
  cpf: string;
  rg?: string;
  kinship?: Kinship;
  phone?: string;
  whatsapp?: string;
  email?: string;
  profession?: string;
  workplace?: string;
  postal_code?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  is_financial_responsible?: boolean;
  is_pedagogical_responsible?: boolean;
  is_active?: boolean;
}
