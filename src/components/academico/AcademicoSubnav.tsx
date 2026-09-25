"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarCheck, Layers, Award, FileSpreadsheet, GraduationCap } from "lucide-react";
import clsx from "clsx";

interface NavTab {
  name: string;
  href: string;
  description: string;
  icon: React.ElementType;
}

const ACADEMICO_TABS: NavTab[] = [
  {
    name: "Estrutura Acadêmica",
    href: "/app/academico/estrutura",
    description: "Cursos, séries e turmas",
    icon: Layers,
  },
  {
    name: "Calendário Escolar",
    href: "/app/academico/calendario",
    description: "Anos letivos, etapas e períodos acadêmicos",
    icon: CalendarCheck,
  },
  {
    name: "Diário de Classe",
    href: "/app/academico/diario",
    description: "Registro de aulas e conteúdos ministrados",
    icon: BookOpen,
  },
  {
    name: "Frequência",
    href: "/app/academico/frequencia",
    description: "Lançamento de chamadas e relatórios consolidados",
    icon: CalendarCheck,
  },
  {
    name: "Avaliações e Notas",
    href: "/app/academico/avaliacoes",
    description: "Instrumentos avaliativos e lançamento de notas",
    icon: Award,
  },
  {
    name: "Boletim Escolar",
    href: "/app/academico/boletim",
    description: "Boletins de notas, médias e situação dos alunos",
    icon: FileSpreadsheet,
  },
  {
    name: "Histórico Escolar",
    href: "/app/academico/historico",
    description: "Histórico consolidado, anos cursados e certificação",
    icon: GraduationCap,
  },
];

export function AcademicoSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 border-b border-slate-200 pb-px mb-6 overflow-x-auto select-none">
      {ACADEMICO_TABS.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href === "/app/academico/estrutura" && pathname === "/app/academico");
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
                "w-4 h-4",
                isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
              )}
            />
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
