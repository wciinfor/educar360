import { Tenant, Profile } from "./database";

export type SaasTenantStatus = "active" | "trial" | "suspended" | "canceled" | "inactive";

export type SaasSubscriptionStatus =
  | "trial"
  | "active"
  | "suspended"
  | "canceled"
  | "past_due";

export type SaasPaymentStatus = "up_to_date" | "pending" | "overdue";

export interface SaasPlan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price_cents: number;
  billing_cycle: "monthly" | "yearly";
  max_students: number | null;
  is_active: boolean;
  features: string[];
  created_at: string;
  updated_at: string;
}

export interface SaasSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: SaasSubscriptionStatus;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string | null;
  next_due_date: string | null;
  amount_cents: number;
  payment_status: SaasPaymentStatus;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  created_at: string;
  updated_at: string;
  plan?: SaasPlan;
  tenant?: Tenant;
}

export interface SaasSubscriptionHistory {
  id: string;
  subscription_id: string;
  tenant_id: string;
  event_type: string;
  old_plan_id: string | null;
  new_plan_id: string | null;
  old_status: string | null;
  new_status: string | null;
  reason: string | null;
  actor_user_id: string | null;
  created_at: string;
  old_plan?: SaasPlan;
  new_plan?: SaasPlan;
  actor?: Profile;
}

export interface SaasInvoice {
  id: string;
  subscription_id: string;
  tenant_id: string;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "canceled";
  paid_at: string | null;
  asaas_payment_id: string | null;
  asaas_invoice_url: string | null;
  asaas_bank_slip_url: string | null;
  asaas_pix_qrcode: string | null;
  created_at: string;
}

export interface TenantWithSubscription extends Tenant {
  subscription?: SaasSubscription;
}
