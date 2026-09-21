"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sliders, Users, CreditCard } from "lucide-react";
import clsx from "clsx";

interface NavTab {
  name: string;
  href: string;
  description: string;
  icon: React.ElementType;
}

const CONFIG_TABS: NavTab[] = [
  {
    name: "Geral",
    href: "/app/configuracoes/geral",
    description: "Dados institucionais, gateways, planos e faturas",
    icon: Sliders,
  },
  {
    name: "Usuários",
    href: "/app/configuracoes/usuarios",
    description: "Gestão de equipe e perfis de acesso",
    icon: Users,
  },
  {
    name: "Carteirinha",
    href: "/app/configuracoes/carteirinha",
    description: "Editor visual do cartão de identificação",
    icon: CreditCard,
  },
];

export function ConfigSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 border-b border-slate-200 pb-px mb-6 overflow-x-auto select-none">
      {CONFIG_TABS.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href === "/app/configuracoes/geral" && pathname === "/app/configuracoes");
        const Icon = tab.icon;

        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2",
              isActive
                ? "border-indigo-600 text-indigo-700 bg-white shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60"
            )}
          >
            <Icon
              className={clsx(
                "w-4 h-4 shrink-0",
                isActive ? "text-indigo-600" : "text-slate-400"
              )}
            />
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
