import React, { Suspense } from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { redirect } from "next/navigation";
import {
  getAuthorizedClassesAction,
  getAcademicSettingsAction,
} from "@/app/actions/academico";
import { BoletimClient } from "@/components/academico/BoletimClient";
import { Loader2 } from "lucide-react";

export default async function BoletimPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // Busca as turmas autorizadas para o usuário logado e regras de notas
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
      <BoletimClient
        initialClasses={classesRes.schoolClasses || []}
        initialSettings={settingsRes.settings}
        userRole={session.role}
        userName={session.profile.full_name || "Gestor Escolar"}
      />
    </Suspense>
  );
}
