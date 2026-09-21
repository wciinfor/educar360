import React from "react";
import { getPlatformAdminSession } from "@/lib/platform/resolver";
import { redirect } from "next/navigation";
import { TenantsClient } from "./TenantsClient";

const INITIAL_TENANTS = [
  {
    id: "t-001-colegio-horizonte",
    name: "Colégio Horizonte Saber",
    trade_name: "Horizonte Saber Educação Básica",
    slug: "horizonte-saber",
    cnpj: "12.345.678/0001-90",
    email: "diretoria@horizontesaber.com.br",
    phone: "(11) 98765-4321",
    status: "active",
    plan_name: "Profissional",
    plan_code: "profissional",
    amount_cents: 49900,
    trial_ends_at: null,
    next_due_date: "2026-10-10",
    payment_status: "up_to_date",
    students_count: 320,
    first_admin_created: true,
    settings: { contact_name: "Ana Cláudia Valença" },
    created_at: "2026-08-01",
  },
  {
    id: "t-002-instituto-inovare",
    name: "Instituto Educacional Inovare",
    trade_name: "Inovare Ensino Fundamental",
    slug: "instituto-inovare",
    cnpj: "98.765.432/0001-12",
    email: "contato@inovareescola.com.br",
    phone: "(21) 99887-6655",
    status: "trial",
    plan_name: "Start",
    plan_code: "start",
    amount_cents: 19900,
    trial_ends_at: "2026-09-28",
    next_due_date: "2026-09-28",
    payment_status: "pending",
    students_count: 85,
    first_admin_created: false,
    settings: { contact_name: "Marcos Paulo Silva" },
    created_at: "2026-09-14",
  },
  {
    id: "t-003-escola-alvorada",
    name: "Escola e Colégio Alvorada",
    trade_name: "Alvorada Centro de Ensino",
    slug: "colegio-alvorada",
    cnpj: "45.123.789/0001-44",
    email: "financeiro@alvoradaescola.com.br",
    phone: "(31) 97654-3210",
    status: "suspended",
    plan_name: "Essencial",
    plan_code: "essencial",
    amount_cents: 29900,
    trial_ends_at: null,
    next_due_date: "2026-09-05",
    payment_status: "overdue",
    students_count: 180,
    first_admin_created: true,
    settings: { contact_name: "Roberto Silveira" },
    created_at: "2026-05-10",
  },
  {
    id: "t-004-complexo-vanguard",
    name: "Complexo Educacional Vanguard",
    trade_name: "Vanguard Rede de Ensino",
    slug: "vanguard-educacao",
    cnpj: "33.444.555/0001-66",
    email: "contato@vanguard.edu.br",
    phone: "(41) 98112-2334",
    status: "active",
    plan_name: "Enterprise",
    plan_code: "enterprise",
    amount_cents: 0,
    trial_ends_at: null,
    next_due_date: "2026-10-01",
    payment_status: "up_to_date",
    students_count: 890,
    first_admin_created: true,
    settings: { contact_name: "Prof. Fernando Albuquerque" },
    created_at: "2026-03-01",
  },
];

export default async function TenantsAdminPage() {
  const session = await getPlatformAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return <TenantsClient initialTenants={INITIAL_TENANTS} />;
}
