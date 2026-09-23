"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  SchoolClass,
  AcademicAssessment,
  AssessmentType,
  ASSESSMENT_TYPE_LABELS,
  ACADEMIC_PERIODS,
  StudentAssessmentGrade,
  AcademicPeriodClosing,
  AcademicSettings,
  SaveAssessmentInput,
  SaveStudentGradesInput,
} from "@/types/academico";
import {
  getAcademicAssessmentsAction,
  saveAcademicAssessmentAction,
  deleteAcademicAssessmentAction,
  getAssessmentGradesAction,
  saveAssessmentGradesAction,
  togglePeriodClosingAction,
  getPeriodClosingsAction,
  saveAcademicSettingsAction,
} from "@/app/actions/academico";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Users,
  Loader2,
  Save,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Settings,
  CheckSquare,
  Sparkles,
  ChevronRight,
  Calculator,
  Sliders,
  AlertTriangle,
  X,
  FileSpreadsheet,
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

interface AvaliacoesClientProps {
  initialClasses: SchoolClass[];
  initialSettings: AcademicSettings;
  userRole: string;
  userName: string;
}

type TabMode = "avaliacoes" | "notas" | "fechamento";

export function AvaliacoesClient({
  initialClasses,
  initialSettings,
  userRole,
  userName,
}: AvaliacoesClientProps) {
  const searchParams = useSearchParams();
  const initialClassParam = searchParams.get("classId");
  const initialAssessmentParam = searchParams.get("assessmentId");

  const [activeTab, setActiveTab] = useState<TabMode>(
    initialAssessmentParam ? "notas" : "avaliacoes"
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassParam && initialClasses.some((c) => c.id === initialClassParam)
      ? initialClassParam
      : initialClasses.length > 0
      ? initialClasses[0].id
      : ""
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string>("1º Bimestre");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Estados de dados
  const [assessments, setAssessments] = useState<AcademicAssessment[]>([]);
  const [closings, setClosings] = useState<AcademicPeriodClosing[]>([]);
  const [settings, setSettings] = useState<AcademicSettings>(initialSettings);
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estado para aba de Lançamento de Notas
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(
    initialAssessmentParam || ""
  );
  const [activeAssessment, setActiveAssessment] = useState<AcademicAssessment | null>(null);
  const [gradesRoster, setGradesRoster] = useState<
    (StudentAssessmentGrade & { student_name: string; student_cpf?: string | null })[]
  >([]);
  const [isAssessmentLocked, setIsAssessmentLocked] = useState<boolean>(false);
  const [loadingGrades, setLoadingGrades] = useState<boolean>(false);
  const [savingGrades, setSavingGrades] = useState<boolean>(false);

  // Estado do Modal de Avaliação
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAssessment, setEditingAssessment] = useState<AcademicAssessment | null>(null);
  const [savingAssessment, setSavingAssessment] = useState<boolean>(false);
  const [formData, setFormData] = useState<SaveAssessmentInput>({
    class_id: selectedClassId,
    subject_name: "",
    academic_period: selectedPeriod,
    title: "",
    description: "",
    assessment_date: new Date().toISOString().split("T")[0],
    assessment_type: "prova",
    max_score: 10,
    weight: 1,
  });

  // Estado de Configurações
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsForm, setSettingsForm] = useState<AcademicSettings>(initialSettings);

  const [isPending, startTransition] = useTransition();

  const isStaff = ["admin_escola", "coordenacao", "secretaria"].includes(userRole);
  const currentClass = initialClasses.find((c) => c.id === selectedClassId);

  // Carrega avaliações e fechamentos ao alterar turma ou período
  useEffect(() => {
    if (!selectedClassId) return;

    async function loadData() {
      setLoading(true);
      try {
        const [assessRes, closingsRes] = await Promise.all([
          getAcademicAssessmentsAction({
            classId: selectedClassId,
            academicPeriod: selectedPeriod,
          }),
          getPeriodClosingsAction(selectedClassId),
        ]);

        if (assessRes.success && assessRes.assessments) {
          setAssessments(assessRes.assessments);
        } else {
          setAssessments([]);
        }

        if (closingsRes.success && closingsRes.closings) {
          setClosings(closingsRes.closings);
        }
      } catch (err: any) {
        setFeedback({ type: "error", text: "Erro ao sincronizar dados da turma." });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedClassId, selectedPeriod]);

  // Carrega lista de notas quando uma avaliação é selecionada
  useEffect(() => {
    if (!selectedAssessmentId) {
      setActiveAssessment(null);
      setGradesRoster([]);
      return;
    }

    async function loadGrades() {
      setLoadingGrades(true);
      try {
        const res = await getAssessmentGradesAction(selectedAssessmentId);
        if (res.success && res.assessment && res.grades) {
          setActiveAssessment(res.assessment);
          setGradesRoster(res.grades);
          setIsAssessmentLocked(!!res.isLocked);
        } else {
          setFeedback({ type: "error", text: res.error || "Erro ao carregar notas da avaliação." });
        }
      } catch (err: any) {
        setFeedback({ type: "error", text: "Falha na comunicação ao carregar notas." });
      } finally {
        setLoadingGrades(false);
      }
    }

    loadGrades();
  }, [selectedAssessmentId]);

  // Abre modal para criar nova avaliação
  const handleOpenNewAssessment = () => {
    setEditingAssessment(null);
    setFormData({
      class_id: selectedClassId,
      subject_name: "",
      academic_period: selectedPeriod,
      title: "",
      description: "",
      assessment_date: new Date().toISOString().split("T")[0],
      assessment_type: "prova",
      max_score: settings.max_score_per_period || 10,
      weight: 1,
    });
    setIsModalOpen(true);
  };

  // Abre modal para editar avaliação existente
  const handleOpenEditAssessment = (a: AcademicAssessment) => {
    setEditingAssessment(a);
    setFormData({
      id: a.id,
      class_id: a.class_id,
      subject_name: a.subject_name,
      academic_period: a.academic_period,
      title: a.title,
      description: a.description || "",
      assessment_date: a.assessment_date,
      assessment_type: a.assessment_type,
      max_score: a.max_score,
      weight: a.weight,
    });
    setIsModalOpen(true);
  };

  // Salva avaliação no servidor
  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAssessment(true);
    setFeedback(null);

    try {
      const res = await saveAcademicAssessmentAction({
        ...formData,
        class_id: selectedClassId,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: editingAssessment
            ? "Avaliação atualizada com sucesso!"
            : "Avaliação cadastrada com sucesso!",
        });
        setIsModalOpen(false);

        // Recarrega lista
        const refresh = await getAcademicAssessmentsAction({
          classId: selectedClassId,
          academicPeriod: selectedPeriod,
        });
        if (refresh.success && refresh.assessments) {
          setAssessments(refresh.assessments);
        }
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao salvar avaliação." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: "Erro inesperado ao salvar avaliação." });
    } finally {
      setSavingAssessment(false);
    }
  };

  // Exclui avaliação
  const handleDeleteAssessment = async (a: AcademicAssessment) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir a avaliação "${a.title}"? Todas as notas associadas também serão excluídas.`
      )
    ) {
      return;
    }

    try {
      const res = await deleteAcademicAssessmentAction(a.id);
      if (res.success) {
        setFeedback({ type: "success", text: "Avaliação excluída com sucesso." });
        setAssessments((prev) => prev.filter((item) => item.id !== a.id));
        if (selectedAssessmentId === a.id) {
          setSelectedAssessmentId("");
        }
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao excluir avaliação." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: "Erro inesperado ao excluir avaliação." });
    }
  };

  // Navega direto para o lançamento de notas de uma avaliação
  const handleGoToGrades = (assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setActiveTab("notas");
  };

  // Atualiza nota de um aluno no estado local
  const handleScoreChange = (studentId: string, value: string) => {
    setGradesRoster((prev) =>
      prev.map((g) => {
        if (g.student_id !== studentId) return g;
        if (value === "") {
          return { ...g, score: null, is_absent: false };
        }
        const num = parseFloat(value.replace(",", "."));
        return {
          ...g,
          score: isNaN(num) ? null : num,
          is_absent: false,
        };
      })
    );
  };

  // Alterna flag de ausência
  const handleToggleAbsent = (studentId: string) => {
    setGradesRoster((prev) =>
      prev.map((g) => {
        if (g.student_id !== studentId) return g;
        const newAbsent = !g.is_absent;
        return {
          ...g,
          is_absent: newAbsent,
          score: newAbsent ? 0 : g.score,
        };
      })
    );
  };

  // Atualiza observação do aluno
  const handleNotesChange = (studentId: string, notes: string) => {
    setGradesRoster((prev) =>
      prev.map((g) => (g.student_id === studentId ? { ...g, feedback_notes: notes } : g))
    );
  };

  // Ação em lote: preencher nota padrão
  const handleBatchScore = (scoreVal: number) => {
    if (!activeAssessment) return;
    setGradesRoster((prev) =>
      prev.map((g) => ({
        ...g,
        score: g.is_absent ? 0 : scoreVal,
      }))
    );
  };

  // Salva notas no servidor
  const handleSaveGrades = async () => {
    if (!selectedAssessmentId || !activeAssessment) return;

    // Valida notas locais
    const maxScore = activeAssessment.max_score;
    for (const g of gradesRoster) {
      if (g.score !== null && g.score !== undefined && (g.score < 0 || g.score > maxScore)) {
        setFeedback({
          type: "error",
          text: `Nota fora do limite detectada (${g.score}). A nota máxima é ${maxScore}.`,
        });
        return;
      }
    }

    setSavingGrades(true);
    setFeedback(null);

    try {
      const payload: SaveStudentGradesInput = {
        assessment_id: selectedAssessmentId,
        grades: gradesRoster.map((g) => ({
          student_id: g.student_id,
          enrollment_id: g.enrollment_id,
          score: g.score,
          is_absent: g.is_absent,
          feedback_notes: g.feedback_notes || undefined,
        })),
      };

      const res = await saveAssessmentGradesAction(payload);
      if (res.success) {
        setFeedback({
          type: "success",
          text: `Notas de ${res.savedCount} alunos salvas com sucesso!`,
        });
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao salvar notas." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: "Erro inesperado ao gravar notas." });
    } finally {
      setSavingGrades(false);
    }
  };

  // Alterna fechamento de período (Lock/Unlock)
  const handleTogglePeriodClose = async (periodName: string, isClosed: boolean) => {
    if (!isStaff) return;

    try {
      const res = await togglePeriodClosingAction({
        class_id: selectedClassId,
        academic_period: periodName,
        is_closed: isClosed,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: isClosed
            ? `Período ${periodName} fechado com sucesso! Edições foram bloqueadas.`
            : `Período ${periodName} reaberto para lançamentos.`,
        });

        // Atualiza closings locais
        const closingsRes = await getPeriodClosingsAction(selectedClassId);
        if (closingsRes.success && closingsRes.closings) {
          setClosings(closingsRes.closings);
        }
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao alterar fechamento." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: "Falha ao processar solicitação de fechamento." });
    }
  };

  // Salva configurações de cálculo
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStaff) return;

    setIsSavingSettings(true);
    setFeedback(null);

    try {
      const res = await saveAcademicSettingsAction({
        passing_grade: Number(settingsForm.passing_grade),
        max_score_per_period: Number(settingsForm.max_score_per_period),
        calculation_formula: settingsForm.calculation_formula,
        rounding_rule: settingsForm.rounding_rule,
        decimal_places: Number(settingsForm.decimal_places),
        recovery_enabled: settingsForm.recovery_enabled,
        recovery_replaces_lowest: settingsForm.recovery_replaces_lowest,
        min_attendance_percentage: Number(settingsForm.min_attendance_percentage),
      });

      if (res.success && res.settings) {
        setSettings(res.settings);
        setFeedback({ type: "success", text: "Regras de avaliação atualizadas com sucesso!" });
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao salvar configurações." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: "Erro inesperado ao salvar configurações." });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filtro de busca nas avaliações
  const filteredAssessments = assessments.filter(
    (a) =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isCurrentPeriodClosed = closings.some(
    (c) => c.academic_period === selectedPeriod && c.is_closed
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Seletor de Turma */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              <Award className="w-4 h-4" />
              <span>Vida Acadêmica • Avaliações e Notas</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Gestão de Avaliações e Lançamento de Notas
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Instrumentos avaliativos, lançamento de pontuações e fechamento seguro de períodos
            </p>
          </div>

          {/* Seletor de Turma e Atalho para Boletim */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-64">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Turma Selecionada
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {initialClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.academic_year})
                  </option>
                ))}
              </select>
            </div>

            <Link
              href={`/app/academico/boletim?classId=${selectedClassId}`}
              className="mt-4 sm:mt-5 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-200"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ver Boletim da Turma</span>
            </Link>
          </div>
        </div>

        {/* Abas Internas */}
        <div className="flex items-center gap-2 border-b border-slate-100 pt-5 mt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("avaliacoes")}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
              activeTab === "avaliacoes"
                ? "text-indigo-600 bg-indigo-50/80 shadow-2xs"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <BookOpen className="w-4 h-4" />
            <span>Avaliações da Turma</span>
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-700">
              {assessments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("notas")}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
              activeTab === "notas"
                ? "text-indigo-600 bg-indigo-50/80 shadow-2xs"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Lançamento de Notas</span>
            {activeAssessment && (
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {activeAssessment.title}
              </span>
            )}
          </button>

          {isStaff && (
            <button
              onClick={() => setActiveTab("fechamento")}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
                activeTab === "fechamento"
                  ? "text-indigo-600 bg-indigo-50/80 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Sliders className="w-4 h-4" />
              <span>Fechamento & Regras</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={clsx(
            "p-4 rounded-xl flex items-center justify-between text-sm shadow-xs transition-all",
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          )}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: AVALIAÇÕES DA TURMA                                                */}
      {/* ========================================================================= */}
      {activeTab === "avaliacoes" && (
        <div className="space-y-6">
          {/* Barra de Filtros e Ação Criar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Seletor de Período */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {ACADEMIC_PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status do Período */}
              {isCurrentPeriodClosed ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Período Fechado</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Período Aberto</span>
                </span>
              )}

              {/* Campo de Busca */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por título ou disciplina..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg w-48 sm:w-60 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleOpenNewAssessment}
              disabled={isCurrentPeriodClosed && !isStaff}
              className={clsx(
                "inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-all",
                isCurrentPeriodClosed && !isStaff
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 active:scale-98"
              )}
            >
              <Plus className="w-4 h-4" />
              <span>Nova Avaliação</span>
            </button>
          </div>

          {/* Listagem de Avaliações */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Nenhuma avaliação cadastrada no {selectedPeriod}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
                Crie instrumentos avaliativos (provas, trabalhos, testes, seminários) para compor as
                médias dos alunos nesta turma.
              </p>
              <button
                onClick={handleOpenNewAssessment}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeira Avaliação</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssessments.map((a) => {
                const isLocked = (a.is_locked || isCurrentPeriodClosed) && !isStaff;

                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Header do Card */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {a.subject_name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {a.is_locked && (
                            <span
                              title="Avaliação bloqueada para edições"
                              className="text-slate-400 p-1"
                            >
                              <Lock className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {ASSESSMENT_TYPE_LABELS[a.assessment_type] || a.assessment_type}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug mb-1">
                        {a.title}
                      </h3>
                      {a.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{a.description}</p>
                      )}

                      {/* Métricas da Avaliação */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 my-3 text-center">
                        <div>
                          <span className="block text-2xs uppercase tracking-wider text-slate-400 font-semibold">
                            Valor Máx.
                          </span>
                          <span className="text-sm font-bold text-slate-800">
                            {a.max_score.toFixed(1)} pts
                          </span>
                        </div>
                        <div>
                          <span className="block text-2xs uppercase tracking-wider text-slate-400 font-semibold">
                            Peso
                          </span>
                          <span className="text-sm font-bold text-slate-800">
                            {a.weight.toFixed(1)}x
                          </span>
                        </div>
                        <div>
                          <span className="block text-2xs uppercase tracking-wider text-slate-400 font-semibold">
                            Data
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {a.assessment_date.split("-").reverse().slice(0, 2).join("/")}
                          </span>
                        </div>
                      </div>

                      {/* Status de Notas Lançadas */}
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>Notas registradas:</span>
                        </span>
                        <span className="font-semibold text-slate-800">
                          {a.grades_count ?? 0} alunos
                        </span>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleGoToGrades(a.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Lançar Notas</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditAssessment(a)}
                        disabled={isLocked}
                        title={isLocked ? "Edição bloqueada" : "Editar avaliação"}
                        className={clsx(
                          "p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-all",
                          isLocked && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteAssessment(a)}
                        disabled={isLocked}
                        title={isLocked ? "Exclusão bloqueada" : "Excluir avaliação"}
                        className={clsx(
                          "p-2 text-rose-500 hover:text-rose-700 rounded-xl hover:bg-rose-50 transition-all",
                          isLocked && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: LANÇAMENTO DE NOTAS POR AVALIAÇÃO                                  */}
      {/* ========================================================================= */}
      {activeTab === "notas" && (
        <div className="space-y-6">
          {/* Seletor da Avaliação ativa */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="w-full md:w-96">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecione a Avaliação para Lançar Notas:
                </label>
                <select
                  value={selectedAssessmentId}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                  className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Escolha uma avaliação --</option>
                  {assessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.subject_name}] {a.title} ({a.academic_period} • Max: {a.max_score} pts)
                    </option>
                  ))}
                </select>
              </div>

              {activeAssessment && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 mr-1">Preenchimento rápido:</span>
                  <button
                    onClick={() => handleBatchScore(activeAssessment.max_score)}
                    disabled={isAssessmentLocked}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
                  >
                    Nota Máxima ({activeAssessment.max_score})
                  </button>
                  <button
                    onClick={() => handleBatchScore(settings.passing_grade)}
                    disabled={isAssessmentLocked}
                    className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all"
                  >
                    Média ({settings.passing_grade})
                  </button>
                </div>
              )}
            </div>

            {/* Ficha Resumo da Avaliação */}
            {activeAssessment && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Disciplina:</span>
                  <span className="font-bold text-slate-800">{activeAssessment.subject_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Período Letivo:</span>
                  <span className="font-bold text-slate-800">
                    {activeAssessment.academic_period}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Nota Máxima / Peso:</span>
                  <span className="font-bold text-indigo-600">
                    {activeAssessment.max_score} pts (peso {activeAssessment.weight}x)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Situação de Edição:</span>
                  {isAssessmentLocked ? (
                    <span className="font-bold text-rose-600 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Bloqueada
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <Unlock className="w-3.5 h-3.5" /> Liberada
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tabela de Lançamento de Notas */}
          {!selectedAssessmentId ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
              <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Selecione uma avaliação acima para visualizar os alunos
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                Você poderá lançar notas individuais, marcar faltas justificadas e inserir
                observações pedagógicas por aluno.
              </p>
            </div>
          ) : loadingGrades ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : gradesRoster.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Nenhum aluno ativo matriculado nesta turma
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                Realize a enturmação de alunos no módulo de Matrículas para habilitar o lançamento de
                notas.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Alunos Matriculados ({gradesRoster.length})
                  </span>
                </div>

                <button
                  onClick={handleSaveGrades}
                  disabled={isAssessmentLocked || savingGrades}
                  className={clsx(
                    "inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all",
                    isAssessmentLocked
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 active:scale-98"
                  )}
                >
                  {savingGrades ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Salvar Todas as Notas</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-2xs uppercase tracking-wider font-semibold text-slate-500">
                      <th className="py-3 px-4">Aluno</th>
                      <th className="py-3 px-4 text-center w-36">
                        Nota (0 a {activeAssessment?.max_score})
                      </th>
                      <th className="py-3 px-4 text-center w-32">Ausente / Não Fez</th>
                      <th className="py-3 px-4">Observações / Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {gradesRoster.map((g, idx) => {
                      const isInvalid =
                        g.score !== null &&
                        g.score !== undefined &&
                        activeAssessment &&
                        (g.score < 0 || g.score > activeAssessment.max_score);

                      return (
                        <tr
                          key={g.student_id}
                          className={clsx(
                            "hover:bg-slate-50/60 transition-all",
                            g.is_absent && "bg-slate-50/40 opacity-70"
                          )}
                        >
                          {/* Nome e CPF */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {g.student_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900 block">
                                  {g.student_name}
                                </span>
                                {g.student_cpf && (
                                  <span className="text-2xs text-slate-400">
                                    CPF: {g.student_cpf}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Campo de Nota */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center justify-center">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max={activeAssessment?.max_score}
                                disabled={g.is_absent || isAssessmentLocked}
                                value={g.score !== null && g.score !== undefined ? g.score : ""}
                                onChange={(e) => handleScoreChange(g.student_id, e.target.value)}
                                placeholder="--"
                                className={clsx(
                                  "w-20 text-center font-bold text-sm rounded-xl py-1.5 px-2 border focus:outline-none transition-all",
                                  isInvalid
                                    ? "border-rose-400 bg-rose-50 text-rose-700 ring-2 ring-rose-200"
                                    : g.score !== null && g.score !== undefined && g.score >= settings.passing_grade
                                    ? "border-emerald-300 bg-emerald-50/40 text-emerald-800"
                                    : g.score !== null && g.score !== undefined
                                    ? "border-amber-300 bg-amber-50/40 text-amber-800"
                                    : "border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500",
                                  (g.is_absent || isAssessmentLocked) &&
                                    "bg-slate-100 text-slate-400 cursor-not-allowed"
                                )}
                              />
                            </div>
                            {isInvalid && (
                              <span className="block text-2xs text-rose-600 font-semibold mt-0.5">
                                Limite: {activeAssessment?.max_score}
                              </span>
                            )}
                          </td>

                          {/* Checkbox de Ausência */}
                          <td className="py-3 px-4 text-center">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={g.is_absent}
                                disabled={isAssessmentLocked}
                                onChange={() => handleToggleAbsent(g.student_id)}
                                className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 border-slate-300"
                              />
                            </label>
                          </td>

                          {/* Observações */}
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              disabled={isAssessmentLocked}
                              value={g.feedback_notes || ""}
                              onChange={(e) => handleNotesChange(g.student_id, e.target.value)}
                              placeholder="Opcional: motivo de recuperação, comentários..."
                              className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Rodapé com Botão Salvar */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
                <button
                  onClick={handleSaveGrades}
                  disabled={isAssessmentLocked || savingGrades}
                  className={clsx(
                    "inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all",
                    isAssessmentLocked
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 active:scale-98"
                  )}
                >
                  {savingGrades ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Salvar Lançamentos</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: FECHAMENTO DE PERÍODOS & REGRAS ACADÊMICAS (GESTOR/COORDENAÇÃO)   */}
      {/* ========================================================================= */}
      {activeTab === "fechamento" && isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Fechamento / Bloqueio de Períodos da Turma */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                <Lock className="w-4 h-4" />
                <span>Segurança e Trava de Períodos</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Fechamento de Períodos Letivos da Turma
              </h2>
              <p className="text-xs text-slate-500">
                Ao fechar um período, os lançamentos e edições de notas/aulas por professores ficam
                bloqueados para garantir a integridade dos boletins oficiais.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {ACADEMIC_PERIODS.slice(0, 4).map((periodName) => {
                const isClosed = closings.some(
                  (c) => c.academic_period === periodName && c.is_closed
                );

                return (
                  <div
                    key={periodName}
                    className={clsx(
                      "p-4 rounded-xl border flex items-center justify-between transition-all",
                      isClosed
                        ? "bg-rose-50/50 border-rose-200"
                        : "bg-slate-50 border-slate-200/80"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">{periodName}</span>
                        {isClosed ? (
                          <span className="text-2xs font-bold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                            Bloqueado
                          </span>
                        ) : (
                          <span className="text-2xs font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            Liberado
                          </span>
                        )}
                      </div>
                      <span className="text-2xs text-slate-500 mt-0.5 block">
                        Turma: {currentClass?.name} ({currentClass?.academic_year})
                      </span>
                    </div>

                    <button
                      onClick={() => handleTogglePeriodClose(periodName, !isClosed)}
                      className={clsx(
                        "px-3 py-1.5 text-xs font-bold rounded-xl transition-all border",
                        isClosed
                          ? "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          : "bg-white text-rose-700 border-rose-300 hover:bg-rose-50"
                      )}
                    >
                      {isClosed ? "Reabrir Período" : "Fechar Período"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Regras de Avaliação e Média da Instituição */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                <Calculator className="w-4 h-4" />
                <span>Configuração de Médias & Critérios</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Parâmetros Institucionais de Avaliação
              </h2>
              <p className="text-xs text-slate-500">
                Configure os pesos, fórmulas de cálculo da média, arredondamento e exigência de
                frequência da escola.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Média Mínima para Aprovação
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={settingsForm.passing_grade}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        passing_grade: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pontuação Máx. por Período
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="1000"
                    value={settingsForm.max_score_per_period}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        max_score_per_period: parseFloat(e.target.value) || 10,
                      })
                    }
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fórmula de Média
                  </label>
                  <select
                    value={settingsForm.calculation_formula}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        calculation_formula: e.target.value as any,
                      })
                    }
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="media_aritmetica">Média Aritmética Simples</option>
                    <option value="media_ponderada">Média Ponderada por Peso</option>
                    <option value="soma_pontos">Soma Direta de Pontos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Regra de Arredondamento
                  </label>
                  <select
                    value={settingsForm.rounding_rule}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        rounding_rule: e.target.value as any,
                      })
                    }
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="padrao">Padrão ABNT / Escolar</option>
                    <option value="baixo">Sempre para Baixo (Trunca)</option>
                    <option value="cima">Sempre para Cima</option>
                    <option value="sem_arredondamento">Sem Arredondamento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Frequência Mínima Exigida (%)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={settingsForm.min_attendance_percentage}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      min_attendance_percentage: parseFloat(e.target.value) || 75,
                    })
                  }
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
                >
                  {isSavingSettings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Salvar Regras de Avaliação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CADASTRO / EDIÇÃO DE AVALIAÇÃO                                     */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600">
                <Award className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">
                  {editingAssessment ? "Editar Avaliação" : "Nova Avaliação Acadêmica"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssessment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título do Instrumento Avaliativo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prova Mensal 1, Trabalho em Grupo, Simulado..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disciplina *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Matemática, Português..."
                    value={formData.subject_name}
                    onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Período Letivo *
                  </label>
                  <select
                    value={formData.academic_period}
                    onChange={(e) => setFormData({ ...formData, academic_period: e.target.value })}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {ACADEMIC_PERIODS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Avaliação *
                  </label>
                  <select
                    value={formData.assessment_type}
                    onChange={(e) =>
                      setFormData({ ...formData, assessment_type: e.target.value as AssessmentType })
                    }
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {Object.entries(ASSESSMENT_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data da Avaliação *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.assessment_date}
                    onChange={(e) =>
                      setFormData({ ...formData, assessment_date: e.target.value })
                    }
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Máximo (Pontos) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={formData.max_score}
                    onChange={(e) =>
                      setFormData({ ...formData, max_score: parseFloat(e.target.value) || 10 })
                    }
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Peso na Média *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição / Conteúdo Cobrado (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Instruções da prova, tópicos avaliados..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingAssessment}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
                >
                  {savingAssessment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{editingAssessment ? "Salvar Alterações" : "Criar Avaliação"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
