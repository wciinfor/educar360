import React from "react";
import { redirect } from "next/navigation";
import { getTenantSession } from "@/lib/tenant/resolver";
import { getInstitutionDataAction } from "@/app/actions/configuracoes";
import { TrialExpiradoClient } from "@/components/trial/TrialExpiradoClient";

export const metadata = {
  title: "Período de Teste Expirado | Educar360",
};

export default async function TrialExpiradoPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // Se o período de trial ainda for válido ou se a escola já possui plano pago ativo, redireciona para o ERP
  if (!session.trialInfo?.isExpired) {
    redirect("/app/dashboard");
  }

  const instRes = await getInstitutionDataAction();
  const initialInstitution = instRes.data || {
    id: session.tenant.id,
    name: session.tenant.name,
    trade_name: session.tenant.trade_name || session.tenant.name,
    slug: session.tenant.slug,
    cnpj: session.tenant.cnpj,
    email: session.tenant.email,
    phone: session.tenant.phone,
    status: session.tenant.status,
    responsible_name: session.tenant.settings?.responsible_name || session.tenant.settings?.contact_name || null,
  };

  return (
    <TrialExpiradoClient
      tenant={session.tenant}
      profile={session.profile}
      trialInfo={session.trialInfo}
      initialInstitution={initialInstitution}
      userRole={session.role}
      userTenants={session.allUserTenants}
    />
  );
}
