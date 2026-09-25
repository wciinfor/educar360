import React, { Suspense } from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { redirect } from "next/navigation";
import { getAuthorizedClassesAction } from "@/app/actions/academico";
import { getSchoolYearsAction, getAcademicTermsAction } from "@/app/actions/calendario";
import { FrequenciaClient } from "@/components/academico/FrequenciaClient";
import { Loader2 } from "lucide-react";

export default async function FrequenciaPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // Busca as turmas autorizadas, anos letivos e períodos acadêmicos em paralelo
  const [classesRes, schoolYearsRes, termsRes] = await Promise.all([
    getAuthorizedClassesAction(),
    getSchoolYearsAction(),
    getAcademicTermsAction(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <FrequenciaClient
        initialClasses={classesRes.schoolClasses || []}
        initialSchoolYears={schoolYearsRes.schoolYears || []}
        initialTerms={termsRes.academicTerms || []}
        userRole={session.role}
        userName={session.profile.full_name || "Gestor Escolar"}
      />
    </Suspense>
  );
}
