import React, { Suspense } from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { redirect } from "next/navigation";
import {
  getAuthorizedClassesAction,
  getAcademicSettingsAction,
} from "@/app/actions/academico";
import {
  getSchoolYearsAction,
  getAcademicTermsAction,
} from "@/app/actions/calendario";
import { AvaliacoesClient } from "@/components/academico/AvaliacoesClient";
import { Loader2 } from "lucide-react";

export default async function AvaliacoesPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // Busca turmas autorizadas, parâmetros de avaliação e dados do calendário escolar
  const [classesRes, settingsRes, schoolYearsRes, termsRes] = await Promise.all([
    getAuthorizedClassesAction(),
    getAcademicSettingsAction(),
    getSchoolYearsAction(),
    getAcademicTermsAction(),
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
        initialSchoolYears={schoolYearsRes.schoolYears || []}
        initialTerms={termsRes.academicTerms || []}
        userRole={session.role}
        userName={session.profile.full_name || "Gestor Escolar"}
      />
    </Suspense>
  );
}

