import { SaasPlan, SaasInvoice } from "./platform";

export interface TenantInstitutionData {
  id: string;
  name: string;
  trade_name: string | null;
  slug: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  // Campos estruturados do JSONB settings
  logo_url?: string | null;
  website?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
}

export type SchoolGatewayProvider = "asaas" | "efi";
export type GatewayEnvironment = "sandbox" | "production";

export interface SchoolGatewayConfig {
  id?: string;
  tenant_id: string;
  provider: SchoolGatewayProvider;
  environment: GatewayEnvironment;
  is_active: boolean;
  // Credenciais salvas de forma mascarada na consulta (ex: sk_live_...****)
  masked_api_key?: string;
  masked_client_id?: string;
  has_credentials: boolean;
  webhook_url?: string;
  updated_at?: string;
}

export interface TenantPlanUsage {
  plan: SaasPlan;
  active_students_count: number;
  max_students: number | null;
  usage_percentage: number;
  subscription_status: string;
  next_due_date: string | null;
  amount_cents: number;
  can_upgrade: boolean;
}

export interface TenantSaasInvoiceItem extends SaasInvoice {
  period_label?: string;
}

export interface TenantUserListItem {
  id: string; // tenant_user.id
  user_id: string; // auth.users.id
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_platform_admin: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InviteTenantUserInput {
  email: string;
  fullName: string;
  role: "admin_escola" | "financeiro" | "secretaria" | "comercial" | "recepcao";
  tempPassword?: string;
}

export interface UpdateTenantUserRoleInput {
  tenantUserId: string;
  targetRole: "admin_escola" | "financeiro" | "secretaria" | "comercial" | "recepcao";
}

export interface ToggleTenantUserStatusInput {
  tenantUserId: string;
  isActive: boolean;
}

// ==============================================================================
// 4. CARTEIRINHA ESTUDANTIL (CR-80)
// ==============================================================================

export type IdCardThemePreset =
  | "modern_blue"
  | "modern_dark"
  | "classic_white"
  | "emerald_clean"
  | "royal_purple"
  | "custom";

export interface IdCardTemplateConfig {
  // Tema e Estilo Visual
  theme: IdCardThemePreset;
  primary_color: string;
  secondary_color: string;
  background_type: "solid" | "gradient";
  background_color: string;
  background_gradient_end?: string;
  text_color: string;
  accent_text_color: string;
  font_family: "sans" | "serif" | "mono";

  // Identificação da Instituição
  show_school_name: boolean;
  school_name_override?: string;
  show_school_logo: boolean;
  school_logo_url?: string;
  card_title: string;
  academic_year: string;

  // Foto do Aluno
  show_photo: boolean;
  photo_shape: "rounded" | "square" | "circle";
  photo_border_color: string;

  // Campos Visíveis no Cartão (Frente)
  show_student_name: boolean;
  show_registration_number: boolean;
  show_class_name: boolean;
  show_course_name: boolean;
  show_birth_date: boolean;
  show_document_cpf: boolean;
  show_document_rg: boolean;
  show_validity: boolean;
  validity_date?: string;

  // QR Code
  show_qr_code: boolean;
  qr_code_position: "front" | "back";
  qr_code_instruction?: string;

  // Verso do Cartão
  back_show_school_info: boolean;
  back_school_address?: string;
  back_school_phone?: string;
  back_school_cnpj?: string;
  back_legal_terms: string;
  back_show_signature_line: boolean;
  back_signature_title: string;
  back_show_barcode: boolean;
}

export const DEFAULT_ID_CARD_TEMPLATE: IdCardTemplateConfig = {
  theme: "modern_blue",
  primary_color: "#4f46e5",
  secondary_color: "#6366f1",
  background_type: "gradient",
  background_color: "#0f172a",
  background_gradient_end: "#1e1b4b",
  text_color: "#ffffff",
  accent_text_color: "#c7d2fe",
  font_family: "sans",

  show_school_name: true,
  card_title: "Identificação Estudantil",
  academic_year: "2026",
  show_school_logo: true,

  show_photo: true,
  photo_shape: "rounded",
  photo_border_color: "#ffffff33",

  show_student_name: true,
  show_registration_number: true,
  show_class_name: true,
  show_course_name: true,
  show_birth_date: true,
  show_document_cpf: true,
  show_document_rg: false,
  show_validity: true,
  validity_date: "31/12/2026",

  show_qr_code: true,
  qr_code_position: "front",
  qr_code_instruction: "Validação Digital Antifraude",

  back_show_school_info: true,
  back_legal_terms:
    "Documento oficial de identificação estudantil válido em todo o território nacional para comprovação da condição discente e benefício da meia-entrada, nos termos da Lei Federal nº 12.933/2013.",
  back_show_signature_line: true,
  back_signature_title: "Diretoria Geral / Secretaria Escolar",
  back_show_barcode: true,
};

export const ID_CARD_THEME_PRESETS: Record<
  IdCardThemePreset,
  {
    name: string;
    primary_color: string;
    secondary_color: string;
    background_type: "solid" | "gradient";
    background_color: string;
    background_gradient_end?: string;
    text_color: string;
    accent_text_color: string;
    photo_border_color: string;
  }
> = {
  modern_blue: {
    name: "Azul Noturno / Indigo",
    primary_color: "#4f46e5",
    secondary_color: "#6366f1",
    background_type: "gradient",
    background_color: "#0f172a",
    background_gradient_end: "#1e1b4b",
    text_color: "#ffffff",
    accent_text_color: "#c7d2fe",
    photo_border_color: "#ffffff33",
  },
  modern_dark: {
    name: "Dark Grafite",
    primary_color: "#3b82f6",
    secondary_color: "#60a5fa",
    background_type: "gradient",
    background_color: "#18181b",
    background_gradient_end: "#09090b",
    text_color: "#ffffff",
    accent_text_color: "#93c5fd",
    photo_border_color: "#ffffff25",
  },
  classic_white: {
    name: "Branco Clássico",
    primary_color: "#1e293b",
    secondary_color: "#334155",
    background_type: "gradient",
    background_color: "#ffffff",
    background_gradient_end: "#f1f5f9",
    text_color: "#0f172a",
    accent_text_color: "#475569",
    photo_border_color: "#cbd5e1",
  },
  emerald_clean: {
    name: "Verde Esmeralda",
    primary_color: "#059669",
    secondary_color: "#10b981",
    background_type: "gradient",
    background_color: "#064e3b",
    background_gradient_end: "#022c22",
    text_color: "#ffffff",
    accent_text_color: "#a7f3d0",
    photo_border_color: "#ffffff30",
  },
  royal_purple: {
    name: "Roxo Real",
    primary_color: "#7c3aed",
    secondary_color: "#8b5cf6",
    background_type: "gradient",
    background_color: "#2e1065",
    background_gradient_end: "#1e1b4b",
    text_color: "#ffffff",
    accent_text_color: "#ddd6fe",
    photo_border_color: "#ffffff30",
  },
  custom: {
    name: "Personalizado",
    primary_color: "#4f46e5",
    secondary_color: "#6366f1",
    background_type: "gradient",
    background_color: "#0f172a",
    background_gradient_end: "#1e1b4b",
    text_color: "#ffffff",
    accent_text_color: "#c7d2fe",
    photo_border_color: "#ffffff33",
  },
};

