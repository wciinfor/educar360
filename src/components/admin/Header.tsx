"use client";

import React, { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { ROLE_DEFINITIONS } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  LogOut,
  User,
  ShieldCheck,
  Check,
} from "lucide-react";

export function Header() {
  const { tenant, role, profile, userTenants, switchTenant } = useTenant();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/app/login");
    router.refresh();
  };

  const roleConfig = role ? ROLE_DEFINITIONS[role] : null;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Tenant Switcher / School Identifier */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700"
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <div className="text-left">
            <span className="text-xs font-semibold block leading-tight text-slate-900">
              {tenant?.name || "Carregando Escola..."}
            </span>
            <span className="text-[10px] text-slate-500 block">
              CNPJ: {tenant?.cnpj || "Não informado"}
            </span>
          </div>
          {userTenants.length > 1 && <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {tenantDropdownOpen && userTenants.length > 1 && (
          <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-30">
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Alternar Instituição
            </div>
            {userTenants.map((item) => (
              <button
                key={item.tenant.id}
                onClick={() => {
                  setTenantDropdownOpen(false);
                  if (item.tenant.id !== tenant?.id) {
                    switchTenant(item.tenant.id);
                  }
                }}
                className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 text-xs text-slate-700 transition-colors"
              >
                <div>
                  <div className="font-medium text-slate-900">{item.tenant.name}</div>
                  <div className="text-[10px] text-slate-500">{item.role}</div>
                </div>
                {item.tenant.id === tenant?.id && (
                  <Check className="w-4 h-4 text-indigo-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User profile & Actions */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-700"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-semibold text-xs">
              {profile?.full_name ? profile.full_name[0].toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {profile?.full_name || "Usuário"}
              </div>
              <div className="text-[11px] text-indigo-600 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3 h-3" />
                {roleConfig?.label || "Colaborador"}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30">
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-900">{profile?.full_name}</div>
                <div className="text-[11px] text-slate-500 truncate">{profile?.email}</div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair do Sistema
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
