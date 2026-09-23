"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DashboardData } from "@/types/dashboard";
import { AuthenticatedTenantSession } from "@/types/tenant";
import {
  GraduationCap,
  FileText,
  Users,
  LayoutGrid,
  Calendar,
  ChevronDown,
  UserPlus,
  UserCheck,
  Printer,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Shield,
  Layers,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import clsx from "clsx";

interface DashboardClientProps {
  initialData: DashboardData;
  session: AuthenticatedTenantSession;
}

export function DashboardClient({ initialData, session }: DashboardClientProps) {
  const [data] = useState<DashboardData>(initialData);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [activeTabTip, setActiveTabTip] = useState(0);

  const tips = [
    {
      title: "Dica do Educar360",
      content: "Mantenha os dados de contato e responsáveis sempre atualizados para agilizar a emissão de declarações e cobranças.",
    },
    {
      title: "Relatórios de Matrícula",
      content: "Você pode gerar relatórios em PDF timbrados com o logo da escola no menu Matrículas > Relatórios.",
    },
    {
      title: "Gestão Acadêmica",
      content: "Configure as séries e turmas no módulo Acadêmico para organizar as enturmações automáticas.",
    },
  ];

  const {
    summary,
    planUsage,
    enrollmentEvolution,
    courseDistribution,
    statusBreakdown,
    recentEnrollments,
    academicCalendarInfo,
    authorizedModules,
  } = data;

  const canAccessMatriculas = authorizedModules.includes("matriculas");
  const canAccessSecretaria = authorizedModules.includes("secretaria");
  const canAccessAcademico = authorizedModules.includes("academico");
  const canAccessComunicacao = authorizedModules.includes("comunicacao");
  const canAccessConfiguracoes = authorizedModules.includes("configuracoes");

  // Cálculo para o Donut Chart de Etapas de Ensino
  const totalCourseStudents = courseDistribution.reduce((acc, c) => acc + c.count, 0);
  let cumulativeAngle = 0;
  const donutSegments = courseDistribution.map((course) => {
    const angle = totalCourseStudents > 0 ? (course.count / totalCourseStudents) * 360 : 0;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return {
      ...course,
      startAngle,
      angle,
    };
  });

  // Cálculo da altura máxima para o gráfico de barras
  const maxMonthlyCount = Math.max(
    ...enrollmentEvolution.map((m) => Math.max(m.enrollments, m.newStudents)),
    5
  );

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. HEADER INSTITUCIONAL & SAUDAÇÃO PERSONALIZADA */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Olá, {session.profile.full_name || "Gestor Escolar"}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Aqui está o panorama do <strong className="text-slate-800 font-bold">{session.tenant.name}</strong>. Tenha uma visão completa da sua instituição.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                {academicCalendarInfo.todayFormatted}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Ano Letivo {academicCalendarInfo.academicYear}
              </div>
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-xs"
            >
              <option value="all">Todos os períodos</option>
              <option value="current_year">Ano letivo {academicCalendarInfo.academicYear}</option>
              <option value="recent">Últimos 30 dias</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP 4 METRIC CARDS (INDICADORES PRINCIPAIS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total de Alunos */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <TrendingUp className="w-3 h-3" />
              <span>{summary.activeStudents} ativos</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total de Alunos
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {summary.totalStudents}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {summary.activeStudents === summary.totalStudents
                ? "Todos com matrícula regular"
                : `${summary.totalStudents - summary.activeStudents} inativos ou pendentes`}
            </p>
          </div>

          {/* Mini Sparkline SVG visual decorativo */}
          <div className="absolute right-3 bottom-3 opacity-20 pointer-events-none">
            <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
              <path d="M0 25 C15 20, 25 10, 40 18 C50 12, 55 5, 60 2" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: Matrículas Ativas */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <TrendingUp className="w-3 h-3" />
              <span>
                {summary.totalEnrollments > 0
                  ? `${Math.round((summary.activeEnrollments / summary.totalEnrollments) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Matrículas Ativas
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {summary.activeEnrollments}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {summary.totalEnrollments} registro(s) no total
            </p>
          </div>

          <div className="absolute right-3 bottom-3 opacity-20 pointer-events-none">
            <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
              <path d="M0 20 C10 15, 20 28, 35 12 C45 8, 52 4, 60 2" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 3: Corpo Docente */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
              <span>{summary.staffCount} equipe</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Corpo Docente
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {summary.teachersCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              professores e educadores
            </p>
          </div>

          <div className="absolute right-3 bottom-3 opacity-20 pointer-events-none">
            <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
              <path d="M0 15 C15 25, 30 5, 45 20 C52 10, 58 5, 60 3" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 4: Turmas Ativas */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
              <span>{summary.coursesCount} curso(s)</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Turmas Ativas
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {summary.classesCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              no ano letivo atual
            </p>
          </div>

          <div className="absolute right-3 bottom-3 opacity-20 pointer-events-none">
            <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
              <path d="M0 10 C15 15, 30 25, 45 8 C52 14, 58 6, 60 2" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SEÇÃO DE GRÁFICOS (EVOLUÇÃO, ETAPAS & OCUPAÇÃO) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Gráfico 1: Evolução de Matrículas (Lg: col-span-5) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Evolução de Matrículas
                </h3>
                <p className="text-xs text-slate-400">Distribuição mensal do ano letivo</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                  <span>Matrículas</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-300"></div>
                  <span>Alunos</span>
                </div>
              </div>
            </div>

            {/* Bar Chart Canvas */}
            <div className="h-56 pt-6 flex items-end justify-between gap-1 sm:gap-2 border-b border-slate-100 pb-2">
              {enrollmentEvolution.map((item) => {
                const heightEnrollments = (item.enrollments / maxMonthlyCount) * 100;
                const heightStudents = (item.newStudents / maxMonthlyCount) * 100;

                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip no Hover */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap shadow-md">
                      {item.fullMonth}: {item.enrollments} mat. / {item.newStudents} al.
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5 h-44">
                      {/* Barra 1: Matrículas */}
                      <div
                        style={{ height: `${Math.max(item.enrollments > 0 ? heightEnrollments : 4, 4)}%` }}
                        className={clsx(
                          "w-2.5 sm:w-3.5 rounded-t-md transition-all duration-500",
                          item.enrollments > 0
                            ? "bg-blue-600 group-hover:bg-blue-700"
                            : "bg-slate-100"
                        )}
                      />
                      {/* Barra 2: Alunos */}
                      <div
                        style={{ height: `${Math.max(item.newStudents > 0 ? heightStudents : 4, 4)}%` }}
                        className={clsx(
                          "w-2.5 sm:w-3.5 rounded-t-md transition-all duration-500",
                          item.newStudents > 0
                            ? "bg-indigo-300 group-hover:bg-indigo-400"
                            : "bg-slate-100"
                        )}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3">
            <span>Ano Letivo {academicCalendarInfo.academicYear}</span>
            <span>Total: {summary.totalEnrollments} matrículas registradas</span>
          </div>
        </div>

        {/* Gráfico 2: Distribuição por Etapa de Ensino (Donut Chart - Lg: col-span-4) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Distribuição por Etapa de Ensino
              </h3>
              <p className="text-xs text-slate-400">Alunos por segmento educacional</p>
            </div>

            {courseDistribution.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-4">
                <Layers className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">Nenhum segmento configurado</p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                  Cadastre os cursos no módulo Acadêmico para visualizar a distribuição.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                {/* SVG Donut */}
                <div className="relative w-36 h-36 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="18" fill="none" />
                    {donutSegments.map((segment) => {
                      const circumference = 2 * Math.PI * 38; // ~238.76
                      const strokeDasharray = `${(segment.angle / 360) * circumference} ${circumference}`;
                      const strokeDashoffset = -((segment.startAngle / 360) * circumference);

                      return (
                        <circle
                          key={segment.courseId}
                          cx="50"
                          cy="50"
                          r="38"
                          stroke={segment.color}
                          strokeWidth="18"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          fill="none"
                          className="transition-all duration-700 hover:opacity-80"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-extrabold text-slate-900 leading-none">
                      {summary.totalStudents}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">alunos</span>
                  </div>
                </div>

                {/* Legenda Lateral */}
                <div className="space-y-2 text-xs flex-1 w-full">
                  {courseDistribution.map((course) => (
                    <div key={course.courseId} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                        <span className="text-slate-700 font-medium truncate text-xs">
                          {course.courseName}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900">{course.count}</span>
                        <span className="text-slate-400 text-[10px] ml-1">({course.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>{courseDistribution.length} segmento(s) ativo(s)</span>
            {canAccessAcademico && (
              <Link href="/app/academico" className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1">
                <span>Gerenciar</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Gráfico 3: Taxa de Ocupação & Plano (Lg: col-span-3) */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Taxa de Ocupação</h3>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Zap className="w-3 h-3 text-indigo-600" />
                <span>{planUsage.planName}</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
              {/* Circular Gauge */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${(planUsage.occupancyPercentage / 100) * (2 * Math.PI * 40)} ${2 * Math.PI * 40}`}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-extrabold text-slate-900 leading-none">
                    {planUsage.occupancyPercentage}%
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">capacidade</span>
                </div>
              </div>

              <div className="text-center mt-3 space-y-0.5">
                <div className="text-xs font-bold text-slate-800">
                  {planUsage.activeStudents} de {planUsage.maxStudents || "∞"} alunos
                </div>
                <div className="text-[11px] text-slate-500">
                  {planUsage.availableSlots !== null
                    ? `${planUsage.availableSlots} vagas restantes`
                    : "Vagas ilimitadas no Enterprise"}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs mt-2">
            <div>
              <div className="text-[10px] text-slate-400">Assinatura</div>
              <div className="font-bold text-slate-800">{planUsage.monthlyPriceFormatted}/mês</div>
            </div>
            {canAccessConfiguracoes && (
              <Link
                href="/app/configuracoes"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] transition-colors shadow-xs"
              >
                Gerenciar
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SEÇÃO INFERIOR: STATUS, RECENTES & AÇÕES RÁPIDAS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Coluna 1: Matrículas por Situação (Lg: col-span-4) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="mb-5">
              <h3 className="text-base font-bold text-slate-900">
                Matrículas por Situação
              </h3>
              <p className="text-xs text-slate-400">Acompanhamento do funil de matrículas</p>
            </div>

            <div className="space-y-4">
              {statusBreakdown.map((item) => (
                <div key={item.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.count}</span>
                      <span className="text-[11px] text-slate-400 w-8 text-right">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${item.percentage}%` }}
                      className={clsx("h-full rounded-full transition-all duration-500", item.barColorClass)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Total: {summary.totalEnrollments} matrículas</span>
            {canAccessMatriculas && (
              <Link href="/app/matriculas" className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1">
                <span>Ver todas</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Coluna 2: Últimas Matrículas (Feed Recente - Lg: col-span-5) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Últimas Matrículas
                </h3>
                <p className="text-xs text-slate-400">Cadastros mais recentes na instituição</p>
              </div>
              {canAccessMatriculas && (
                <Link
                  href="/app/matriculas"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                >
                  <span>Ver todas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {recentEnrollments.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-700">Nenhuma matrícula registrada</div>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Inicie o ano letivo cadastrando a primeira matrícula da escola.
                </p>
                {canAccessMatriculas && (
                  <Link
                    href="/app/matriculas"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Realizar Matrícula</span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentEnrollments.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 -mx-2 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {item.studentInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {item.studentName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                          <span>{item.seriesName || item.courseName}</span>
                          {item.shift && (
                            <>
                              <span>&bull;</span>
                              <span>{item.shift}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <span className={clsx("inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border", item.statusBgClass)}>
                        {item.statusLabel}
                      </span>
                      <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{item.relativeTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Exibindo últimas {recentEnrollments.length} matrículas</span>
            <span className="font-mono text-[10px]">{session.tenant.slug}</span>
          </div>
        </div>

        {/* Coluna 3: Ações Rápidas & Calendário (Lg: col-span-3) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Card Ações Rápidas */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Ações Rápidas</h3>
            <div className="grid grid-cols-1 gap-2">
              {canAccessMatriculas && (
                <Link
                  href="/app/matriculas"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    <span>Nova Matrícula</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}

              {canAccessSecretaria && (
                <Link
                  href="/app/secretaria"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-500" />
                    <span>Cadastrar Aluno</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              )}

              {canAccessMatriculas && (
                <Link
                  href="/app/matriculas/relatorios"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-slate-500" />
                    <span>Emitir Relatórios</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              )}

              {canAccessComunicacao && (
                <Link
                  href="/app/comunicacao"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-500" />
                    <span>Enviar Comunicado</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              )}
            </div>
          </div>

          {/* Card Calendário Acadêmico */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Calendário Acadêmico</h3>
              <span className="text-[10px] text-slate-400 font-medium">Bimestre ativo</span>
            </div>

            <div className="space-y-2.5">
              {academicCalendarInfo.events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 text-xs">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-center flex flex-col items-center justify-center shrink-0">
                    <span className="font-extrabold text-slate-900 text-xs leading-none">{ev.dateBadge.day}</span>
                    <span className="text-[9px] font-bold text-indigo-600 uppercase">{ev.dateBadge.month}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 text-xs truncate flex items-center gap-1.5">
                      <span className={clsx("w-2 h-2 rounded-full shrink-0", ev.colorClass)} />
                      <span className="truncate">{ev.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{ev.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card de Dicas do Educar360 */}
          <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 rounded-3xl text-amber-900 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span>{tips[activeTabTip].title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTabTip((prev) => (prev > 0 ? prev - 1 : tips.length - 1))}
                  className="p-1 rounded-lg hover:bg-amber-100 text-amber-700 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabTip((prev) => (prev < tips.length - 1 ? prev + 1 : 0))}
                  className="p-1 rounded-lg hover:bg-amber-100 text-amber-700 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-amber-800/90 leading-relaxed">
              {tips[activeTabTip].content}
            </p>
            <div className="text-[10px] text-amber-600 font-semibold text-right">
              {activeTabTip + 1}/{tips.length}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. BANNER INFORMATIVO INFERIOR (EXPLORE O EDUCAR360) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 p-6 rounded-3xl border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-md text-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
              Sua escola mais eficiente todos os dias
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Explore os módulos de Matrículas, Secretaria, Acadêmico e Relatórios para simplificar a gestão escolar da sua instituição.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
          {canAccessMatriculas && (
            <Link
              href="/app/matriculas"
              className="w-full md:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all text-center"
            >
              Acessar Matrículas
            </Link>
          )}
          {canAccessConfiguracoes && (
            <Link
              href="/app/configuracoes"
              className="w-full md:w-auto px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-all text-center"
            >
              Configurações
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
