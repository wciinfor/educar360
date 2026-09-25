"use client";

import React, { useMemo } from "react";
import {
  SchoolYear,
  CalendarEvent,
  CalendarEventCategory,
  AcademicTerm,
} from "@/types/calendario";
import {
  Printer,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  CalendarDays,
  Clock,
  Users,
  Tag,
  Building,
  GraduationCap,
  Award,
} from "lucide-react";
import clsx from "clsx";

interface RelatorioCalendarioViewProps {
  schoolYear: SchoolYear;
  events: CalendarEvent[];
  categories: CalendarEventCategory[];
  terms: AcademicTerm[];
  schoolName: string;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function RelatorioCalendarioView({
  schoolYear,
  events,
  categories,
  terms,
  schoolName,
}: RelatorioCalendarioViewProps) {
  // Data e hora de emissão
  const emissionDate = useMemo(() => {
    return new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Motor de cálculo de dias letivos determinístico
  const calculation = useMemo(() => {
    const metaPlanejada = schoolYear.total_school_days || 200;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const yearEvents = events.filter((ev) => ev.school_year_id === schoolYear.id);

    const startDate = new Date(schoolYear.start_date + "T00:00:00");
    const endDate = new Date(schoolYear.end_date + "T00:00:00");

    let totalDiasCorridos = 0;
    let diasLetivosProgramados = 0;
    let diasNaoLetivosProgramados = 0;
    let diasLetivosOrdinarios = 0;
    let sabadosLetivos = 0;
    let feriadosEmDiasUteis = 0;
    let recessosEmDiasUteis = 0;
    let finsDeSemana = 0;

    let diasLetivosDecorridos = 0;
    let diasLetivosRestantes = 0;

    const mesesMap: Record<
      string,
      {
        year: number;
        monthIndex: number;
        monthName: string;
        totalDias: number;
        diasLetivos: number;
        diasNaoLetivos: number;
        sabadosLetivos: number;
        feriadosRecessos: number;
      }
    > = {};

    const etapasMap: Record<
      string,
      {
        term: AcademicTerm;
        totalDias: number;
        diasLetivos: number;
        diasNaoLetivos: number;
        sabadosLetivos: number;
        feriadosRecessos: number;
      }
    > = {};

    terms.forEach((t) => {
      etapasMap[t.id] = {
        term: t,
        totalDias: 0,
        diasLetivos: 0,
        diasNaoLetivos: 0,
        sabadosLetivos: 0,
        feriadosRecessos: 0,
      };
    });

    const cur = new Date(startDate);
    while (cur <= endDate) {
      totalDiasCorridos++;

      const yearNum = cur.getFullYear();
      const monthIdx = cur.getMonth();
      const mKey = `${yearNum}-${String(monthIdx + 1).padStart(2, "0")}`;
      const dayFormatted = String(cur.getDate()).padStart(2, "0");
      const dateStr = `${mKey}-${dayFormatted}`;

      const dayOfWeek = cur.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isSaturday = dayOfWeek === 6;

      if (!mesesMap[mKey]) {
        mesesMap[mKey] = {
          year: yearNum,
          monthIndex: monthIdx,
          monthName: MONTH_NAMES[monthIdx],
          totalDias: 0,
          diasLetivos: 0,
          diasNaoLetivos: 0,
          sabadosLetivos: 0,
          feriadosRecessos: 0,
        };
      }
      mesesMap[mKey].totalDias++;

      const dayEvents = yearEvents.filter(
        (ev) => dateStr >= ev.start_date && dateStr <= ev.end_date
      );

      const hasLetivoEvent = dayEvents.some((ev) => ev.is_school_day);
      const hasNaoLetivoEvent = dayEvents.some((ev) => !ev.is_school_day);

      let isSchoolDay = false;

      if (hasNaoLetivoEvent) {
        isSchoolDay = false;
        if (!isWeekend) {
          const isFeriado = dayEvents.some((ev) => ev.category?.slug?.includes("feriado"));
          if (isFeriado) feriadosEmDiasUteis++;
          else recessosEmDiasUteis++;
          mesesMap[mKey].feriadosRecessos++;
        }
      } else if (hasLetivoEvent) {
        isSchoolDay = true;
        if (isSaturday) {
          sabadosLetivos++;
          mesesMap[mKey].sabadosLetivos++;
        }
      } else {
        if (isWeekend) {
          isSchoolDay = false;
          finsDeSemana++;
        } else {
          isSchoolDay = true;
          diasLetivosOrdinarios++;
        }
      }

      const isPastOrToday = dateStr <= todayStr;

      if (isSchoolDay) {
        diasLetivosProgramados++;
        mesesMap[mKey].diasLetivos++;
        if (isPastOrToday) diasLetivosDecorridos++;
        else diasLetivosRestantes++;
      } else {
        diasNaoLetivosProgramados++;
        mesesMap[mKey].diasNaoLetivos++;
      }

      terms.forEach((t) => {
        if (dateStr >= t.start_date && dateStr <= t.end_date) {
          etapasMap[t.id].totalDias++;
          if (isSchoolDay) {
            etapasMap[t.id].diasLetivos++;
            if (isSaturday && hasLetivoEvent) etapasMap[t.id].sabadosLetivos++;
          } else {
            etapasMap[t.id].diasNaoLetivos++;
            if (!isWeekend && hasNaoLetivoEvent) etapasMap[t.id].feriadosRecessos++;
          }
        }
      });

      cur.setDate(cur.getDate() + 1);
    }

    const saldo = diasLetivosProgramados - metaPlanejada;
    const percentualProgramado = metaPlanejada > 0 ? (diasLetivosProgramados / metaPlanejada) * 100 : 0;
    const percentualDecorrido = metaPlanejada > 0 ? (diasLetivosDecorridos / metaPlanejada) * 100 : 0;

    const mesesList = Object.keys(mesesMap)
      .sort()
      .map((k) => mesesMap[k]);

    const etapasList = terms.map((t) => etapasMap[t.id]);

    // Separação de Eventos por Grupo para o Relatório
    const feriadosERecessos = yearEvents
      .filter((e) => !e.is_school_day)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    const sabadosLetivosEventos = yearEvents
      .filter((e) => e.is_school_day && e.category?.slug === "sabado-letivo")
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    const eventosAcademicos = yearEvents
      .filter((e) => e.category?.slug !== "sabado-letivo" && !e.category?.slug?.includes("feriado") && e.category?.slug !== "recesso-escolar")
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    return {
      metaPlanejada,
      totalDiasCorridos,
      diasLetivosProgramados,
      diasNaoLetivosProgramados,
      diasLetivosOrdinarios,
      sabadosLetivos,
      feriadosEmDiasUteis,
      recessosEmDiasUteis,
      finsDeSemana,
      diasLetivosDecorridos,
      diasLetivosRestantes,
      saldo,
      percentualProgramado,
      percentualDecorrido,
      mesesList,
      etapasList,
      feriadosERecessos,
      sabadosLetivosEventos,
      eventosAcademicos,
    };
  }, [schoolYear, events, terms]);

  return (
    <div className="space-y-6">
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-1">
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>Relatório Oficial Formatado para Impressão A4</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Documento do Calendário Escolar — Ano Letivo {schoolYear.year}
          </h3>
          <p className="text-xs text-slate-500">
            Layout homologado com identificação institucional, carga horária legal, eventos, bimestres e assinaturas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Gerar PDF</span>
          </button>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* DOCUMENTO OFICIAL A4 PARA IMPRESSÃO */}
      {/* ============================================================================== */}
      <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-md text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none max-w-5xl mx-auto space-y-6 font-sans text-xs sm:text-sm">
        {/* Cabeçalho Institucional */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-700 text-white font-black text-sm flex items-center justify-center print:bg-black">
                E360
              </span>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-slate-900">
                  {schoolName}
                </h1>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Sistema de Gestão Educacional Educar360
                </span>
              </div>
            </div>
          </div>

          <div className="text-right space-y-0.5">
            <span className="inline-block px-2.5 py-1 bg-slate-900 text-white text-[11px] font-extrabold rounded-md uppercase tracking-wider print:bg-black">
              Documento Oficial
            </span>
            <div className="text-[10px] text-slate-500 font-medium">
              Emissão: {emissionDate}
            </div>
          </div>
        </div>

        {/* Título do Documento & Vigência */}
        <div className="text-center py-2 border-b border-slate-200 space-y-1">
          <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wide">
            Calendário Escolar e Acadêmico Oficial — {schoolYear.title}
          </h2>
          <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-600">
            <span>
              Vigência:{" "}
              <strong>
                {new Date(schoolYear.start_date + "T00:00:00").toLocaleDateString("pt-BR")} a{" "}
                {new Date(schoolYear.end_date + "T00:00:00").toLocaleDateString("pt-BR")}
              </strong>
            </span>
            <span>•</span>
            <span>
              Status: <strong className="uppercase">{schoolYear.status}</strong>
            </span>
            {schoolYear.is_current && (
              <>
                <span>•</span>
                <span className="text-indigo-700 font-bold">Ano Letivo Vigente</span>
              </>
            )}
          </div>
        </div>

        {/* QUADRO 1: SÍNTESE DA CARGA HORÁRIA & DIAS LETIVOS */}
        <div className="border border-slate-300 rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center justify-between">
            <span>1. Síntese de Carga Horária e Dias Letivos (LDB Art. 24)</span>
            <span className="font-mono text-[11px]">Meta: {calculation.metaPlanejada} Dias</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-200 text-center">
            <div className="p-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Meta Planejada</span>
              <strong className="text-lg font-black text-slate-900">{calculation.metaPlanejada}</strong>
              <span className="text-[10px] text-slate-500 block">dias letivos</span>
            </div>

            <div className="p-3">
              <span className="text-[10px] font-bold text-indigo-700 uppercase block">Total Programado</span>
              <strong className="text-lg font-black text-indigo-900">{calculation.diasLetivosProgramados}</strong>
              <span className="text-[10px] text-indigo-700 block">dias na grade</span>
            </div>

            <div className="p-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Saldo da Grade</span>
              <strong
                className={clsx(
                  "text-lg font-black",
                  calculation.saldo >= 0 ? "text-emerald-700" : "text-rose-700"
                )}
              >
                {calculation.saldo >= 0 ? `+${calculation.saldo}` : calculation.saldo}
              </strong>
              <span className="text-[10px] text-slate-500 block">dias de margem</span>
            </div>

            <div className="p-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Cumprimento da Meta</span>
              <strong className="text-lg font-black text-slate-900">
                {calculation.percentualProgramado.toFixed(1)}%
              </strong>
              <span className="text-[10px] text-slate-500 block">da carga exigida</span>
            </div>
          </div>

          <div className="bg-slate-50 px-3.5 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 font-medium">
            <span>Dias Úteis Regulares: <strong>{calculation.diasLetivosOrdinarios}</strong></span>
            <span>Sábados Letivos: <strong>+{calculation.sabadosLetivos}</strong></span>
            <span>Feriados em Dias Úteis: <strong>-{calculation.feriadosEmDiasUteis}</strong></span>
            <span>Recessos em Dias Úteis: <strong>-{calculation.recessosEmDiasUteis}</strong></span>
            <span>Dias Decorridos: <strong>{calculation.diasLetivosDecorridos}</strong></span>
            <span>Dias Restantes: <strong>{calculation.diasLetivosRestantes}</strong></span>
          </div>
        </div>

        {/* QUADRO 2: ETAPAS / PERÍODOS ACADÊMICOS */}
        <div className="border border-slate-300 rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 font-bold text-xs uppercase tracking-wider text-slate-800">
            2. Divisão por Etapas / Períodos Acadêmicos
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                <th className="py-2 px-3">Seq.</th>
                <th className="py-2 px-3">Etapa / Bimestre</th>
                <th className="py-2 px-3">Código</th>
                <th className="py-2 px-3">Período de Vigência</th>
                <th className="py-2 px-3 text-center">Dias Letivos</th>
                <th className="py-2 px-3 text-center">Sábados Letivos</th>
                <th className="py-2 px-3 text-center">Feriados/Recessos</th>
                <th className="py-2 px-3 text-right">Participação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {calculation.etapasList.map((item) => {
                const part =
                  calculation.diasLetivosProgramados > 0
                    ? (item.diasLetivos / calculation.diasLetivosProgramados) * 100
                    : 0;

                return (
                  <tr key={item.term.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-bold">{item.term.sequence_order}º</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{item.term.name}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-600">{item.term.code}</td>
                    <td className="py-2 px-3">
                      {new Date(item.term.start_date + "T00:00:00").toLocaleDateString("pt-BR")} a{" "}
                      {new Date(item.term.end_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-2 px-3 text-center font-extrabold text-indigo-950">
                      {item.diasLetivos}
                    </td>
                    <td className="py-2 px-3 text-center font-medium">+{item.sabadosLetivos}</td>
                    <td className="py-2 px-3 text-center font-medium">{item.feriadosRecessos}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-700">
                      {part.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* QUADRO 3: CALENDÁRIO ANUAL (GRADE DE 12 MESES) */}
        <div className="border border-slate-300 rounded-xl overflow-hidden page-break-inside-avoid">
          <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 font-bold text-xs uppercase tracking-wider text-slate-800">
            3. Grade Anual Consolidada (Dias Letivos & Não Letivos)
          </div>

          <div className="p-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
            {MONTH_NAMES.map((monthName, monthIndex) => {
              const yearNum = parseInt(schoolYear.year, 10) || new Date().getFullYear();
              const daysInM = new Date(yearNum, monthIndex + 1, 0).getDate();
              const firstD = new Date(yearNum, monthIndex, 1).getDay();

              const monthEvents = events.filter((ev) => {
                if (ev.school_year_id !== schoolYear.id) return false;
                const evStart = new Date(ev.start_date + "T00:00:00");
                const evEnd = new Date(ev.end_date + "T00:00:00");
                const mStart = new Date(yearNum, monthIndex, 1);
                const mEnd = new Date(yearNum, monthIndex + 1, 0);
                return evStart <= mEnd && evEnd >= mStart;
              });

              return (
                <div key={monthName} className="border border-slate-200 rounded-lg p-2 space-y-1.5">
                  <h5 className="font-bold text-[11px] uppercase text-slate-900 border-b border-slate-100 pb-0.5">
                    {monthName}
                  </h5>

                  <div className="grid grid-cols-7 gap-0.5 text-center text-[9px]">
                    {WEEKDAY_NAMES.map((w) => (
                      <span key={w} className="text-slate-400 font-bold text-[8px]">
                        {w[0]}
                      </span>
                    ))}

                    {Array.from({ length: firstD }).map((_, idx) => (
                      <span key={`empty-${idx}`} />
                    ))}

                    {Array.from({ length: daysInM }).map((_, dIdx) => {
                      const dayN = dIdx + 1;
                      const mStr = String(monthIndex + 1).padStart(2, "0");
                      const dStr = String(dayN).padStart(2, "0");
                      const fullDateStr = `${yearNum}-${mStr}-${dStr}`;

                      const isInsideYear =
                        fullDateStr >= schoolYear.start_date && fullDateStr <= schoolYear.end_date;
                      const isWeekend = new Date(yearNum, monthIndex, dayN).getDay() % 6 === 0;

                      const dayEvs = monthEvents.filter(
                        (ev) => fullDateStr >= ev.start_date && fullDateStr <= ev.end_date
                      );
                      const hasLetivo = dayEvs.some((e) => e.is_school_day);
                      const hasNaoLetivo = dayEvs.some((e) => !e.is_school_day);

                      let bgClass = "text-slate-700";
                      if (!isInsideYear) {
                        bgClass = "text-slate-200";
                      } else if (hasNaoLetivo) {
                        bgClass = "bg-rose-100 text-rose-800 font-bold rounded-full";
                      } else if (hasLetivo && isWeekend) {
                        bgClass = "bg-indigo-600 text-white font-bold rounded-full";
                      } else if (hasLetivo) {
                        bgClass = "bg-blue-100 text-blue-800 font-bold rounded-full";
                      } else if (isWeekend) {
                        bgClass = "text-slate-400";
                      }

                      return (
                        <span key={`d-${dayN}`} className={clsx("w-4 h-4 mx-auto inline-flex items-center justify-center", bgClass)}>
                          {dayN}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* QUADRO 4: FERIADOS, RECESSOS E SÁBADOS LETIVOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 page-break-inside-avoid">
          {/* Feriados e Recessos */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-1.5 border-b border-slate-300 font-bold text-xs uppercase tracking-wider text-slate-800">
              4.1. Feriados e Recessos Escolares
            </div>

            {calculation.feriadosERecessos.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">Nenhum feriado registrado.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100">
                  {calculation.feriadosERecessos.map((ev) => (
                    <tr key={ev.id}>
                      <td className="py-1.5 px-3 font-semibold text-slate-900">{ev.title}</td>
                      <td className="py-1.5 px-3 text-slate-600 text-right font-medium">
                        {new Date(ev.start_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        {ev.end_date !== ev.start_date &&
                          ` a ${new Date(ev.end_date + "T00:00:00").toLocaleDateString("pt-BR")}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Sábados Letivos & Dias Especiais */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-1.5 border-b border-slate-300 font-bold text-xs uppercase tracking-wider text-slate-800">
              4.2. Sábados Letivos & Reposições
            </div>

            {calculation.sabadosLetivosEventos.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">Nenhum sábado letivo programado.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100">
                  {calculation.sabadosLetivosEventos.map((ev) => (
                    <tr key={ev.id}>
                      <td className="py-1.5 px-3 font-semibold text-slate-900">{ev.title}</td>
                      <td className="py-1.5 px-3 text-slate-600 text-right font-medium">
                        {new Date(ev.start_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* QUADRO 5: EVENTOS PEDAGÓGICOS E ATIVIDADES */}
        {calculation.eventosAcademicos.length > 0 && (
          <div className="border border-slate-300 rounded-xl overflow-hidden page-break-inside-avoid">
            <div className="bg-slate-100 px-3.5 py-1.5 border-b border-slate-300 font-bold text-xs uppercase tracking-wider text-slate-800">
              5. Eventos Acadêmicos, Avaliações e Reuniões
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                  <th className="py-1.5 px-3">Evento / Atividade</th>
                  <th className="py-1.5 px-3">Categoria</th>
                  <th className="py-1.5 px-3">Data</th>
                  <th className="py-1.5 px-3">Público-Alvo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculation.eventosAcademicos.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-1.5 px-3 font-semibold text-slate-900">{ev.title}</td>
                    <td className="py-1.5 px-3 text-slate-600">{ev.category?.name || "-"}</td>
                    <td className="py-1.5 px-3 text-slate-700 font-medium">
                      {new Date(ev.start_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      {ev.end_date !== ev.start_date &&
                        ` a ${new Date(ev.end_date + "T00:00:00").toLocaleDateString("pt-BR")}`}
                    </td>
                    <td className="py-1.5 px-3 text-slate-600 capitalize">{ev.target_audience.replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* QUADRO 6: DEMONSTRATIVO MENSAL CONSOLIDADO */}
        <div className="border border-slate-300 rounded-xl overflow-hidden page-break-inside-avoid">
          <div className="bg-slate-100 px-3.5 py-1.5 border-b border-slate-300 font-bold text-xs uppercase tracking-wider text-slate-800">
            6. Demonstrativo Mensal Consolidado
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                <th className="py-1.5 px-3">Mês</th>
                <th className="py-1.5 px-3 text-center">Dias Corridos</th>
                <th className="py-1.5 px-3 text-center">Dias Letivos</th>
                <th className="py-1.5 px-3 text-center">Sábados Letivos</th>
                <th className="py-1.5 px-3 text-center">Feriados/Recessos</th>
                <th className="py-1.5 px-3 text-center">Dias Não Letivos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calculation.mesesList.map((m) => (
                <tr key={`${m.year}-${m.monthIndex}`}>
                  <td className="py-1.5 px-3 font-bold text-slate-900">{m.monthName} {m.year}</td>
                  <td className="py-1.5 px-3 text-center">{m.totalDias}</td>
                  <td className="py-1.5 px-3 text-center font-extrabold text-indigo-950">{m.diasLetivos}</td>
                  <td className="py-1.5 px-3 text-center">{m.sabadosLetivos > 0 ? `+${m.sabadosLetivos}` : "-"}</td>
                  <td className="py-1.5 px-3 text-center">{m.feriadosRecessos}</td>
                  <td className="py-1.5 px-3 text-center">{m.diasNaoLetivos}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-t border-slate-300">
                <td className="py-2 px-3">Total Consolidado</td>
                <td className="py-2 px-3 text-center">{calculation.totalDiasCorridos}</td>
                <td className="py-2 px-3 text-center text-indigo-950 font-black">{calculation.diasLetivosProgramados}</td>
                <td className="py-2 px-3 text-center">+{calculation.sabadosLetivos}</td>
                <td className="py-2 px-3 text-center">{calculation.feriadosEmDiasUteis + calculation.recessosEmDiasUteis}</td>
                <td className="py-2 px-3 text-center">{calculation.diasNaoLetivosProgramados}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* LEGENDA DE CATEGORIAS */}
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs space-y-1.5 page-break-inside-avoid">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
            Legenda de Categorias Homologadas
          </span>
          <div className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color_hex }} />
                <span className="font-medium text-slate-700 text-[11px]">{c.name}</span>
                <span className="text-[9px] text-slate-500 font-semibold">
                  ({c.is_school_day ? "Letivo" : "Não Letivo"})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CAMPO DE VALIDAÇÃO E ASSINATURAS OFICIAIS */}
        <div className="pt-8 border-t-2 border-slate-300 page-break-inside-avoid space-y-6">
          <div className="text-[11px] text-slate-600 text-center">
            Certificamos que o presente Calendário Escolar e Acadêmico do ano letivo de <strong>{schoolYear.year}</strong> atende às diretrizes da Lei de Diretrizes e Bases da Educação Nacional (LDB 9.394/96) e ao Projeto Pedagógico Institucional.
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
            <div className="space-y-1">
              <div className="border-t border-slate-800 pt-1 font-bold text-slate-900">
                Direção Geral / Escolar
              </div>
              <span className="text-[10px] text-slate-500 block">Assinatura e Carimbo</span>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-800 pt-1 font-bold text-slate-900">
                Coordenação Pedagógica
              </div>
              <span className="text-[10px] text-slate-500 block">Assinatura e Carimbo</span>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-800 pt-1 font-bold text-slate-900">
                Secretaria Escolar
              </div>
              <span className="text-[10px] text-slate-500 block">Registro e Homologação</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
