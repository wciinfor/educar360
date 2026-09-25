"use client";

import React, { useState, useMemo } from "react";
import {
  SchoolYear,
  CalendarEvent,
  CalendarEventCategory,
  AcademicTerm,
  EventTargetAudience,
} from "@/types/calendario";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Clock,
  Users,
  Layers,
  Tag,
  Plus,
  Info,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Filter,
  List,
  Grid3X3,
  CalendarRange,
  Edit2,
  Trash2,
} from "lucide-react";
import clsx from "clsx";

interface CalendarioVisualViewProps {
  schoolYear: SchoolYear;
  schoolYears?: SchoolYear[];
  onSelectYear?: (yearId: string) => void;
  categories: CalendarEventCategory[];
  events: CalendarEvent[];
  terms: AcademicTerm[];
  userRole: string;
  currentUserId: string;
  onOpenCreateEventModal: (initialDate?: string) => void;
  onOpenEditEventModal: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string, eventTitle: string) => void;
}

type VisualMode = "mensal" | "anual" | "lista";

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

const AUDIENCE_LABELS: Record<EventTargetAudience, string> = {
  todos: "Todos (Comunidade Escolar)",
  professores: "Professores & Docentes",
  alunos_responsaveis: "Alunos & Responsáveis",
  equipe_pedagogica: "Equipe Pedagógica",
  secretaria: "Secretaria Escolar",
};

function formatLocalDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function CalendarioVisualView({
  schoolYear,
  schoolYears,
  onSelectYear,
  categories,
  events,
  terms,
  userRole,
  currentUserId,
  onOpenCreateEventModal,
  onOpenEditEventModal,
  onDeleteEvent,
}: CalendarioVisualViewProps) {
  const [visualMode, setVisualMode] = useState<VisualMode>("mensal");

  // Mês em visualização (0-indexed: 0 = Jan, 11 = Dez)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const today = new Date();
    const yearNumber = parseInt(schoolYear.year, 10);
    if (!isNaN(yearNumber) && today.getFullYear() === yearNumber) {
      return today;
    }
    // Caso o ano do calendário seja diferente do ano corrente, abre no início do ano letivo
    if (schoolYear.start_date) {
      return new Date(schoolYear.start_date + "T00:00:00");
    }
    return new Date();
  });

  // Sincroniza currentDate quando o ano letivo selecionado mudar
  React.useEffect(() => {
    if (schoolYear.start_date) {
      const yearNum = parseInt(schoolYear.year, 10);
      const today = new Date();
      if (!isNaN(yearNum) && today.getFullYear() === yearNum) {
        setCurrentDate(today);
      } else {
        setCurrentDate(new Date(schoolYear.start_date + "T00:00:00"));
      }
    }
  }, [schoolYear.id, schoolYear.year, schoolYear.start_date]);

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  const [selectedDayType, setSelectedDayType] = useState<"all" | "letivo" | "nao_letivo">("all");

  // Modais de detalhe
  const [selectedEventDetail, setSelectedEventDetail] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    dateStr: string;
    events: CalendarEvent[];
  } | null>(null);

  const canManageAll =
    userRole === "admin_escola" || userRole === "coordenacao" || userRole === "secretaria";
  const isSecretaria = userRole === "secretaria";

  // Eventos filtrados para o ano atual
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (ev.school_year_id !== schoolYear.id) return false;
      if (selectedCategory !== "all" && ev.category_id !== selectedCategory) return false;
      if (selectedTerm !== "all" && ev.academic_term_id !== selectedTerm) return false;
      if (selectedDayType === "letivo" && !ev.is_school_day) return false;
      if (selectedDayType === "nao_letivo" && ev.is_school_day) return false;
      return true;
    });
  }, [events, schoolYear.id, selectedCategory, selectedTerm, selectedDayType]);

  // Navegação de mês
  function handlePrevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  // Gera dias para a matriz do mês atual
  const monthCalendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isWeekend: boolean;
      isToday: boolean;
      events: CalendarEvent[];
      isSchoolDay: boolean;
    }[] = [];

    const now = new Date();
    const todayStr = formatLocalDateKey(now.getFullYear(), now.getMonth(), now.getDate());

    // Dias do mês anterior para completar a 1ª semana
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevYearNum = month === 0 ? year - 1 : year;
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const date = new Date(prevYearNum, prevMonthIdx, d);
      const dateStr = formatLocalDateKey(prevYearNum, prevMonthIdx, d);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      const dayEvents = filteredEvents.filter(
        (ev) => dateStr >= ev.start_date && dateStr <= ev.end_date
      );
      const hasLetivoEvent = dayEvents.some((ev) => ev.is_school_day);
      const hasNaoLetivoEvent = dayEvents.some((ev) => !ev.is_school_day);
      const isSchoolDay = hasLetivoEvent ? true : hasNaoLetivoEvent ? false : !isWeekend;

      days.push({
        date,
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isWeekend,
        isToday: dateStr === todayStr,
        events: dayEvents,
        isSchoolDay,
      });
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = formatLocalDateKey(year, month, d);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      const dayEvents = filteredEvents.filter(
        (ev) => dateStr >= ev.start_date && dateStr <= ev.end_date
      );
      const hasLetivoEvent = dayEvents.some((ev) => ev.is_school_day);
      const hasNaoLetivoEvent = dayEvents.some((ev) => !ev.is_school_day);
      const isSchoolDay = hasLetivoEvent ? true : hasNaoLetivoEvent ? false : !isWeekend;

      days.push({
        date,
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isWeekend,
        isToday: dateStr === todayStr,
        events: dayEvents,
        isSchoolDay,
      });
    }

    // Dias do próximo mês para completar 42 células (6 semanas x 7)
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    const nextYearNum = month === 11 ? year + 1 : year;
    const remainingDays = 42 - days.length;
    for (let d = 1; d <= remainingDays; d++) {
      const date = new Date(nextYearNum, nextMonthIdx, d);
      const dateStr = formatLocalDateKey(nextYearNum, nextMonthIdx, d);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      const dayEvents = filteredEvents.filter(
        (ev) => dateStr >= ev.start_date && dateStr <= ev.end_date
      );
      const hasLetivoEvent = dayEvents.some((ev) => ev.is_school_day);
      const hasNaoLetivoEvent = dayEvents.some((ev) => !ev.is_school_day);
      const isSchoolDay = hasLetivoEvent ? true : hasNaoLetivoEvent ? false : !isWeekend;

      days.push({
        date,
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isWeekend,
        isToday: dateStr === todayStr,
        events: dayEvents,
        isSchoolDay,
      });
    }

    return days;
  }, [currentDate, filteredEvents]);

  // Estatísticas do Ano
  const stats = useMemo(() => {
    const totalEvents = filteredEvents.length;
    const holidays = filteredEvents.filter((e) => !e.is_school_day).length;
    const specialSchoolDays = filteredEvents.filter((e) => e.is_school_day && e.category?.slug === "sabado-letivo").length;
    return {
      totalEvents,
      holidays,
      specialSchoolDays,
      totalTerms: terms.length,
    };
  }, [filteredEvents, terms.length]);

  return (
    <div className="space-y-6">
      {/* Barra de Filtros & Alternador de Visão */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Seletor de Mês & Navegação */}
          <div className="flex items-center gap-2">
            {visualMode === "mensal" && (
              <>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Mês Anterior"
                  className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-2xl min-w-[200px] justify-center">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Próximo Mês"
                  className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
                >
                  Hoje
                </button>
              </>
            )}

            {visualMode === "anual" && (
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-slate-900">
                  Visão Anual — Ano Letivo {schoolYear.year}
                </span>
                <span className="text-xs text-slate-500 font-medium">({schoolYear.title})</span>
              </div>
            )}

            {visualMode === "lista" && (
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-slate-900">
                  Cronograma de Eventos — {schoolYear.year}
                </span>
              </div>
            )}
          </div>

          {/* Alternador de Visões: Mensal / Anual / Lista */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl self-start md:self-auto border border-slate-200/60">
            <button
              type="button"
              onClick={() => setVisualMode("mensal")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                visualMode === "mensal"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mensal</span>
            </button>

            <button
              type="button"
              onClick={() => setVisualMode("anual")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                visualMode === "anual"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Anual</span>
            </button>

            <button
              type="button"
              onClick={() => setVisualMode("lista")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                visualMode === "lista"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
        </div>

        {/* Linha de Filtros Rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-slate-100 pt-3">
          {schoolYears && onSelectYear && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Ano Letivo
              </label>
              <select
                value={schoolYear.id}
                onChange={(e) => onSelectYear(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {schoolYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year} - {y.title} {y.is_current ? "(Atual)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filtrar Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filtrar Etapa / Período
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">Todas as Etapas</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Tipo de Dia
            </label>
            <select
              value={selectedDayType}
              onChange={(e) =>
                setSelectedDayType(e.target.value as "all" | "letivo" | "nao_letivo")
              }
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">Todos os Dias</option>
              <option value="letivo">Apenas Dias Letivos</option>
              <option value="nao_letivo">Apenas Dias Não Letivos / Recessos</option>
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* VISÃO 1: MENSAL (GRID TRADICIONAL 7 DIAS) */}
      {/* ============================================================================== */}
      {visualMode === "mensal" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-600 uppercase tracking-wider py-3">
            {WEEKDAY_NAMES.map((name, i) => (
              <div key={name} className={clsx(i === 0 || i === 6 ? "text-slate-400" : "text-slate-700")}>
                {name}
              </div>
            ))}
          </div>

          {/* Grid dos Dias do Mês */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100">
            {monthCalendarDays.map((day) => {
              const dayEvents = day.events;
              const hasEvents = dayEvents.length > 0;

              return (
                <div
                  key={day.dateStr}
                  onClick={() => {
                    if (hasEvents) {
                      setSelectedDayEvents({ dateStr: day.dateStr, events: dayEvents });
                    } else if (canManageAll || isSecretaria) {
                      onOpenCreateEventModal(day.dateStr);
                    }
                  }}
                  className={clsx(
                    "min-h-[105px] sm:min-h-[125px] p-2 transition-all flex flex-col justify-between cursor-pointer select-none relative group",
                    day.isCurrentMonth ? "bg-white" : "bg-slate-50/50 text-slate-400",
                    day.isWeekend && day.isCurrentMonth && "bg-slate-50/40",
                    day.isToday && "ring-2 ring-indigo-600 ring-inset bg-indigo-50/10"
                  )}
                >
                  {/* Topo do Dia: Número do Dia + Indicadores */}
                  <div className="flex items-center justify-between">
                    <span
                      className={clsx(
                        "w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-extrabold",
                        day.isToday
                          ? "bg-indigo-600 text-white shadow-xs"
                          : day.isCurrentMonth
                          ? day.isWeekend
                            ? "text-slate-400 font-medium"
                            : "text-slate-800"
                          : "text-slate-300 font-normal"
                      )}
                    >
                      {day.dayNumber}
                    </span>

                    {/* Indicador de Dia Letivo / Não Letivo */}
                    <div className="flex items-center gap-1">
                      {day.isCurrentMonth && (
                        <span
                          title={day.isSchoolDay ? "Dia Letivo" : "Dia Não Letivo"}
                          className={clsx(
                            "w-2 h-2 rounded-full",
                            day.isSchoolDay ? "bg-emerald-400" : "bg-slate-300"
                          )}
                        />
                      )}
                    </div>
                  </div>

                  {/* Lista de Eventos no Dia */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const color = ev.category?.color_hex || "#3B82F6";
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventDetail(ev);
                          }}
                          className="px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold truncate transition-transform hover:scale-[1.02] shadow-2xs cursor-pointer flex items-center gap-1"
                          style={{
                            backgroundColor: `${color}18`,
                            color: color,
                            borderLeft: `3px solid ${color}`,
                          }}
                        >
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}

                    {dayEvents.length > 2 && (
                      <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 pl-1">
                        +{dayEvents.length - 2} mais
                      </div>
                    )}
                  </div>

                  {/* Botão sutil de Adicionar Evento no hover (para gestores) */}
                  {(canManageAll || isSecretaria) && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                      <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5">
                        <Plus className="w-3 h-3" />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* VISÃO 2: ANUAL (GRID 12 MESES) */}
      {/* ============================================================================== */}
      {visualMode === "anual" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MONTH_NAMES.map((monthName, monthIndex) => {
            const yearNum = parseInt(schoolYear.year, 10) || new Date().getFullYear();
            const daysInM = new Date(yearNum, monthIndex + 1, 0).getDate();
            const firstD = new Date(yearNum, monthIndex, 1).getDay();

            // Eventos do mês
            const monthEvents = filteredEvents.filter((ev) => {
              const evStart = new Date(ev.start_date + "T00:00:00");
              const evEnd = new Date(ev.end_date + "T00:00:00");
              const mStart = new Date(yearNum, monthIndex, 1);
              const mEnd = new Date(yearNum, monthIndex + 1, 0);
              return evStart <= mEnd && evEnd >= mStart;
            });

            return (
              <div
                key={monthName}
                onClick={() => {
                  setCurrentDate(new Date(yearNum, monthIndex, 1));
                  setVisualMode("mensal");
                }}
                className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer space-y-3 group"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {monthName}
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {monthEvents.length} eventos
                  </span>
                </div>

                {/* Mini Grid de Dias */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                  {WEEKDAY_NAMES.map((w) => (
                    <span key={w} className="text-slate-400 font-semibold">
                      {w[0]}
                    </span>
                  ))}

                  {/* Espaçadores vazios */}
                  {Array.from({ length: firstD }).map((_, idx) => (
                    <span key={`empty-${idx}`} />
                  ))}

                  {/* Dias do mês */}
                  {Array.from({ length: daysInM }).map((_, dIdx) => {
                    const dayN = dIdx + 1;
                    const mStr = String(monthIndex + 1).padStart(2, "0");
                    const dStr = String(dayN).padStart(2, "0");
                    const fullDateStr = `${yearNum}-${mStr}-${dStr}`;

                    const hasEv = monthEvents.some(
                      (ev) => fullDateStr >= ev.start_date && fullDateStr <= ev.end_date
                    );
                    const isWeekend = new Date(yearNum, monthIndex, dayN).getDay() % 6 === 0;

                    return (
                      <span
                        key={`day-${dayN}`}
                        className={clsx(
                          "w-5 h-5 mx-auto rounded-full inline-flex items-center justify-center font-medium",
                          hasEv
                            ? "bg-indigo-600 text-white font-bold"
                            : isWeekend
                            ? "text-slate-400"
                            : "text-slate-700"
                        )}
                      >
                        {dayN}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================================== */}
      {/* VISÃO 3: LISTA CRONOLÓGICA / TIMELINE */}
      {/* ============================================================================== */}
      {visualMode === "lista" && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Todos os Eventos do Ano Letivo {schoolYear.year} ({filteredEvents.length})
            </h3>
            {(canManageAll || isSecretaria) && (
              <button
                type="button"
                onClick={() => onOpenCreateEventModal()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Evento</span>
              </button>
            )}
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Nenhum evento registrado</p>
              <p className="text-xs text-slate-500">
                Cadastre feriados, recessos e avaliações para visualizar o cronograma completo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEvents.map((ev) => {
                const color = ev.category?.color_hex || "#3B82F6";
                const isCreator = ev.created_by === currentUserId;
                const canEditThisEvent = canManageAll || (isSecretaria && isCreator);

                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEventDetail(ev)}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-2xl px-3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 mt-1 shadow-xs"
                        style={{ backgroundColor: color }}
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{ev.title}</span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                            style={{
                              backgroundColor: `${color}15`,
                              color: color,
                              borderColor: `${color}30`,
                            }}
                          >
                            {ev.category?.name || "Sem categoria"}
                          </span>
                          {ev.is_school_day ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Dia Letivo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Não Letivo
                            </span>
                          )}
                          {ev.academic_term && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {ev.academic_term.name}
                            </span>
                          )}
                        </div>

                        {ev.description && (
                          <p className="text-xs text-slate-600 max-w-xl">{ev.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                          <div className="flex items-center gap-1 font-semibold text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(ev.start_date + "T00:00:00").toLocaleDateString("pt-BR")}
                              {ev.end_date !== ev.start_date &&
                                ` a ${new Date(ev.end_date + "T00:00:00").toLocaleDateString("pt-BR")}`}
                            </span>
                          </div>

                          {!ev.is_full_day && ev.start_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {ev.start_time} {ev.end_time ? `às ${ev.end_time}` : ""}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{AUDIENCE_LABELS[ev.target_audience] || ev.target_audience}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {canEditThisEvent && (
                      <div
                        className="flex items-center gap-1 self-end sm:self-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onOpenEditEventModal(ev)}
                          title="Editar Evento"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEvent(ev.id, ev.title)}
                          title="Excluir Evento"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL: DETALHES DO EVENTO */}
      {/* ============================================================================== */}
      {selectedEventDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-start gap-3">
                <div
                  className="w-4 h-4 rounded-full mt-1 shrink-0 shadow-xs"
                  style={{
                    backgroundColor: selectedEventDetail.category?.color_hex || "#3B82F6",
                  }}
                />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {selectedEventDetail.title}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedEventDetail.category?.name || "Sem categoria"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEventDetail(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedEventDetail.description && (
              <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                {selectedEventDetail.description}
              </p>
            )}

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Data</span>
                </span>
                <span className="font-bold text-slate-900">
                  {new Date(selectedEventDetail.start_date + "T00:00:00").toLocaleDateString("pt-BR")}
                  {selectedEventDetail.end_date !== selectedEventDetail.start_date &&
                    ` a ${new Date(selectedEventDetail.end_date + "T00:00:00").toLocaleDateString("pt-BR")}`}
                </span>
              </div>

              {!selectedEventDetail.is_full_day && selectedEventDetail.start_time && (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Horário</span>
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedEventDetail.start_time}{" "}
                    {selectedEventDetail.end_time ? `às ${selectedEventDetail.end_time}` : ""}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>Classificação</span>
                </span>
                <span
                  className={clsx(
                    "font-bold",
                    selectedEventDetail.is_school_day ? "text-emerald-700" : "text-slate-600"
                  )}
                >
                  {selectedEventDetail.is_school_day ? "Dia Letivo" : "Dia Não Letivo / Recesso"}
                </span>
              </div>

              {selectedEventDetail.academic_term && (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Etapa Vinculada</span>
                  </span>
                  <span className="font-bold text-indigo-700">
                    {selectedEventDetail.academic_term.name}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Público</span>
                </span>
                <span className="font-bold text-slate-900">
                  {AUDIENCE_LABELS[selectedEventDetail.target_audience] ||
                    selectedEventDetail.target_audience}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              {(canManageAll || (isSecretaria && selectedEventDetail.created_by === currentUserId)) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const ev = selectedEventDetail;
                      setSelectedEventDetail(null);
                      onOpenEditEventModal(ev);
                    }}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ev = selectedEventDetail;
                      setSelectedEventDetail(null);
                      onDeleteEvent(ev.id, ev.title);
                    }}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setSelectedEventDetail(null)}
                className="px-4 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL: EVENTOS DO DIA (DRAWER / POPUP AO CLICAR NO DIA) */}
      {/* ============================================================================== */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Eventos em{" "}
                  {new Date(selectedDayEvents.dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
                <span className="text-xs text-slate-500">
                  {selectedDayEvents.events.length} evento(s) agendado(s)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {selectedDayEvents.events.map((ev) => {
                const color = ev.category?.color_hex || "#3B82F6";
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedDayEvents(null);
                      setSelectedEventDetail(ev);
                    }}
                    className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-100 cursor-pointer transition-colors space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {ev.title}
                      </span>
                    </div>
                    {ev.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 pl-5">{ev.description}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              {(canManageAll || isSecretaria) && (
                <button
                  type="button"
                  onClick={() => {
                    const d = selectedDayEvents.dateStr;
                    setSelectedDayEvents(null);
                    onOpenCreateEventModal(d);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo neste dia</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold ml-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
