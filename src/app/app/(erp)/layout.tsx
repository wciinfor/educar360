import React from "react";
import { redirect } from "next/navigation";
import { getTenantSession } from "@/lib/tenant/resolver";
import { TenantProvider } from "@/contexts/TenantContext";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";

export default async function TenantErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getTenantSession();

  // Caso o usuário não possua sessão autenticada ou não tenha tenant ativo
  if (!session) {
    redirect("/app/login");
  }

  return (
    <TenantProvider
      initialTenant={session.tenant}
      initialTenantUser={session.tenantUser}
      initialProfile={session.profile}
      initialRole={session.role}
      initialUserTenants={session.allUserTenants}
    >
      <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {children}
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}
