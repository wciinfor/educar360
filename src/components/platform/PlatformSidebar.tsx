"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Layers,
  History,
  ShieldAlert,
  Server,
  FileCheck2,
  UsersRound,
} from "lucide-react";
import clsx from "clsx";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Painel Geral", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Leads & Prospecção", href: "/admin/leads", icon: UsersRound },
  { name: "Gestão de Escolas", href: "/admin/tenants", icon: Building2 },
  { name: "Planos SaaS", href: "/admin/planos", icon: Layers },
  { name: "Assinaturas & Trials", href: "/admin/assinaturas", icon: FileCheck2 },
  { name: "Faturamento & ASAAS", href: "/admin/financeiro", icon: CreditCard },
  { name: "Auditoria Global", href: "/admin/auditoria", icon: History },
];

interface PlatformSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function PlatformSidebar({ mobileOpen = false, onClose }: PlatformSidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-600/30 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold tracking-wide text-white leading-tight truncate">
              Educar360 Cloud
            </span>
            <span className="text-[11px] text-emerald-400 font-mono truncate">
              admin.educar360.com.br
            </span>
          </div>
        </div>

        {/* Botão de fechar no mobile */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Fechar menu"
          >
            <span className="text-lg leading-none font-bold">✕</span>
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          Administração Central
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => {
                if (onClose) onClose();
              }}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                  : "text-zinc-300 hover:bg-zinc-800/60 hover:text-white"
              )}
            >
              <Icon className={clsx("w-4 h-4 shrink-0", isActive ? "text-emerald-400" : "text-zinc-400")} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Gateway Indicator Footer */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/30">
        <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Gateway Plataforma:</span>
            <strong className="text-emerald-400 font-mono">ASAAS</strong>
          </div>
          <div className="text-[10px] text-zinc-500">
            Faturamento central isolado
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar fixo para Desktop (lg+) */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-zinc-800 h-full">
        {sidebarContent}
      </aside>

      {/* Drawer Mobile (< lg) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop escuro com blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          {/* Painel do Sidebar Deslizante */}
          <aside className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 flex flex-col border-r border-zinc-800">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
