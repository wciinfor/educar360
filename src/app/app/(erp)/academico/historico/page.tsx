import React, { Suspense } from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { redirect } from "next/navigation";
import { searchStudentsForHistoryAction } from "@/app/actions/academico";
import { HistoricoClient } from "@/components/academico/HistoricoClient";
import { Loader2 } from "lucide-react";

export default async function HistoricoPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // Busca lista inicial de alunos
  const studentsRes = await searchStudentsForHistoryAction();

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <HistoricoClient
        initialStudents={studentsRes.students || []}
        userRole={session.role}
        userName={session.profile.full_name || "Gestor Escolar"}
      />
    </Suspense>
  );
}
