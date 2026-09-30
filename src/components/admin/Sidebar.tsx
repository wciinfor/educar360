"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { canAccessModule, SchoolModule, ROLE_DEFINITIONS } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/client";
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
  ChevronRight,
  ChevronLeft,
  Clock,
  LogOut,
  X,
  ShieldCheck,
} from "lucide-react";
import clsx from "clsx";

interface NavItem {
  name: string;
  href: string;
  module: SchoolModule;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Painel Geral",
    href: "/app/dashboard",
    icon: LayoutDashboard,
    module: "dashboard",
  },
  {
    name: "Secretaria",
    href: "/app/secretaria",
    icon: FileText,
    module: "secretaria",
  },
  {
    name: "Matrículas",
    href: "/app/matriculas",
    icon: UserPlus,
    module: "matriculas",
  },
  {
    name: "Acadêmico",
    href: "/app/academico",
    icon: GraduationCap,
    module: "academico",
  },
  {
    name: "Financeiro",
    href: "/app/financeiro",
    icon: DollarSign,
    module: "financeiro",
  },
  {
    name: "Comunicação",
    href: "/app/comunicacao",
    icon: MessageSquare,
    module: "comunicacao",
  },
  {
    name: "Portais",
    href: "/app/portais",
    icon: Globe,
    module: "portais",
  },
  {
    name: "Configurações",
    href: "/app/configuracoes",
    icon: Settings,
    module: "configuracoes",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { tenant, role, profile, trialInfo } = useTenant();
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobile } = useSidebar();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/app/login");
    router.refresh();
  };

  const roleConfig = role ? ROLE_DEFINITIONS[role] : null;

  // Formatação de data do trial
  const trialEndDate = trialInfo?.formattedEndDate || (trialInfo?.endDate
    ? new Date(trialInfo.endDate).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null);

  // Conteúdo unificado do Sidebar para Desktop e Mobile Drawer
  const renderSidebarContent = (collapsed: boolean, isDrawer = false) => {
    return (
      <div className="flex flex-col h-full select-none justify-between">
        {/* Top Header & Brand */}
        <div>
          <div
            className={clsx(
              "h-18 relative flex items-center border-b border-slate-800/80 bg-[#0B1120]/60 backdrop-blur-xs transition-all px-4 justify-center"
            )}
          >
            <Link
              href="/app/dashboard"
              className="flex items-center justify-center group focus:outline-none py-1.5"
            >
              {collapsed ? (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0 group-hover:scale-105 transition-transform">
                  <School className="w-5 h-5 text-white" />
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/images/landing/logoh_escuro.png"
                  alt="Educar360"
                  className="h-11 w-auto max-w-[185px] object-contain group-hover:scale-102 transition-transform"
                />
              )}
            </Link>

            {/* Collapse / Close Button */}
            {isDrawer ? (
              <button
                type="button"
                onClick={closeMobile}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              !collapsed && (
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                  title="Recolher menu"
                  aria-label="Recolher menu"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )
            )}
          </div>

          {/* Desktop Toggle Expand Button when collapsed */}
          {!isDrawer && collapsed && (
            <div className="flex justify-center py-2 border-b border-slate-800/80">
              <button
                type="button"
                onClick={toggleCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                title="Expandir menu"
                aria-label="Expandir menu"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* User Profile Block */}
          <div
            className={clsx(
              "border-b border-slate-800/80 bg-slate-950/40 py-3",
              collapsed ? "px-2 flex justify-center" : "px-4"
            )}
          >
            {collapsed ? (
              <div className="relative group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                  {profile?.full_name ? profile.full_name[0].toUpperCase() : "U"}
                </div>
                {/* Online Dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0B1120]" />

                {/* Floating Tooltip */}
                <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white shadow-xl z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                  <div className="font-semibold text-slate-100">{profile?.full_name || "Usuário"}</div>
                  <div className="text-[10px] text-indigo-400">{roleConfig?.label || "Colaborador"}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                    {profile?.full_name ? profile.full_name[0].toUpperCase() : "U"}
                  </div>
                  {/* Online Dot */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0B1120]" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-white leading-tight truncate">
                    {profile?.full_name || "Usuário Conectado"}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="text-[11px] font-medium text-slate-400 truncate">
                      {roleConfig?.label || "Colaborador"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links List */}
          <nav className="py-3 px-2 space-y-1 overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-thin scrollbar-thumb-slate-800">
            {!collapsed && (
              <div className="px-3 pb-2 pt-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Módulos de Gestão
              </div>
            )}

            {NAV_ITEMS.map((item) => {
              const isAllowed = canAccessModule(role, item.module);
              if (!isAllowed) return null;

              const isCurrentModule =
                pathname === item.href ||
                (item.href !== "/app" && pathname.startsWith(item.href));
              const Icon = item.icon;

              if (collapsed) {
                // Collapsed Item with floating tooltip
                return (
                  <div key={item.name} className="relative group flex justify-center">
                    <Link
                      href={item.href}
                      className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150",
                        isCurrentModule
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </Link>

                    {/* Floating Tooltip */}
                    <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-white shadow-xl z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                      {item.name}
                    </div>
                  </div>
                );
              }

              // Expanded Item
              return (
                <div key={item.name} className="space-y-0.5">
                  <Link
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group",
                      isCurrentModule
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/25 border border-indigo-500/30"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "w-4 h-4 shrink-0 transition-colors",
                        isCurrentModule ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer with Trial Card, Tenant Info & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2.5">
          {/* Trial Real Status Block */}
          {trialInfo?.isTrial && (
            <div>
              {collapsed ? (
                <div className="relative group flex justify-center">
                  <div
                    className={clsx(
                      "w-10 h-10 rounded-xl flex flex-col items-center justify-center border text-[10px] font-bold",
                      trialInfo.urgencyLevel === "warning_1_day"
                        ? "bg-rose-950/60 border-rose-600/50 text-rose-300"
                        : trialInfo.urgencyLevel === "warning_3_days"
                        ? "bg-amber-950/60 border-amber-600/50 text-amber-300"
                        : "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                    )}
                  >
                    <Clock className="w-3.5 h-3.5 mb-0.5" />
                    <span>{trialInfo.daysRemaining}d</span>
                  </div>

                  {/* Floating Tooltip for Trial */}
                  <div className="absolute left-full ml-3.5 bottom-0 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white shadow-xl z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                    <div className="font-semibold text-emerald-400">Teste Gratuito</div>
                    <div className="text-[11px] text-slate-300">
                      {trialInfo.daysRemaining} dias restantes {trialEndDate ? `(até ${trialEndDate})` : ""}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={clsx(
                    "p-2.5 rounded-xl border transition-all text-xs",
                    trialInfo.urgencyLevel === "warning_1_day"
                      ? "bg-rose-950/50 border-rose-800/70 text-rose-200"
                      : trialInfo.urgencyLevel === "warning_3_days"
                      ? "bg-amber-950/50 border-amber-800/70 text-amber-200"
                      : "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Teste Gratuito</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-500/30 font-bold text-emerald-300">
                      {trialInfo.daysRemaining} {trialInfo.daysRemaining === 1 ? "dia" : "dias"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>{trialEndDate ? `Vence em ${trialEndDate}` : "14 dias de teste"}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-800/80 rounded-full h-1 mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(0, Math.min(100, ((14 - trialInfo.daysRemaining) / 14) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logout Button */}
          {collapsed ? (
            <div className="relative group flex justify-center">
              <button
                type="button"
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-400 hover:text-white hover:bg-rose-950/60 border border-rose-900/30 transition-colors"
                aria-label="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <div className="absolute left-full ml-3.5 bottom-0 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-rose-400 shadow-xl z-50 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                Sair do sistema
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-950/50 border border-rose-900/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Sair da conta</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        style={{
          backgroundImage: "url('/images/landing/bg_menu.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        className={clsx(
          "hidden lg:flex flex-col shrink-0 bg-[#0B1120] text-slate-100 border-r border-slate-800/80 transition-all duration-300 ease-in-out relative overflow-hidden",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {renderSidebarContent(isCollapsed, false)}
      </aside>

      {/* Mobile Drawer Backdrop & Panel */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
            onClick={closeMobile}
          />

          {/* Drawer Panel */}
          <aside
            style={{
              backgroundImage: "url('/images/landing/bg_menu.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
            className="relative w-72 max-w-[85vw] bg-[#0B1120] text-slate-100 h-full shadow-2xl flex flex-col z-10 border-r border-slate-800 animate-in slide-in-from-left duration-200 overflow-hidden"
          >
            {renderSidebarContent(false, true)}
          </aside>
        </div>
      )}
    </>
  );
}
