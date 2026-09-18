/**
 * Tipagens preparatórias para a API v3 do ASAAS (Gateway exclusivo do Admin Educar360)
 */

export interface AsaasCustomerPayload {
  name: string;
  cpfCnpj: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  externalReference: string; // tenant_id
  notificationDisabled?: boolean;
}

export interface AsaasCustomerResponse {
  object: "customer";
  id: string; // cus_...
  name: string;
  email: string;
  cpfCnpj: string;
  dateCreated: string;
}

export interface AsaasSubscriptionPayload {
  customer: string; // asaas_customer_id
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
  value: number; // ex: 399.00
  nextDueDate: string; // YYYY-MM-DD
  cycle: "MONTHLY" | "YEARLY";
  description: string;
  externalReference: string; // saas_subscription_id
}

export interface AsaasSubscriptionResponse {
  object: "subscription";
  id: string; // sub_...
  dateCreated: string;
  customer: string;
  value: number;
  nextDueDate: string;
  cycle: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface AsaasWebhookEvent {
  event:
    | "PAYMENT_CREATED"
    | "PAYMENT_RECEIVED"
    | "PAYMENT_OVERDUE"
    | "PAYMENT_DELETED"
    | "PAYMENT_RESTORED"
    | "PAYMENT_REFUNDED";
  payment: {
    id: string;
    customer: string;
    subscription?: string;
    value: number;
    netValue: number;
    status: string;
    dueDate: string;
    paymentDate?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
  };
}
