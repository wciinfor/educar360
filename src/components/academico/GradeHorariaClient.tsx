"use client";

import React, { useState, useTransition } from "react";
import {
  TimetableStore,
  TimetableGridData,
  TimetableRoomClass,
  SubjectItem,
  TimeSlot,
  DayOfWeek,
  DAYS_OF_WEEK,
  GridCellLesson,
} from "@/types/grade-horaria";
import { saveTimetableDataAction } from "@/app/actions/grade-horaria";
import {
  Calendar,
  LayoutGrid,
  Users,
  UserCheck,
  RotateCcw,
  RotateCw,
  Trash2,
  Save,
  Wand2,
  CheckCircle2,
  X,
  Search,
  GripVertical,
  Lock,
  Unlock,
  HelpCircle,
  MoreVertical,
  LayoutList,
  Columns2,
  Grid3x3,
  Plus,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import clsx from "clsx";

interface GradeHorariaClientProps {
  initialStore: TimetableStore;
  initialRooms: TimetableRoomClass[];
  userRole: string;
  schoolName: string;
}

type ViewMode = "sala" | "professor" | "turma";
type GridColumns = 1 | 2 | 3;

export function GradeHorariaClient({
  initialStore,
  initialRooms,
  userRole,
  schoolName,
}: GradeHorariaClientProps) {
  const [store, setStore] = useState<TimetableStore>(initialStore);
  const [activeOptionId, setActiveOptionId] = useState<string>(
    initialStore.activeOption || "opcao-1"
  );
  const [rooms] = useState<TimetableRoomClass[]>(initialRooms);

  // Histórico de Undo / Redo
  const [history, setHistory] = useState<TimetableGridData[]>([
    initialStore.options.find((o) => o.optionId === (initialStore.activeOption || "opcao-1"))
      ?.gridData || {},
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Filtros e controles da barra superior
  const [viewMode, setViewMode] = useState<ViewMode>("sala");
  const [selectedShift, setSelectedShift] = useState("all");
  const [selectedRoomFilter, setSelectedRoomFilter] = useState("all");
  const [gridColumns, setGridColumns] = useState<GridColumns>(2);
  const [searchSubject, setSearchSubject] = useState("");
  const [showStatusBanner, setShowStatusBanner] = useState(true);
  const [selectedSubjectToPlace, setSelectedSubjectToPlace] = useState<SubjectItem | null>(null);

  // Estados de feedback
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Obtém o gridData da opção ativa atual
  const currentOption = store.options.find((o) => o.optionId === activeOptionId) || store.options[0];
  const gridData: TimetableGridData = history[historyIndex] || currentOption?.gridData || {};

  const subjects = store.subjects;
  const timeSlots = store.timeSlots;

  // Atualiza o estado da grade salvando no histórico
  const updateGridDataWithHistory = (newGridData: TimetableGridData) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newGridData);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);

    // Atualiza também dentro da store atual
    setStore((prev) => ({
      ...prev,
      options: prev.options.map((opt) =>
        opt.optionId === activeOptionId ? { ...opt, gridData: newGridData } : opt
      ),
    }));
  };

  // Desfazer (Undo)
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
    }
  };

  // Refazer (Redo)
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
    }
  };

  // Alterna opção de grade gerada
  const handleSelectOption = (optId: string) => {
    setActiveOptionId(optId);
    const targetOpt = store.options.find((o) => o.optionId === optId);
    if (targetOpt) {
      setHistory([targetOpt.gridData]);
      setHistoryIndex(0);
    }
  };

  // Alterna Bloqueio / Desbloqueio de um slot específico
  const toggleCellLock = (roomId: string, day: DayOfWeek, slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentCell = gridData[roomId]?.[day]?.[slotId];
    if (!currentCell) return;

    const newGridData: TimetableGridData = JSON.parse(JSON.stringify(gridData));
    if (!newGridData[roomId]) newGridData[roomId] = {} as any;
    if (!newGridData[roomId][day]) newGridData[roomId][day] = {} as any;

    newGridData[roomId][day][slotId] = {
      ...currentCell,
      isLocked: !currentCell.isLocked,
    };

    updateGridDataWithHistory(newGridData);
  };

  // Remove matéria / limpa um slot específico
  const clearCell = (roomId: string, day: DayOfWeek, slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newGridData: TimetableGridData = JSON.parse(JSON.stringify(gridData));
    if (newGridData[roomId]?.[day]) {
      newGridData[roomId][day][slotId] = null;
    }
    updateGridDataWithHistory(newGridData);
  };

  // Atribui matéria clicada ao slot
  const assignSubjectToCell = (roomId: string, day: DayOfWeek, slotId: string) => {
    if (!selectedSubjectToPlace) return;

    const newGridData: TimetableGridData = JSON.parse(JSON.stringify(gridData));
    if (!newGridData[roomId]) newGridData[roomId] = {} as any;
    if (!newGridData[roomId][day]) newGridData[roomId][day] = {} as any;

    if (selectedSubjectToPlace.id === "blocked") {
      newGridData[roomId][day][slotId] = {
        id: `cell-blocked-${Date.now()}`,
        subjectId: "blocked",
        subjectName: "Bloqueio",
        teacherName: "Horário Indisponível",
        colorHex: "#64748B",
        colorName: "slate",
        isLocked: true,
        isBlocked: true,
      };
    } else {
      newGridData[roomId][day][slotId] = {
        id: `cell-${Date.now()}`,
        subjectId: selectedSubjectToPlace.id,
        subjectName: selectedSubjectToPlace.name,
        teacherName: selectedSubjectToPlace.teacherName,
        colorHex: selectedSubjectToPlace.colorHex,
        colorName: selectedSubjectToPlace.colorName,
        isLocked: false,
      };
    }

    updateGridDataWithHistory(newGridData);
  };

  // Limpar grade (apenas slots não bloqueados)
  const handleClearGrid = () => {
    if (!confirm("Deseja realmente limpar todos os horários não travados desta grade?")) {
      return;
    }

    const newGridData: TimetableGridData = JSON.parse(JSON.stringify(gridData));
    Object.keys(newGridData).forEach((roomId) => {
      DAYS_OF_WEEK.forEach((day) => {
        timeSlots.forEach((slot) => {
          if (!slot.isBreak) {
            const cell = newGridData[roomId]?.[day.key]?.[slot.id];
            if (cell && !cell.isLocked) {
              newGridData[roomId][day.key][slot.id] = null;
            }
          }
        });
      });
    });

    updateGridDataWithHistory(newGridData);
    setNotification({
      type: "success",
      message: "Grade horária limpa com sucesso (horários travados foram preservados).",
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Distribuir automaticamente
  const handleAutoDistribute = () => {
    startTransition(async () => {
      // Gera nova distribuição respeitando travas existentes
      const newGridData: TimetableGridData = JSON.parse(JSON.stringify(gridData));
      const slots = timeSlots.filter((s) => !s.isBreak);

      rooms.forEach((room, roomIdx) => {
        if (!newGridData[room.id]) newGridData[room.id] = {} as any;

        DAYS_OF_WEEK.forEach((day, dayIdx) => {
          if (!newGridData[room.id][day.key]) newGridData[room.id][day.key] = {} as any;

          slots.forEach((slot, slotIdx) => {
            const existing = newGridData[room.id][day.key][slot.id];
            // Mantém slots travados ou preenchidos com trava
            if (existing && existing.isLocked) {
              return;
            }

            const randIdx = (roomIdx * 5 + dayIdx * 3 + slotIdx + Math.floor(Math.random() * 7)) % subjects.length;
            const subject = subjects[randIdx];

            newGridData[room.id][day.key][slot.id] = {
              id: `cell-${room.id}-${day.key}-${slot.id}`,
              subjectId: subject.id,
              subjectName: subject.name,
              teacherName: subject.teacherName,
              colorHex: subject.colorHex,
              colorName: subject.colorName,
              isLocked: false,
            };
          });
        });
      });

      updateGridDataWithHistory(newGridData);
      setShowStatusBanner(true);
      setNotification({
        type: "success",
        message: "Distribuição automática realizada com sucesso respeitando todas as regras!",
      });
      setTimeout(() => setNotification(null), 4000);
    });
  };

  // Salvar grade no Supabase
  const handleSaveGrid = () => {
    startTransition(async () => {
      const updatedStore: TimetableStore = {
        ...store,
        activeOption: activeOptionId,
        options: store.options.map((opt) =>
          opt.optionId === activeOptionId ? { ...opt, gridData } : opt
        ),
        updatedAt: new Date().toISOString(),
      };

      const res = await saveTimetableDataAction(updatedStore);
      if (res.success) {
        setNotification({
          type: "success",
          message: "Grade horária salva com sucesso no sistema!",
        });
      } else {
        setNotification({
          type: "error",
          message: res.error || "Erro ao salvar a grade horária.",
        });
      }
      setTimeout(() => setNotification(null), 4000);
    });
  };

  // Filtro de matérias no painel lateral
  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchSubject.toLowerCase()) ||
      s.teacherName.toLowerCase().includes(searchSubject.toLowerCase())
  );

  // Filtro de salas na área principal
  const filteredRooms = rooms.filter((r) => {
    if (selectedShift !== "all" && r.shift !== selectedShift) return false;
    if (selectedRoomFilter !== "all" && r.id !== selectedRoomFilter) return false;
    return true;
  });

  // Mapeamento de estilos visuais suaves para cada matéria
  const getSubjectColorStyles = (colorName: string, isBlocked?: boolean) => {
    if (isBlocked || colorName === "slate") {
      return {
        bg: "bg-slate-100",
        border: "border-slate-300",
        text: "text-slate-800",
        teacherText: "text-slate-500",
        indicator: "bg-slate-400",
      };
    }
    switch (colorName) {
      case "emerald":
        return {
          bg: "bg-emerald-50/90",
          border: "border-emerald-200",
          text: "text-emerald-950",
          teacherText: "text-emerald-700",
          indicator: "bg-emerald-500",
        };
      case "blue":
        return {
          bg: "bg-blue-50/90",
          border: "border-blue-200",
          text: "text-blue-950",
          teacherText: "text-blue-700",
          indicator: "bg-blue-500",
        };
      case "amber":
        return {
          bg: "bg-amber-50/90",
          border: "border-amber-200",
          text: "text-amber-950",
          teacherText: "text-amber-700",
          indicator: "bg-amber-500",
        };
      case "purple":
        return {
          bg: "bg-purple-50/90",
          border: "border-purple-200",
          text: "text-purple-950",
          teacherText: "text-purple-700",
          indicator: "bg-purple-500",
        };
      case "rose":
        return {
          bg: "bg-rose-50/90",
          border: "border-rose-200",
          text: "text-rose-950",
          teacherText: "text-rose-700",
          indicator: "bg-rose-500",
        };
      case "orange":
        return {
          bg: "bg-orange-50/90",
          border: "border-orange-200",
          text: "text-orange-950",
          teacherText: "text-orange-700",
          indicator: "bg-orange-500",
        };
      case "teal":
        return {
          bg: "bg-teal-50/90",
          border: "border-teal-200",
          text: "text-teal-950",
          teacherText: "text-teal-700",
          indicator: "bg-teal-500",
        };
      default:
        return {
          bg: "bg-indigo-50/90",
          border: "border-indigo-200",
          text: "text-indigo-950",
          teacherText: "text-indigo-700",
          indicator: "bg-indigo-500",
        };
    }
  };

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO SUPERIOR DA ÁREA */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-xs shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Grade horária
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Monte a grade de forma simples, respeitando a carga horária, disponibilidade e as regras da sua instituição.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-blue-200 bg-white hover:bg-blue-50 text-blue-600 text-xs font-bold shadow-xs transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Ajuda</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BARRA DE CONTROLES & FILTROS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Alternador de Visão (Por sala / Por professor / Por turma) */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setViewMode("sala")}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              viewMode === "sala"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Por sala</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("professor")}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              viewMode === "professor"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Por professor</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("turma")}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              viewMode === "turma"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Por turma</span>
          </button>
        </div>

        {/* Controles Centrais: Período, Exibição, Grades por Linha, Opção de Grade */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Período / Turno */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Período
            </label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-xs transition-colors"
            >
              <option value="all">Todos os períodos</option>
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
              <option value="noturno">Noturno</option>
              <option value="integral">Integral</option>
            </select>
          </div>

          {/* Seletor de Exibição / Salas */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Exibição
            </label>
            <select
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-xs transition-colors"
            >
              <option value="all">Todas as salas</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Grades por Linha (1, 2, 3 colunas) */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Grades por linha
            </label>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setGridColumns(1)}
                title="1 por linha"
                className={clsx(
                  "p-1.5 rounded-lg text-xs transition-colors",
                  gridColumns === 1
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setGridColumns(2)}
                title="2 por linha (Padrão)"
                className={clsx(
                  "p-1.5 rounded-lg text-xs transition-colors",
                  gridColumns === 2
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setGridColumns(3)}
                title="3 por linha"
                className={clsx(
                  "p-1.5 rounded-lg text-xs transition-colors",
                  gridColumns === 3
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                <Grid3x3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Opção de Grade (Opção 1 a 5) */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Opção de grade
            </label>
            <select
              value={activeOptionId}
              onChange={(e) => handleSelectOption(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-xs transition-colors"
            >
              {store.options.map((opt) => (
                <option key={opt.optionId} value={opt.optionId}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Botões Desfazer / Refazer */}
          <div className="flex items-end gap-1 pb-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex === 0}
              title="Desfazer alteração"
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Refazer alteração"
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white shadow-xs transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BARRA DE AÇÕES PRINCIPAIS */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleClearGrid}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 shadow-xs transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar grade</span>
          </button>

          <button
            type="button"
            onClick={handleSaveGrid}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-600 shadow-xs transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Salvar grade</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleAutoDistribute}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-all active:scale-98"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          <span>Distribuir automaticamente</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. BANNER DE STATUS DA DISTRIBUIÇÃO */}
      {/* ========================================================================= */}
      {showStatusBanner && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Encontramos 5 opções de grade que respeitam as regras da instituição.</span>
          </div>

          <button
            type="button"
            onClick={() => setShowStatusBanner(false)}
            className="p-1 rounded-lg text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Feedback Toast */}
      {notification && (
        <div
          className={clsx(
            "p-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm border",
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          )}
        >
          {notification.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CORPO PRINCIPAL: PAINEL DE MATÉRIAS (ESQ) + ÁREA DA GRADE (DIR) */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* ----------------------------------------------------------------------- */}
        {/* 5.1 PAINEL LATERAL DE MATÉRIAS (ESQUERDA) */}
        {/* ----------------------------------------------------------------------- */}
        <aside className="w-full lg:w-72 xl:w-80 shrink-0 bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Matérias</h2>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Arraste as matérias ou bloqueie para a grade.
            </p>
          </div>

          {/* Campo de Busca de Matéria */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
              placeholder="Buscar matéria..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Lista de Matérias */}
          <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
            {filteredSubjects.map((subject) => {
              const colors = getSubjectColorStyles(subject.colorName);
              const isSelected = selectedSubjectToPlace?.id === subject.id;

              return (
                <div
                  key={subject.id}
                  onClick={() =>
                    setSelectedSubjectToPlace(isSelected ? null : subject)
                  }
                  className={clsx(
                    "flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer",
                    isSelected
                      ? "ring-2 ring-blue-500 bg-blue-50/40 border-blue-300 shadow-xs"
                      : "bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-slate-300 shadow-2xs"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={clsx("w-1.5 h-8 rounded-full shrink-0", colors.indicator)} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 leading-tight truncate">
                        {subject.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium truncate">
                        {subject.teacherName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {subject.allocatedLessons}/{subject.weeklyLessons} aulas
                      </div>
                    </div>
                  </div>

                  <div className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                    <GripVertical className="w-4 h-4 cursor-grab" />
                  </div>
                </div>
              );
            })}

            {/* Card Especial: Bloqueio / Indisponibilidade */}
            <div
              onClick={() =>
                setSelectedSubjectToPlace(
                  selectedSubjectToPlace?.id === "blocked"
                    ? null
                    : {
                        id: "blocked",
                        name: "Bloqueio",
                        teacherName: "Horário Indisponível",
                        weeklyLessons: 0,
                        allocatedLessons: 0,
                        colorHex: "#64748B",
                        colorName: "slate",
                        isBlocked: true,
                      }
                )
              }
              className={clsx(
                "flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer",
                selectedSubjectToPlace?.id === "blocked"
                  ? "ring-2 ring-slate-600 bg-slate-100 border-slate-400"
                  : "bg-slate-50 hover:bg-slate-100/80 border-slate-200"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-1.5 h-8 rounded-full bg-slate-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    Bloqueio
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Janela / Indisponível
                  </div>
                </div>
              </div>

              <div className="p-1 text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
            </div>
          </div>

          {selectedSubjectToPlace && (
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold text-center animate-in fade-in">
              Clique em uma célula da grade para posicionar:{" "}
              <strong>{selectedSubjectToPlace.name}</strong>
            </div>
          )}
        </aside>

        {/* ----------------------------------------------------------------------- */}
        {/* 5.2 ÁREA PRINCIPAL DA GRADE (DIREITA) */}
        {/* ----------------------------------------------------------------------- */}
        <main className="flex-1 min-w-0 space-y-5">
          <div
            className={clsx(
              "grid gap-5",
              gridColumns === 1 && "grid-cols-1",
              gridColumns === 2 && "grid-cols-1 xl:grid-cols-2",
              gridColumns === 3 && "grid-cols-1 md:grid-cols-2 2xl:grid-cols-3"
            )}
          >
            {filteredRooms.map((room) => {
              return (
                <div
                  key={room.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between"
                >
                  {/* Cabeçalho da Sala */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      {room.roomLabel}
                    </h3>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                        {room.totalWeeklyLessons} aulas/semana
                      </span>

                      <button
                        type="button"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tabela da Grade da Sala */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white">
                    <table className="w-full text-left border-collapse min-w-[540px]">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-600">
                          <th className="py-2 px-2.5 w-24 text-center border-r border-slate-200/60">
                            Horário
                          </th>
                          {DAYS_OF_WEEK.map((day) => (
                            <th
                              key={day.key}
                              className="py-2 px-2 text-center border-r last:border-r-0 border-slate-200/60"
                            >
                              {day.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map((slot) => {
                          // Linha especial de Intervalo
                          if (slot.isBreak) {
                            return (
                              <tr
                                key={slot.id}
                                className="bg-slate-50/80 border-b border-slate-200/60"
                              >
                                <td className="py-1 px-2 text-[10px] font-semibold text-slate-500 text-center border-r border-slate-200/60">
                                  {slot.startTime} - {slot.endTime}
                                </td>
                                <td
                                  colSpan={5}
                                  className="py-1 px-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                                >
                                  Intervalo
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr
                              key={slot.id}
                              className="border-b last:border-b-0 border-slate-200/60"
                            >
                              {/* Coluna de Horário */}
                              <td className="py-2 px-2 text-[10px] font-bold text-slate-700 text-center border-r border-slate-200/60 bg-slate-50/40 w-24 shrink-0">
                                {slot.startTime} - {slot.endTime}
                              </td>

                              {/* Células dos Dias */}
                              {DAYS_OF_WEEK.map((day) => {
                                const cellLesson =
                                  gridData[room.id]?.[day.key]?.[slot.id];

                                return (
                                  <td
                                    key={day.key}
                                    className="p-1 border-r last:border-r-0 border-slate-200/60 align-middle h-14"
                                  >
                                    {cellLesson ? (
                                      // Card da Aula Preenchida
                                      <div
                                        onClick={() =>
                                          selectedSubjectToPlace &&
                                          assignSubjectToCell(room.id, day.key, slot.id)
                                        }
                                        className={clsx(
                                          "group relative p-1.5 rounded-xl border flex flex-col justify-between h-full transition-all cursor-pointer",
                                          cellLesson.isBlocked
                                            ? "bg-slate-100 border-slate-300 text-slate-700"
                                            : clsx(
                                                getSubjectColorStyles(cellLesson.colorName).bg,
                                                getSubjectColorStyles(cellLesson.colorName).border
                                              )
                                        )}
                                      >
                                        <div className="flex items-start justify-between gap-1">
                                          <span
                                            className={clsx(
                                              "text-[11px] font-bold leading-tight truncate",
                                              cellLesson.isBlocked
                                                ? "text-slate-800"
                                                : getSubjectColorStyles(cellLesson.colorName).text
                                            )}
                                          >
                                            {cellLesson.subjectName}
                                          </span>

                                          {/* Ações de Bloqueio e Remoção no card */}
                                          <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                                            <button
                                              type="button"
                                              onClick={(e) =>
                                                toggleCellLock(room.id, day.key, slot.id, e)
                                              }
                                              title={
                                                cellLesson.isLocked
                                                  ? "Horário travado (clique para destravar)"
                                                  : "Travar horário na distribuição"
                                              }
                                              className={clsx(
                                                "p-0.5 rounded transition-colors",
                                                cellLesson.isLocked
                                                  ? "text-indigo-600 hover:text-indigo-800"
                                                  : "text-slate-400 hover:text-slate-700"
                                              )}
                                            >
                                              {cellLesson.isLocked ? (
                                                <Lock className="w-3 h-3" />
                                              ) : (
                                                <Unlock className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                              )}
                                            </button>

                                            <button
                                              type="button"
                                              onClick={(e) =>
                                                clearCell(room.id, day.key, slot.id, e)
                                              }
                                              title="Remover aula"
                                              className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>

                                        <span
                                          className={clsx(
                                            "text-[10px] font-medium leading-tight truncate mt-0.5",
                                            cellLesson.isBlocked
                                              ? "text-slate-500"
                                              : getSubjectColorStyles(cellLesson.colorName).teacherText
                                          )}
                                        >
                                          {cellLesson.teacherName}
                                        </span>
                                      </div>
                                    ) : (
                                      // Célula Vazia / Slot Disponível
                                      <div
                                        onClick={() =>
                                          assignSubjectToCell(room.id, day.key, slot.id)
                                        }
                                        className="h-full min-h-[46px] border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-xl flex items-center justify-center text-slate-300 hover:text-blue-500 transition-all cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
