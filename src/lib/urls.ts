/**
 * Configuração centralizada de domínios e URLs públicas do Educar360.
 * Suporta tanto o ambiente de desenvolvimento local quanto produção na Vercel.
 */

export const DOMAINS = {
  LANDING: process.env.NEXT_PUBLIC_LANDING_DOMAIN || "www.educar360.com.br",
  APP: process.env.NEXT_PUBLIC_APP_DOMAIN || "app.educar360.com.br",
  ADMIN: process.env.NEXT_PUBLIC_ADMIN_DOMAIN || "admin.educar360.com.br",
};

/**
 * Obtém a URL base pública correspondente a cada ambiente.
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://app.educar360.com.br";
}

export function getLandingBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_LANDING_URL) {
    return process.env.NEXT_PUBLIC_LANDING_URL.replace(/\/$/, "");
  }
  return "https://www.educar360.com.br";
}

export function getAdminBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_ADMIN_URL) {
    return process.env.NEXT_PUBLIC_ADMIN_URL.replace(/\/$/, "");
  }
  return "https://admin.educar360.com.br";
}

/**
 * Gera URL segura de ativação de convite escolar
 */
export function getActivationUrl(token: string, email: string): string {
  const base = getAppBaseUrl();
  return `${base}/ativar?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}
