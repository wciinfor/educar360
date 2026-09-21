import React from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { redirect } from "next/navigation";
import {
  getInstitutionDataAction,
  getSchoolGatewayAction,
  getTenantPlanUsageAction,
  getTenantSaasInvoicesAction,
} from "@/app/actions/configuracoes";
import { GeralTabsClient } from "@/components/configuracoes/GeralTabsClient";

export default async function ConfiguracoesGeralPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // Carregamento paralelo seguro dos dados das 4 abas no lado do servidor
  const [instRes, gwRes, planRes, invRes] = await Promise.all([
    getInstitutionDataAction(),
    getSchoolGatewayAction(),
    getTenantPlanUsageAction(),
    getTenantSaasInvoicesAction(),
  ]);

  const institutionData = instRes.data || {
    id: session.tenant.id,
    name: session.tenant.name,
    trade_name: session.tenant.trade_name || session.tenant.name,
    slug: session.tenant.slug,
    cnpj: session.tenant.cnpj,
    email: session.tenant.email,
    phone: session.tenant.phone,
    status: session.tenant.status,
  };

  const gatewayData = gwRes.data || {
    tenant_id: session.tenant.id,
    provider: "asaas",
    environment: "sandbox",
    is_active: false,
    has_credentials: false,
  };

  const planUsageData = planRes.data || {
    plan: {
      id: "plan-profissional",
      name: "Profissional",
      code: "profissional",
      description: "Plano oficial",
      price_cents: 49900,
      billing_cycle: "monthly" as const,
      max_students: 500,
      is_active: true,
      features: [],
      created_at: "",
      updated_at: "",
    },
    active_students_count: 0,
    max_students: 500,
    usage_percentage: 0,
    subscription_status: "active",
    next_due_date: null,
    amount_cents: 49900,
    can_upgrade: true,
  };

  const invoicesData = invRes.data || [];

  return (
    <GeralTabsClient
      initialInstitution={institutionData}
      initialGateway={gatewayData}
      initialPlanUsage={planUsageData}
      initialInvoices={invoicesData}
      userRole={session.role}
    />
  );
}

