import React, { Suspense } from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { redirect } from "next/navigation";
import { getAuthorizedClassesAction } from "@/app/actions/academico";
import { getSchoolYearsAction, getAcademicTermsAction } from "@/app/actions/calendario";
import { DiarioClient } from "@/components/academico/DiarioClient";
import { Loader2 } from "lucide-react";

export default async function DiarioPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // Busca turmas autorizadas, anos letivos e períodos acadêmicos em paralelo
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
      <DiarioClient
        initialClasses={classesRes.schoolClasses || []}
        initialTerms={termsRes.academicTerms || []}
        initialSchoolYears={schoolYearsRes.schoolYears || []}
        userRole={session.role}
        userName={session.profile.full_name || "Gestor Escolar"}
      />
    </Suspense>
  );
}
