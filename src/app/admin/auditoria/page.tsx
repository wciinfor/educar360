import React from "react";
import { getPlatformAdminSession } from "@/lib/platform/resolver";
import { redirect } from "next/navigation";
import { Server } from "lucide-react";

export default async function Page() {
  const session = await getPlatformAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Auditoria Global da Plataforma</h1>
            <p className="text-sm text-zinc-500">Log consolidado de segurança, logins de administradores e ações críticas.</p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-zinc-50 border border-dashed border-zinc-300 rounded-xl text-center space-y-2">
          <p className="text-sm font-semibold text-zinc-700">Backoffice da Plataforma</p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Módulo centralizado para administração do SaaS Educar360. Acesso restrito a Super Administradores.
          </p>
        </div>
      </div>
    </div>
  );
}
