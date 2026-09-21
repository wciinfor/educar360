import React from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { redirect } from "next/navigation";
import { getIdCardTemplateAction } from "@/app/actions/configuracoes";
import { IdCardEditorClient } from "@/components/configuracoes/IdCardEditorClient";
import { DEFAULT_ID_CARD_TEMPLATE } from "@/types/configuracoes";

export default async function ConfiguracoesCarteirinhaPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  const { tenant, role } = session;
  const canEdit = role === "admin_escola" || role === "secretaria";

  const templateResult = await getIdCardTemplateAction();

  const initialTemplate =
    templateResult.success && templateResult.data
      ? templateResult.data.template
      : {
          ...DEFAULT_ID_CARD_TEMPLATE,
          school_name_override: tenant.name,
        };

  const institutionInfo =
    templateResult.success && templateResult.data
      ? templateResult.data.institution
      : {
          name: tenant.name,
          tradeName: null,
          cnpj: null,
          phone: null,
          logoUrl: null,
          address: null,
        };

  return (
    <div className="space-y-6">
      <IdCardEditorClient
        initialTemplate={initialTemplate}
        institution={institutionInfo}
        canEdit={canEdit}
      />
    </div>
  );
}

