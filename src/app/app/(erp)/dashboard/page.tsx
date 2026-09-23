import React from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { getDashboardDataAction } from "@/app/actions/dashboard";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";

export default async function DashboardPage() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  const result = await getDashboardDataAction();

  if (!result.success || !result.data) {
    return (
      <div className="max-w-6xl mx-auto p-8 bg-white border border-rose-200 rounded-3xl text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Erro ao carregar o painel</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {result.error || "Não foi possível carregar as métricas da instituição no momento. Tente novamente recarregando a página."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <DashboardClient initialData={result.data} session={session} />
    </div>
  );
}
