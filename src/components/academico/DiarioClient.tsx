"use client";

import React, { useState, useEffect, useTransition } from "react";
import { SchoolClass, ClassLesson, SaveClassLessonInput, ACADEMIC_PERIODS } from "@/types/academico";
import {
  saveClassLessonAction,
  deleteClassLessonAction,
  getClassLessonsAction,
} from "@/app/actions/academico";
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  Clock,
  User,
  Users,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  CheckSquare,
  FileText,
  Sparkles,
  Layers,
  X,
  CalendarCheck,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

interface DiarioClientProps {
  initialClasses: SchoolClass[];
  userRole: string;
  userName: string;
}

export function DiarioClient({ initialClasses, userRole, userName }: DiarioClientProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClasses.length > 0 ? initialClasses[0].id : ""
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [lessons, setLessons] = useState<ClassLesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // Modal de Criação / Edição de Aula
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<ClassLesson | null>(null);

  const [formData, setFormData] = useState<SaveClassLessonInput>({
    class_id: selectedClassId,
    lesson_date: new Date().toISOString().split("T")[0],
    academic_period: "1º Bimestre",
    subject_name: "",
    title: "",
    content_summary: "",
    pedagogical_notes: "",
  });

  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Carrega as aulas sempre que a turma ou filtros mudarem
  const loadLessons = async (classId: string, period?: string, start?: string, end?: string) => {
    if (!classId) return;
    setLoadingLessons(true);
    setActionError(null);
    try {
      const res = await getClassLessonsAction({
        class_id: classId,
        academic_period: period,
        start_date: start,
        end_date: end,
      });

      if (res.success) {
        setLessons(res.lessons || []);
      } else {
        setActionError(res.error || "Erro ao carregar aulas da turma.");
      }
    } catch (err: any) {
      setActionError(err?.message || "Erro inesperado ao consultar diário.");
    } finally {
      setLoadingLessons(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      loadLessons(selectedClassId, selectedPeriod, startDate, endDate);
    } else {
      setLessons([]);
    }
  }, [selectedClassId, selectedPeriod, startDate, endDate]);

  const selectedClass = initialClasses.find((c) => c.id === selectedClassId);

  const handleOpenModal = (lesson?: ClassLesson) => {
    setActionError(null);
    setActionSuccess(null);
    if (lesson) {
      setEditingLesson(lesson);
      setFormData({
        id: lesson.id,
        class_id: lesson.class_id,
        lesson_date: lesson.lesson_date,
        academic_period: lesson.academic_period,
        subject_name: lesson.subject_name || "",
        title: lesson.title,
        content_summary: lesson.content_summary,
        pedagogical_notes: lesson.pedagogical_notes || "",
      });
    } else {
      setEditingLesson(null);
      setFormData({
        class_id: selectedClassId,
        lesson_date: new Date().toISOString().split("T")[0],
        academic_period: selectedPeriod !== "all" ? selectedPeriod : "1º Bimestre",
        subject_name: "",
        title: "",
        content_summary: "",
        pedagogical_notes: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLesson(null);
  };

  const handleSubmitLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    startTransition(async () => {
      const res = await saveClassLessonAction({
        ...formData,
        class_id: selectedClassId,
      });

      if (res.success) {
        setActionSuccess(editingLesson ? "Aula atualizada com sucesso!" : "Aula registrada no diário com sucesso!");
        handleCloseModal();
        await loadLessons(selectedClassId, selectedPeriod, startDate, endDate);
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setActionError(res.error || "Erro ao salvar aula.");
      }
    });
  };

  const handleDeleteLesson = async (lesson: ClassLesson) => {
    if (!window.confirm(`Deseja realmente remover o registro da aula "${lesson.title}" do diário?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteClassLessonAction(lesson.id);
      if (res.success) {
        setActionSuccess("Aula removida do diário com sucesso.");
        await loadLessons(selectedClassId, selectedPeriod, startDate, endDate);
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setActionError(res.error || "Erro ao excluir aula.");
      }
    });
  };

  // Filtragem local por texto
  const filteredLessons = lessons.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      l.content_summary.toLowerCase().includes(q) ||
      l.subject_name?.toLowerCase().includes(q) ||
      l.lesson_date.includes(q)
    );
  });

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

      {/* Card Superior: Seleção de Turma & Controles */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Diário de Classe Oficial</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Registro de Conteúdos & Aulas
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Selecione a turma para visualizar os lançamentos do plano pedagógico e registrar novas aulas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {selectedClassId && (
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Nova Aula</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros: Turma, Período, Data e Busca */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Seletor de Período Acadêmico */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Período Letivo
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="all">Todos os Períodos</option>
              {ACADEMIC_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Data Inicial */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              A partir de (Data)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Busca por Conteúdo/Título */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Buscar no Conteúdo
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: Frações, Fotossíntese..."
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {selectedClass && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>
                Ano Letivo: <strong className="text-slate-800">{selectedClass.academic_year}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Turno: <strong className="text-slate-800 capitalize">{selectedClass.shift}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Capacidade: <strong className="text-slate-800">{selectedClass.capacity} alunos</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/app/academico/frequencia?classId=${selectedClass.id}`}
                className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Ver Frequência da Turma</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Listagem de Aulas do Diário */}
      {initialClasses.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Nenhuma Turma Cadastrada</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Para registrar aulas no Diário de Classe, é necessário primeiro cadastrar a estrutura de turmas e séries no módulo Acadêmico.
          </p>
          <Link
            href="/app/academico/estrutura"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors"
          >
            <span>Configurar Estrutura Acadêmica</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : loadingLessons ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Carregando aulas e conteúdos do diário...</p>
        </div>
      ) : filteredLessons.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Nenhuma Aula Registrada</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery || startDate || selectedPeriod !== "all"
              ? "Nenhuma aula encontrada com os filtros selecionados. Tente alterar os parâmetros de busca."
              : "Ainda não há registros de aula para esta turma no diário. Clique no botão abaixo para lançar a primeira aula."}
          </p>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Primeira Aula</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Exibindo <strong>{filteredLessons.length}</strong> aula(s) registrada(s)
            </span>
            <span className="font-mono text-[11px]">{selectedClass?.name}</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {lesson.academic_period}
                      </span>
                      {lesson.subject_name && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {lesson.subject_name}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium ml-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(lesson.lesson_date + "T12:00:00").toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 pt-1">
                      {lesson.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/app/academico/frequencia?classId=${lesson.class_id}&lessonId=${lesson.id}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>
                        Frequência ({lesson.present_count || 0}/{lesson.attendances_count || 0})
                      </span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleOpenModal(lesson)}
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                      title="Editar Aula"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(lesson)}
                      className="p-2 rounded-xl text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                      title="Excluir Registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Resumo do Conteúdo Ministrado */}
                <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Conteúdo Ministrado:
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {lesson.content_summary}
                  </p>
                </div>

                {/* Observações Pedagógicas (Se houver) */}
                {lesson.pedagogical_notes && (
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200/50 rounded-2xl text-xs space-y-1">
                    <span className="font-bold text-amber-900 block">Observações Pedagógicas:</span>
                    <p className="text-amber-800 whitespace-pre-line leading-relaxed">
                      {lesson.pedagogical_notes}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Ministrado por: <strong>{lesson.teacher_name || userName}</strong></span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600 font-semibold">{lesson.present_count || 0} presenças</span>
                    <span>&bull;</span>
                    <span className="text-rose-600 font-semibold">{lesson.absent_count || 0} faltas</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Registro / Edição de Aula */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingLesson ? "Editar Registro de Aula" : "Registrar Nova Aula no Diário"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Turma: <strong>{selectedClass?.name}</strong> ({selectedClass?.academic_year})
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLesson} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Data da Aula *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.lesson_date}
                    onChange={(e) => setFormData({ ...formData, lesson_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Período Letivo *
                  </label>
                  <select
                    value={formData.academic_period}
                    onChange={(e) => setFormData({ ...formData, academic_period: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    {ACADEMIC_PERIODS.map((period) => (
                      <option key={period} value={period}>
                        {period}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Disciplina / Matéria (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.subject_name || ""}
                  onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                  placeholder="Ex: Matemática, Língua Portuguesa, História..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tema / Título da Aula *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Introdução a Equações do 1º Grau"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Resumo do Conteúdo Ministrado *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.content_summary}
                  onChange={(e) => setFormData({ ...formData, content_summary: e.target.value })}
                  placeholder="Descreva as atividades, teoria explicada, exercícios em sala e páginas do material..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Observações Pedagógicas & Tarefas (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formData.pedagogical_notes || ""}
                  onChange={(e) => setFormData({ ...formData, pedagogical_notes: e.target.value })}
                  placeholder="Tarefas de casa, observações de comportamento ou necessidades de reforço..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando aula...</span>
                    </>
                  ) : (
                    <span>{editingLesson ? "Salvar Alterações" : "Registrar Aula"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
