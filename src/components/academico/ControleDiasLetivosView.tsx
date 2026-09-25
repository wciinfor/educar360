"use client";

import React, { useMemo } from "react";
import {
  SchoolYear,
  CalendarEvent,
  CalendarEventCategory,
  AcademicTerm,
} from "@/types/calendario";
import {
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  Clock,
  TrendingUp,
  Award,
  Layers,
  Calendar as CalendarIcon,
  Sun,
  ShieldCheck,
  Info,
  CalendarRange,
  CheckCircle,
} from "lucide-react";
import clsx from "clsx";

interface ControleDiasLetivosViewProps {
  schoolYear: SchoolYear;
  schoolYears?: SchoolYear[];
  onSelectYear?: (yearId: string) => void;
  events: CalendarEvent[];
  categories: CalendarEventCategory[];
  terms: AcademicTerm[];
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

export function ControleDiasLetivosView({
  schoolYear,
  schoolYears,
  onSelectYear,
  events,
  categories,
  terms,
}: ControleDiasLetivosViewProps) {
  // Motor de cálculo rigoroso, determinístico e auditado de dias letivos
  const calculation = useMemo(() => {
    const metaPlanejada = schoolYear.total_school_days || 200;

    // Data de hoje em formato local YYYY-MM-DD
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Filtra exclusivamente eventos vinculados ao ano letivo selecionado
    const yearEvents = events.filter((ev) => ev.school_year_id === schoolYear.id);

    const startDate = new Date(schoolYear.start_date + "T00:00:00");
    const endDate = new Date(schoolYear.end_date + "T00:00:00");

    let totalDiasCorridosAno = 0;
    let diasLetivosProgramados = 0;
    let diasNaoLetivosProgramados = 0;
    let diasLetivosOrdinarios = 0;
    let sabadosLetivos = 0;
    let feriadosEmDiasUteis = 0;
    let recessosEmDiasUteis = 0;
    let finsDeSemana = 0;

    // Métricas de progresso temporal (Decorrido vs Restante)
    let diasLetivosDecorridosAteHoje = 0;
    let diasLetivosRestantes = 0;

    // Agrupamento por mês (Chave: "YYYY-MM")
    const mesesMap: Record<
      string,
      {
        year: number;
        monthIndex: number;
        monthName: string;
        totalDias: number;
        diasLetivos: number;
        diasLetivosDecorridos: number;
        diasNaoLetivos: number;
        sabadosLetivos: number;
        feriadosRecessos: number;
      }
    > = {};

    // Agrupamento por etapa/período
    const etapasMap: Record<
      string,
      {
        term: AcademicTerm;
        totalDias: number;
        diasLetivos: number;
        diasLetivosDecorridos: number;
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
        diasLetivosDecorridos: 0,
        diasNaoLetivos: 0,
        sabadosLetivos: 0,
        feriadosRecessos: 0,
      };
    });

    const cur = new Date(startDate);
    while (cur <= endDate) {
      totalDiasCorridosAno++;

      const yearNum = cur.getFullYear();
      const monthIdx = cur.getMonth();
      const mKey = `${yearNum}-${String(monthIdx + 1).padStart(2, "0")}`;
      const dayFormatted = String(cur.getDate()).padStart(2, "0");
      const dateStr = `${mKey}-${dayFormatted}`;

      const dayOfWeek = cur.getDay(); // 0 = Domingo, 6 = Sábado
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isSaturday = dayOfWeek === 6;

      // Inicializa estrutura do mês se não existir
      if (!mesesMap[mKey]) {
        mesesMap[mKey] = {
          year: yearNum,
          monthIndex: monthIdx,
          monthName: MONTH_NAMES[monthIdx],
          totalDias: 0,
          diasLetivos: 0,
          diasLetivosDecorridos: 0,
          diasNaoLetivos: 0,
          sabadosLetivos: 0,
          feriadosRecessos: 0,
        };
      }
      mesesMap[mKey].totalDias++;

      // Busca todos os eventos que cobrem o dia dateStr
      const dayEvents = yearEvents.filter(
        (ev) => dateStr >= ev.start_date && dateStr <= ev.end_date
      );

      const hasLetivoEvent = dayEvents.some((ev) => ev.is_school_day);
      const hasNaoLetivoEvent = dayEvents.some((ev) => !ev.is_school_day);

      // Regra de Precedência Estrita:
      // 1. Se houver evento com is_school_day = false (Feriado/Recesso/Férias), o dia é NÃO LETIVO.
      // 2. Senão, se houver evento com is_school_day = true (Sábado Letivo/Reposição), o dia é LETIVO.
      // 3. Senão, padrão da semana: segunda a sexta = LETIVO; sábado e domingo = NÃO LETIVO.
      let isSchoolDay = false;

      if (hasNaoLetivoEvent) {
        isSchoolDay = false;
        if (!isWeekend) {
          const isFeriado = dayEvents.some((ev) => ev.category?.slug?.includes("feriado"));
          if (isFeriado) {
            feriadosEmDiasUteis++;
          } else {
            recessosEmDiasUteis++;
          }
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
        if (isPastOrToday) {
          diasLetivosDecorridosAteHoje++;
          mesesMap[mKey].diasLetivosDecorridos++;
        } else {
          diasLetivosRestantes++;
        }
      } else {
        diasNaoLetivosProgramados++;
        mesesMap[mKey].diasNaoLetivos++;
      }

      // Atribuição por etapa acadêmica
      terms.forEach((t) => {
        if (dateStr >= t.start_date && dateStr <= t.end_date) {
          etapasMap[t.id].totalDias++;
          if (isSchoolDay) {
            etapasMap[t.id].diasLetivos++;
            if (isPastOrToday) {
              etapasMap[t.id].diasLetivosDecorridos++;
            }
            if (isSaturday && hasLetivoEvent) {
              etapasMap[t.id].sabadosLetivos++;
            }
          } else {
            etapasMap[t.id].diasNaoLetivos++;
            if (!isWeekend && hasNaoLetivoEvent) {
              etapasMap[t.id].feriadosRecessos++;
            }
          }
        }
      });

      cur.setDate(cur.getDate() + 1);
    }

    const saldoProgramado = diasLetivosProgramados - metaPlanejada;
    const percentualProgramado =
      metaPlanejada > 0 ? (diasLetivosProgramados / metaPlanejada) * 100 : 0;
    const percentualDecorrido =
      metaPlanejada > 0 ? (diasLetivosDecorridosAteHoje / metaPlanejada) * 100 : 0;

    const mesesList = Object.keys(mesesMap)
      .sort()
      .map((k) => mesesMap[k]);

    const etapasList = terms.map((t) => etapasMap[t.id]);

    return {
      metaPlanejada,
      totalDiasCorridosAno,
      diasLetivosProgramados,
      diasNaoLetivosProgramados,
      diasLetivosOrdinarios,
      sabadosLetivos,
      feriadosEmDiasUteis,
      recessosEmDiasUteis,
      finsDeSemana,
      diasLetivosDecorridosAteHoje,
      diasLetivosRestantes,
      saldoProgramado,
      percentualProgramado,
      percentualDecorrido,
      mesesList,
      etapasList,
    };
  }, [schoolYear, events, terms]);

  const saldoColor =
    calculation.saldoProgramado >= 0
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <div className="space-y-6">
      {/* ============================================================================== */}
      {/* 1. PAINEL PRINCIPAL: PLANEJADO × PROGRAMADO × DECORRIDO */}
      {/* ============================================================================== */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Controle de Dias Letivos (LDB & Calendário)</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Painel Planejado × Programado no Calendário
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Conferência contínua entre a <strong>meta legal ({calculation.metaPlanejada} dias letivos)</strong> e os dias efetivamente programados no calendário de {schoolYear.year}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {schoolYears && onSelectYear && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Ano:</span>
                <select
                  value={schoolYear.id}
                  onChange={(e) => onSelectYear(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {schoolYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.year} - {y.title} {y.is_current ? "(Atual)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <span
              className={clsx(
                "px-3.5 py-1.5 rounded-2xl text-xs font-extrabold border flex items-center gap-1.5 shadow-2xs",
                calculation.saldoProgramado >= 0
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-rose-50 text-rose-800 border-rose-300"
              )}
            >
              {calculation.saldoProgramado >= 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>
                {calculation.saldoProgramado >= 0
                  ? `Meta Atendida (${calculation.diasLetivosProgramados}/${calculation.metaPlanejada})`
                  : `Déficit de Grade (Faltam ${Math.abs(calculation.saldoProgramado)} dias)`}
              </span>
            </span>
          </div>
        </div>

        {/* 5 Cards de Indicadores Chave (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Meta Planejada */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              1. Meta Planejada
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900">
                {calculation.metaPlanejada}
              </span>
              <span className="text-xs font-semibold text-slate-500">dias</span>
            </div>
            <span className="text-[11px] text-slate-500 block">
              Exigência LDB
            </span>
          </div>

          {/* Card 2: Programado no Calendário */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
              2. Programado
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-indigo-900">
                {calculation.diasLetivosProgramados}
              </span>
              <span className="text-xs font-semibold text-indigo-700">dias</span>
            </div>
            <span className="text-[11px] text-indigo-700/80 block">
              {calculation.diasLetivosOrdinarios} ord. + {calculation.sabadosLetivos} sáb.
            </span>
          </div>

          {/* Card 3: Saldo de Dias Programados */}
          <div className={clsx("p-4 rounded-2xl border space-y-1.5", saldoColor)}>
            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-90">
              3. Saldo vs Meta
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold">
                {calculation.saldoProgramado >= 0
                  ? `+${calculation.saldoProgramado}`
                  : calculation.saldoProgramado}
              </span>
              <span className="text-xs font-semibold">dias</span>
            </div>
            <span className="text-[11px] opacity-80 block">
              {calculation.saldoProgramado >= 0
                ? "Cumpre exigência"
                : "Necessita reposição"}
            </span>
          </div>

          {/* Card 4: Decorrido até Hoje */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                4. Decorrido
              </span>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded-full">
                {calculation.percentualDecorrido.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900">
                {calculation.diasLetivosDecorridosAteHoje}
              </span>
              <span className="text-xs font-semibold text-slate-500">dias</span>
            </div>
            <span className="text-[11px] text-slate-500 block">
              Até a data atual
            </span>
          </div>

          {/* Card 5: Dias Restantes */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              5. Restantes
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900">
                {calculation.diasLetivosRestantes}
              </span>
              <span className="text-xs font-semibold text-slate-500">dias</span>
            </div>
            <span className="text-[11px] text-slate-500 block">
              A decorrer no ano
            </span>
          </div>
        </div>

        {/* Composição Analítica dos Dias */}
        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Composição dos {calculation.totalDiasCorridosAno} Dias Corridos ({new Date(schoolYear.start_date + "T00:00:00").toLocaleDateString("pt-BR")} a {new Date(schoolYear.end_date + "T00:00:00").toLocaleDateString("pt-BR")})</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-500 font-semibold block text-[11px]">Dias Úteis Regulares</span>
              <strong className="text-sm font-bold text-slate-900">{calculation.diasLetivosOrdinarios} dias</strong>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="text-emerald-700 font-semibold block text-[11px]">Sábados Letivos</span>
              <strong className="text-sm font-bold text-emerald-800">+{calculation.sabadosLetivos} dias</strong>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="text-rose-700 font-semibold block text-[11px]">Feriados em Dias Úteis</span>
              <strong className="text-sm font-bold text-rose-800">-{calculation.feriadosEmDiasUteis} dias</strong>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="text-amber-700 font-semibold block text-[11px]">Recessos em Dias Úteis</span>
              <strong className="text-sm font-bold text-amber-800">-{calculation.recessosEmDiasUteis} dias</strong>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-slate-500 font-semibold block text-[11px]">Fins de Semana</span>
              <strong className="text-sm font-bold text-slate-700">{calculation.finsDeSemana} dias</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 2. RESUMO POR ETAPAS / PERÍODOS ACADÊMICOS */}
      {/* ============================================================================== */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Distribuição de Dias Letivos por Etapa Acadêmica
            </h3>
            <p className="text-xs text-slate-500">
              Apuração isolada por período cadastrado (sem sobreposições ou dupla contagem).
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {terms.length} etapas
          </span>
        </div>

        {calculation.etapasList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Nenhuma etapa acadêmica vinculada a este ano letivo.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {calculation.etapasList.map((item) => {
              const termPercent =
                calculation.diasLetivosProgramados > 0
                  ? (item.diasLetivos / calculation.diasLetivosProgramados) * 100
                  : 0;

              return (
                <div
                  key={item.term.id}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 inline-flex items-center justify-center text-xs font-bold">
                        {item.term.sequence_order}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {item.term.name}
                      </h4>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {item.term.code}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {new Date(item.term.start_date + "T00:00:00").toLocaleDateString("pt-BR")} a{" "}
                      {new Date(item.term.end_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        Dias Programados
                      </span>
                      <span className="text-base font-extrabold text-indigo-900">
                        {item.diasLetivos} dias
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        Participação
                      </span>
                      <span className="text-base font-extrabold text-slate-700">
                        {termPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Sábados: <strong>{item.sabadosLetivos}</strong></span>
                    <span>Feriados/Recessos: <strong>{item.feriadosRecessos}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================================== */}
      {/* 3. RESUMO MENSAL DETALHADO */}
      {/* ============================================================================== */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Resumo Mensal de Dias Letivos ({schoolYear.year})
            </h3>
            <p className="text-xs text-slate-500">
              Detalhamento mês a mês baseado exclusivamente nos limites de vigência do ano letivo ({schoolYear.start_date} a {schoolYear.end_date}).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3">Mês / Ano</th>
                <th className="py-3 px-3 text-center">Dias Corridos</th>
                <th className="py-3 px-3 text-center text-emerald-700">Dias Letivos Programados</th>
                <th className="py-3 px-3 text-center">Sábados Letivos</th>
                <th className="py-3 px-3 text-center text-rose-700">Feriados / Recessos</th>
                <th className="py-3 px-3 text-center">Não Letivos</th>
                <th className="py-3 px-3 text-right">Progresso do Mês</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calculation.mesesList.map((m) => {
                const monthLetivoPercent =
                  m.totalDias > 0 ? (m.diasLetivos / m.totalDias) * 100 : 0;

                return (
                  <tr key={`${m.year}-${m.monthIndex}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {m.monthName} {m.year}
                    </td>
                    <td className="py-3.5 px-3 text-center font-medium text-slate-600">
                      {m.totalDias}
                    </td>
                    <td className="py-3.5 px-3 text-center font-extrabold text-emerald-700 bg-emerald-50/30">
                      {m.diasLetivos}
                    </td>
                    <td className="py-3.5 px-3 text-center font-medium text-slate-700">
                      {m.sabadosLetivos > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                          +{m.sabadosLetivos}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center font-medium text-rose-700">
                      {m.feriadosRecessos > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">
                          {m.feriadosRecessos}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center font-medium text-slate-600">
                      {m.diasNaoLetivos}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[11px] font-bold text-slate-700">
                          {monthLetivoPercent.toFixed(0)}%
                        </span>
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${monthLetivoPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/90 font-extrabold text-slate-900 border-t-2 border-slate-300">
                <td className="py-3.5 px-3">Total Consolidado</td>
                <td className="py-3.5 px-3 text-center">{calculation.totalDiasCorridosAno}</td>
                <td className="py-3.5 px-3 text-center text-emerald-800 text-base font-extrabold bg-emerald-100/40">
                  {calculation.diasLetivosProgramados}
                </td>
                <td className="py-3.5 px-3 text-center text-indigo-700">+{calculation.sabadosLetivos}</td>
                <td className="py-3.5 px-3 text-center text-rose-800">
                  {calculation.feriadosEmDiasUteis + calculation.recessosEmDiasUteis}
                </td>
                <td className="py-3.5 px-3 text-center">{calculation.diasNaoLetivosProgramados}</td>
                <td className="py-3.5 px-3 text-right text-emerald-700 font-extrabold">
                  {calculation.percentualProgramado.toFixed(1)}% da Meta
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
