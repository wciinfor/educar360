"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { canAccessModule, SchoolModule } from "@/lib/rbac/permissions";
import {
  LayoutDashboard,
  FileText,
  GraduationCap,
  UserPlus,
  DollarSign,
  MessageSquare,
  Globe,
  Settings,
  School,
} from "lucide-react";
import clsx from "clsx";

interface NavItem {
  name: string;
  href: string;
  module: SchoolModule;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Painel Geral", href: "/app/dashboard", icon: LayoutDashboard, module: "dashboard" },
  { name: "Secretaria", href: "/app/secretaria", icon: FileText, module: "secretaria" },
  { name: "Matrículas", href: "/app/matriculas", icon: UserPlus, module: "matriculas" },
  { name: "Acadêmico", href: "/app/academico", icon: GraduationCap, module: "academico" },
  { name: "Financeiro", href: "/app/financeiro", icon: DollarSign, module: "financeiro" },
  { name: "Comunicação", href: "/app/comunicacao", icon: MessageSquare, module: "comunicacao" },
  { name: "Portais", href: "/app/portais", icon: Globe, module: "portais" },
  { name: "Configurações", href: "/app/configuracoes", icon: Settings, module: "configuracoes" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { tenant, role } = useTenant();

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
          <School className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold tracking-wide text-white leading-tight truncate">
            Educar360
          </span>
          <span className="text-[11px] text-slate-400 truncate">
            {tenant?.name || "Instituição Escolar"}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Módulos de Gestão
        </div>

        {NAV_ITEMS.map((item) => {
          const isAllowed = canAccessModule(role, item.module);
          if (!isAllowed) return null;

          const isActive = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              )}
            >
              <Icon className={clsx("w-4 h-4 shrink-0", isActive ? "text-indigo-400" : "text-slate-400")} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Tenant Indicator Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <div className="text-[11px] text-slate-400 truncate flex-1">
            Tenant: <strong className="text-slate-200">{tenant?.slug || "isolado"}</strong>
          </div>
        </div>
      </div>
    </aside>
  );
}
