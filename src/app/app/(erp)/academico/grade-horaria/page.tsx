import React from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { redirect } from "next/navigation";
import { getTimetableDataAction } from "@/app/actions/grade-horaria";
import { GradeHorariaClient } from "@/components/academico/GradeHorariaClient";

export default async function GradeHorariaPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  const res = await getTimetableDataAction();

  if (!res.success || !res.store) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-3xl border border-rose-200">
        <p className="font-bold">Erro ao carregar a Grade Horária</p>
        <p className="text-xs text-rose-500 mt-1">{res.error || "Tente novamente mais tarde."}</p>
      </div>
    );
  }

  return (
    <GradeHorariaClient
      initialStore={res.store}
      initialRooms={res.rooms || []}
      userRole={session.role}
      schoolName={session.tenant.name}
    />
  );
}
