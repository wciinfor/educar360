/**
 * EDUCAR360 - MOTOR DE REGRAS E CÁLCULO DE TRIAL (14 DIAS)
 * 
 * Regras Centrais:
 * 1. O período oficial de teste é de exatamente 14 dias a partir da criação/início.
 * 2. As datas são extraídas da assinatura persistida no banco ou do tenant.
 * 3. O cálculo de dias restantes é feito dinamicamente em tempo real (UTC).
 * 4. A completude do cadastro da instituição avalia 6 campos prioritários:
 *    - CNPJ
 *    - Razão Social (name)
 *    - Nome Fantasia (trade_name)
 *    - E-mail institucional (email)
 *    - Telefone/WhatsApp (phone)
 *    - Responsável (settings.responsible_name ou settings.contact_name)
 */

import { Tenant } from "@/types/database";
import { SaasSubscription } from "@/types/platform";
import { isValidCnpj } from "@/lib/utils/cnpj";

export type TrialUrgencyLevel = "normal" | "warning_3_days" | "warning_1_day" | "expired";

export interface InstitutionRegistrationStatus {
  isComplete: boolean;
  missingFields: string[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  details: {
    hasCnpj: boolean;
    hasName: boolean;
    hasTradeName: boolean;
    hasEmail: boolean;
    hasPhone: boolean;
    hasResponsible: boolean;
  };
}

export interface TenantTrialInfo {
  isTrial: boolean;
  isExpired: boolean;
  startDate: string;
  endDate: string;
  formattedEndDate: string;
  totalDays: number;
  daysRemaining: number;
  daysElapsed: number;
  urgencyLevel: TrialUrgencyLevel;
  registration: InstitutionRegistrationStatus;
}

/**
 * Avalia se os dados cadastrais prioritários da instituição estão completos.
 */
export function evaluateInstitutionRegistration(tenant: Tenant): InstitutionRegistrationStatus {
  const missing: string[] = [];
  const settings = (tenant.settings as Record<string, any>) || {};

  // 1. CNPJ
  const cleanCnpj = (tenant.cnpj || "").replace(/\D/g, "");
  const hasCnpj = cleanCnpj.length === 14 && isValidCnpj(cleanCnpj);
  if (!hasCnpj) {
    missing.push("CNPJ válido");
  }

  // 2. Razão Social (name)
  const hasName = Boolean(tenant.name && tenant.name.trim().length >= 3);
  if (!hasName) {
    missing.push("Razão Social");
  }

  // 3. Nome Fantasia (trade_name ou name)
  const hasTradeName = Boolean(tenant.trade_name && tenant.trade_name.trim().length >= 2);
  if (!hasTradeName) {
    missing.push("Nome Fantasia");
  }

  // 4. E-mail Institucional
  const emailVal = (tenant.email || "").trim().toLowerCase();
  const hasEmail = Boolean(emailVal && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal));
  if (!hasEmail) {
    missing.push("E-mail institucional");
  }

  // 5. Telefone / WhatsApp
  const cleanPhone = (tenant.phone || "").replace(/\D/g, "");
  const hasPhone = cleanPhone.length >= 10;
  if (!hasPhone) {
    missing.push("Telefone / WhatsApp com DDD");
  }

  // 6. Responsável pela Instituição
  const responsibleVal = (settings.responsible_name || settings.contact_name || "").trim();
  const hasResponsible = responsibleVal.length >= 3;
  if (!hasResponsible) {
    missing.push("Nome do Responsável");
  }

  const completedCount = 6 - missing.length;
  const isComplete = missing.length === 0;
  const percentage = Math.round((completedCount / 6) * 100);

  return {
    isComplete,
    missingFields: missing,
    completedCount,
    totalCount: 6,
    percentage,
    details: {
      hasCnpj,
      hasName,
      hasTradeName,
      hasEmail,
      hasPhone,
      hasResponsible,
    },
  };
}

/**
 * Calcula o estado e a contagem regressiva do Trial da instituição.
 */
export function calculateTrialInfo(
  tenant: Tenant,
  subscription?: SaasSubscription | null
): TenantTrialInfo {
  const registration = evaluateInstitutionRegistration(tenant);

  // Verifica se o tenant ou a assinatura estão em regime de trial
  const isTrial =
    tenant.status === "trial" ||
    subscription?.status === "trial";

  // Determina a data de início real persistida
  const settings = (tenant.settings as Record<string, any>) || {};
  const rawStartDate =
    subscription?.trial_starts_at ||
    settings.converted_from_lead_at ||
    tenant.created_at ||
    new Date().toISOString();

  const startDateObj = new Date(rawStartDate);
  const startDate = startDateObj.toISOString();

  // Determina a data de término real do trial (14 dias)
  let endDateObj: Date;
  if (subscription?.trial_ends_at) {
    endDateObj = new Date(subscription.trial_ends_at);
  } else {
    // 14 dias exatos a partir da data de início
    endDateObj = new Date(startDateObj.getTime() + 14 * 24 * 60 * 60 * 1000);
  }
  const endDate = endDateObj.toISOString();

  // Formatação amigável para exibição brasileira (DD/MM/AAAA)
  const formattedEndDate = endDateObj.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const totalDays = 14;

  // Se a escola já é assinante ativa de um plano pago formalizado:
  if (!isTrial && tenant.status === "active" && subscription?.status === "active") {
    return {
      isTrial: false,
      isExpired: false,
      startDate,
      endDate,
      formattedEndDate,
      totalDays,
      daysRemaining: 0,
      daysElapsed: totalDays,
      urgencyLevel: "normal",
      registration,
    };
  }

  // Cálculo temporal preciso em milissegundos
  const now = new Date();
  const diffMs = endDateObj.getTime() - now.getTime();

  // Se a data atual ultrapassou o término do trial
  const isExpired =
    diffMs <= 0 ||
    tenant.status === "suspended" ||
    (tenant.status as string) === "canceled" ||
    subscription?.status === "suspended" ||
    subscription?.status === "canceled";

  // Dias restantes arredondados para cima (ex: 13.2 dias = 14 dias restantes para o usuário)
  let daysRemaining = isExpired
    ? 0
    : Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Se faltam menos de 24 horas mas ainda não expirou, daysRemaining é 1
  if (!isExpired && daysRemaining === 0 && diffMs > 0) {
    daysRemaining = 1;
  }

  const daysElapsed = Math.min(totalDays, Math.max(0, totalDays - daysRemaining));

  // Nível progressivo de urgência
  let urgencyLevel: TrialUrgencyLevel = "normal";
  if (isExpired || daysRemaining === 0) {
    urgencyLevel = "expired";
  } else if (daysRemaining === 1) {
    urgencyLevel = "warning_1_day"; // 1 dia: aviso de último dia
  } else if (daysRemaining <= 3) {
    urgencyLevel = "warning_3_days"; // 3 dias: aviso de atenção
  } else {
    urgencyLevel = "normal";
  }

  return {
    isTrial: true,
    isExpired,
    startDate,
    endDate,
    formattedEndDate,
    totalDays,
    daysRemaining,
    daysElapsed,
    urgencyLevel,
    registration,
  };
}
