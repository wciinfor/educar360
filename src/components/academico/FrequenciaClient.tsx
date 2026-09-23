"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  SchoolClass,
  ClassLesson,
  AttendanceStatus,
  ACADEMIC_PERIODS,
  ClassAttendanceConsolidatedReport,
} from "@/types/academico";
import {
  getClassLessonsAction,
  getClassLessonAttendancesAction,
  saveLessonAttendancesAction,
  getClassAttendanceConsolidatedAction,
} from "@/app/actions/academico";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Calendar,
  Search,
  Filter,
  Users,
  Loader2,
  Save,
  Printer,
  FileSpreadsheet,
  FileText,
  UserCheck,
  UserX,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Percent,
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

interface FrequenciaClientProps {
  initialClasses: SchoolClass[];
  userRole: string;
  userName: string;
}

type ViewMode = "lancamento" | "consolidado";

export function FrequenciaClient({ initialClasses, userRole, userName }: FrequenciaClientProps) {
  const searchParams = useSearchParams();
  const initialClassParam = searchParams.get("classId");
  const initialLessonParam = searchParams.get("lessonId");

  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassParam && initialClasses.some((c) => c.id === initialClassParam)
      ? initialClassParam
      : initialClasses.length > 0
      ? initialClasses[0].id
      : ""
  );

  const [viewMode, setViewMode] = useState<ViewMode>("lancamento");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  // Estado para modo Lançamento por Aula
  const [lessons, setLessons] = useState<ClassLesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(initialLessonParam || "");
  const [loadingLessons, setLoadingLessons] = useState(false);

  // Lista de chamada dos alunos
  const [studentsAttendance, setStudentsAttendance] = useState<
    Array<{
      student_id: string;
      enrollment_id: string;
      student_name: string;
      student_cpf: string | null;
      status: AttendanceStatus;
      justification_reason: string;
    }>
  >([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Estado para modo Relatório Consolidado
  const [consolidatedReport, setConsolidatedReport] = useState<ClassAttendanceConsolidatedReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Carrega as aulas da turma para seleção no lançamento
  const loadLessons = async (classId: string) => {
    if (!classId) return;
    setLoadingLessons(true);
    try {
      const res = await getClassLessonsAction({ class_id: classId });
      if (res.success) {
        const list = res.lessons || [];
        setLessons(list);
        if (list.length > 0) {
          // Se houver parâmetro na URL, seleciona a aula especificada; senão a primeira aula
          if (initialLessonParam && list.some((l) => l.id === initialLessonParam)) {
            setSelectedLessonId(initialLessonParam);
          } else if (!selectedLessonId || !list.some((l) => l.id === selectedLessonId)) {
            setSelectedLessonId(list[0].id);
          }
        } else {
          setSelectedLessonId("");
          setStudentsAttendance([]);
        }
      }
    } catch {
      // Ignora
    } finally {
      setLoadingLessons(false);
    }
  };

  // 2. Carrega a lista de chamada dos alunos da aula selecionada
  const loadStudentsAttendance = async (classId: string, lessonId?: string) => {
    if (!classId) return;
    setLoadingStudents(true);
    setActionError(null);
    try {
      const res = await getClassLessonAttendancesAction(classId, lessonId || undefined);
      if (res.success) {
        setStudentsAttendance(
          res.students.map((s) => ({
            student_id: s.student_id,
            enrollment_id: s.enrollment_id,
            student_name: s.student_name,
            student_cpf: s.student_cpf,
            status: s.status,
            justification_reason: s.justification_reason || "",
          }))
        );
      } else {
        setActionError(res.error || "Erro ao carregar lista de chamada dos alunos.");
      }
    } catch (err: any) {
      setActionError(err?.message || "Erro inesperado ao buscar chamada.");
    } finally {
      setLoadingStudents(false);
    }
  };

  // 3. Carrega o relatório consolidado de frequências
  const loadConsolidatedReport = async (classId: string, period?: string) => {
    if (!classId) return;
    setLoadingReport(true);
    setActionError(null);
    try {
      const res = await getClassAttendanceConsolidatedAction(classId, period);
      if (res.success && res.report) {
        setConsolidatedReport(res.report);
      } else {
        setActionError(res.error || "Erro ao gerar consolidado de frequências.");
      }
    } catch (err: any) {
      setActionError(err?.message || "Erro ao buscar relatório.");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      loadLessons(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (viewMode === "lancamento" && selectedClassId) {
      loadStudentsAttendance(selectedClassId, selectedLessonId);
    } else if (viewMode === "consolidado" && selectedClassId) {
      loadConsolidatedReport(selectedClassId, selectedPeriod);
    }
  }, [viewMode, selectedClassId, selectedLessonId, selectedPeriod]);

  const selectedClass = initialClasses.find((c) => c.id === selectedClassId);
  const selectedLesson = lessons.find((l) => l.id === selectedLessonId);

  // Ações de alteração de presença
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudentsAttendance((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  const handleJustificationChange = (studentId: string, reason: string) => {
    setStudentsAttendance((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, justification_reason: reason } : s))
    );
  };

  // Marca todos como presentes
  const handleMarkAllPresent = () => {
    setStudentsAttendance((prev) =>
      prev.map((s) => ({ ...s, status: "presente" as AttendanceStatus }))
    );
  };

  // Salvar chamada
  const handleSaveAttendance = async () => {
    if (!selectedLessonId) {
      setActionError("Selecione ou registre uma aula para lançar a frequência.");
      return;
    }

    setActionError(null);
    startTransition(async () => {
      const payload = {
        lesson_id: selectedLessonId,
        attendances: studentsAttendance.map((s) => ({
          student_id: s.student_id,
          enrollment_id: s.enrollment_id,
          status: s.status,
          justification_reason: s.justification_reason,
        })),
      };

      const res = await saveLessonAttendancesAction(payload);
      if (res.success) {
        setActionSuccess(res.message || "Frequência salva com sucesso!");
        await loadLessons(selectedClassId);
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setActionError(res.error || "Erro ao salvar frequência.");
      }
    });
  };

  // Cálculos do lançamento atual
  const totalStudents = studentsAttendance.length;
  const presentCount = studentsAttendance.filter((s) => s.status === "presente").length;
  const absentCount = studentsAttendance.filter((s) => s.status === "falta").length;
  const justifiedCount = studentsAttendance.filter((s) => s.status === "justificada").length;
  const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + justifiedCount) / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Feedback Notifications */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs sm:text-sm shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs sm:text-sm shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Header Institucional da Frequência */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-2">
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Controle de Frequência Escolar</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Chamadas & Relatórios de Presença
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Lançamento pontual de presenças por aula e visualização consolidada do índice de assiduidade por turma.
          </p>
        </div>

        {/* Alternador de Modo de Visualização */}
        <div className="flex items-center p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("lancamento")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              viewMode === "lancamento"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Lançar por Aula
          </button>
          <button
            type="button"
            onClick={() => setViewMode("consolidado")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              viewMode === "consolidado"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Consolidado da Turma
          </button>
        </div>
      </div>

      {/* Controles de Turma & Filtros */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Seletor de Turma */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Turma Selecionada *
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              {initialClasses.length === 0 ? (
                <option value="">Nenhuma turma disponível</option>
              ) : (
                initialClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.academic_year} • {c.shift})
                  </option>
                ))
              )}
            </select>
          </div>

          {viewMode === "lancamento" ? (
            /* Seletor de Aula para Lançamento */
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Aula Registrada no Diário *
              </label>
              {lessons.length === 0 ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    value="Nenhuma aula registrada nesta turma ainda"
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-400"
                  />
                  <Link
                    href={`/app/academico/diario`}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap shadow-xs"
                  >
                    + Criar Aula
                  </Link>
                </div>
              ) : (
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {new Date(l.lesson_date + "T12:00:00").toLocaleDateString("pt-BR")} &bull; {l.title} ({l.academic_period}{l.subject_name ? ` • ${l.subject_name}` : ""})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            /* Seletor de Período para Relatório */
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Período de Análise
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="all">Ano Letivo Completo (Todos os Períodos)</option>
                {ACADEMIC_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* MODO 1: LANÇAMENTO DE FREQUÊNCIA POR AULA */}
      {/* ======================================================================= */}
      {viewMode === "lancamento" && (
        <div className="space-y-6">
          {selectedLesson && (
            /* Card com Resumo da Aula Selecionada & Métricas da Chamada */
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {selectedLesson.academic_period}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Data: <strong>{new Date(selectedLesson.lesson_date + "T12:00:00").toLocaleDateString("pt-BR")}</strong>
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedLesson.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Marcar Todos Presentes</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={isPending || studentsAttendance.length === 0}
                    className="px-5 py-2 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando chamada...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Salvar Frequência</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Indicadores de Presença da Aula */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">Total de Alunos</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalStudents}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-center">
                  <div className="text-[11px] font-semibold text-emerald-700">Presentes</div>
                  <div className="text-2xl font-extrabold text-emerald-800 mt-0.5">{presentCount}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/70 text-center">
                  <div className="text-[11px] font-semibold text-rose-700">Faltas</div>
                  <div className="text-2xl font-extrabold text-rose-800 mt-0.5">{absentCount}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/70 text-center">
                  <div className="text-[11px] font-semibold text-amber-700">Justificadas</div>
                  <div className="text-2xl font-extrabold text-amber-800 mt-0.5">{justifiedCount}</div>
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Chamada */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lista de Alunos da Turma</h3>
                <p className="text-[11px] text-slate-400">Marque a situação individual de cada estudante</p>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {studentsAttendance.length} estudante(s)
              </span>
            </div>

            {loadingStudents ? (
              <div className="p-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Carregando lista de chamada dos alunos...</p>
              </div>
            ) : studentsAttendance.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">Nenhum Aluno Matriculado nesta Turma</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Para realizar a chamada, enturme os estudantes matriculados através do módulo de Matrículas.
                </p>
                <Link
                  href="/app/matriculas"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs"
                >
                  <span>Ir para Matrículas</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {studentsAttendance.map((student, idx) => (
                  <div
                    key={student.student_id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-xs font-bold text-slate-400 text-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {student.student_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {student.student_name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {student.student_cpf ? `CPF: ${student.student_cpf}` : "Matrícula confirmada"}
                        </div>
                      </div>
                    </div>

                    {/* Controles de Status da Presença */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                      <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.student_id, "presente")}
                          className={clsx(
                            "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                            student.status === "presente"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Presente</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.student_id, "falta")}
                          className={clsx(
                            "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                            student.status === "falta"
                              ? "bg-rose-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Falta</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.student_id, "justificada")}
                          className={clsx(
                            "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                            student.status === "justificada"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Justificada</span>
                        </button>
                      </div>

                      {/* Campo de Justificativa (Apenas se status for justificada) */}
                      {student.status === "justificada" && (
                        <input
                          type="text"
                          value={student.justification_reason}
                          onChange={(e) => handleJustificationChange(student.student_id, e.target.value)}
                          placeholder="Motivo / Atestado médico..."
                          className="w-full sm:w-56 px-3 py-1.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODO 2: RELATÓRIO CONSOLIDADO DE FREQUÊNCIA DA TURMA */}
      {/* ======================================================================= */}
      {viewMode === "consolidado" && (
        <div className="space-y-6">
          {loadingReport ? (
            <div className="bg-white p-16 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Calculando assiduidade e frequências da turma...</p>
            </div>
          ) : !consolidatedReport ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Nenhum dado de frequência encontrado</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Registre aulas e realize chamadas para gerar os indicadores consolidados de assiduidade.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header do Consolidado */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    Turma: <strong className="text-slate-900">{consolidatedReport.school_class.name}</strong> ({consolidatedReport.school_class.academic_year})
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    Assiduidade Geral: {consolidatedReport.period}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total de {consolidatedReport.total_lessons} aula(s) registrada(s) no período
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500">Taxa Média de Presença</div>
                    <div className="text-2xl font-extrabold text-emerald-700">
                      {consolidatedReport.overall_attendance_rate}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela de Alunos com Percentuais */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Detalhamento por Estudante</h4>
                  <span className="text-xs text-slate-500 font-medium">
                    {consolidatedReport.students_summary.length} aluno(s)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold text-[11px]">
                        <th className="py-3.5 px-6">Aluno</th>
                        <th className="py-3.5 px-4 text-center">Aulas</th>
                        <th className="py-3.5 px-4 text-center text-emerald-700">Presenças</th>
                        <th className="py-3.5 px-4 text-center text-rose-700">Faltas</th>
                        <th className="py-3.5 px-4 text-center text-amber-700">Justificadas</th>
                        <th className="py-3.5 px-6 text-right">Índice de Presença</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {consolidatedReport.students_summary.map((st, idx) => (
                        <tr key={st.student_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-bold text-slate-400 w-4">{idx + 1}</span>
                              <div>
                                <div className="font-bold text-slate-900 text-xs">{st.student_name}</div>
                                {st.student_cpf && <div className="text-[10px] text-slate-400 font-mono">{st.student_cpf}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-800">{st.total_lessons}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{st.presences}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-rose-600">{st.absences}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-amber-600">{st.justified}</td>
                          <td className="py-3.5 px-6 text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  style={{ width: `${st.attendance_percentage}%` }}
                                  className={clsx(
                                    "h-full rounded-full",
                                    st.attendance_percentage >= 75 ? "bg-emerald-500" : "bg-rose-500"
                                  )}
                                />
                              </div>
                              <span
                                className={clsx(
                                  "font-extrabold text-xs px-2 py-0.5 rounded-lg",
                                  st.attendance_percentage >= 75
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-rose-50 text-rose-700"
                                )}
                              >
                                {st.attendance_percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
