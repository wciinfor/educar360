export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "discarded";

export interface Lead {
  id: string;
  school_name: string;
  contact_name: string;
  email: string;
  phone: string;
  role_in_school: string | null;
  students_range: string | null;
  plan_interest: string;
  message: string | null;
  status: LeadStatus;
  internal_notes: string | null;
  assigned_to: string | null;
  converted_tenant_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface LeadInput {
  school_name: string;
  contact_name: string;
  email: string;
  phone: string;
  role_in_school?: string;
  students_range?: string;
  plan_interest?: string;
  message?: string;
}

export interface LeadResponse {
  success: boolean;
  message: string;
  error?: string;
  tenant_id?: string;
  tenant_name?: string;
  tenant_slug?: string;
  invite_token?: string;
  activation_url?: string;
  email_sent?: boolean;
  email_error?: string;
}

export interface ConvertLeadResult {
  success: boolean;
  tenant_id?: string;
  tenant_slug?: string;
  subscription_id?: string;
  plan_name?: string;
  plan_code?: string;
  trial_starts_at?: string;
  trial_ends_at?: string;
  next_due_date?: string;
  error?: string;
}
