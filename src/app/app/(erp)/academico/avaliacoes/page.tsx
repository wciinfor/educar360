import React, { Suspense } from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { redirect } from "next/navigation";
import {
  getAuthorizedClassesAction,
  getAcademicSettingsAction,
} from "@/app/actions/academico";
import { AvaliacoesClient } from "@/components/academico/AvaliacoesClient";
import { Loader2 } from "lucide-react";

export default async function AvaliacoesPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // Busca turmas autorizadas e parâmetros de avaliação da escola
  const [classesRes, settingsRes] = await Promise.all([
    getAuthorizedClassesAction(),
    getAcademicSettingsAction(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <AvaliacoesClient
        initialClasses={classesRes.schoolClasses || []}
        initialSettings={settingsRes.settings}
        userRole={session.role}
        userName={session.profile.full_name || "Gestor Escolar"}
      />
    </Suspense>
  );
}
