import React from "react";
import { getTenantSession } from "@/lib/tenant/resolver";
import { canAccessModule } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getStudentsAction, getGuardiansAction } from "@/app/actions/secretaria";
import { SecretariaDashboard } from "@/components/secretaria/SecretariaDashboard";

export default async function Page() {
  const session = await getTenantSession();

  if (!session) {
    redirect("/app/login");
  }

  // RBAC Guard
  if (!canAccessModule(session.role, "secretaria")) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Acesso Restrito ao Módulo</h2>
        <p className="text-sm text-slate-600">
          O seu perfil (<strong>{session.role}</strong>) não possui permissão para acessar o módulo <strong>Secretaria</strong> nesta instituição escolar.
        </p>
      </div>
    );
  }

  const [students, guardians] = await Promise.all([
    getStudentsAction({ status: "all" }),
    getGuardiansAction({ status: "all" }),
  ]);

  return (
    <div className="max-w-7xl mx-auto">
      <SecretariaDashboard
        initialStudents={students}
        initialGuardians={guardians}
        tenantName={session.tenant.name}
      />
    </div>
  );
}
