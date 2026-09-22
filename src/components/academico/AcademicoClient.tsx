"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Course, Series, SchoolClass, AcademicShift } from "@/types/academico";
import {
  saveCourseAction,
  deleteCourseAction,
  saveSeriesAction,
  deleteSeriesAction,
  saveSchoolClassAction,
  deleteSchoolClassAction,
} from "@/app/actions/academico";
import { CourseModal } from "./CourseModal";
import { SeriesModal } from "./SeriesModal";
import { ClassModal } from "./ClassModal";
import {
  BookOpen,
  GraduationCap,
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Edit2,
  Trash2,
  ChevronRight,
  School,
  AlertCircle,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { UserRole } from "@/types/database";

interface AcademicoClientProps {
  initialCourses: Course[];
  initialSeries: Series[];
  initialClasses: SchoolClass[];
  userRole: UserRole;
  schoolName: string;
}

type TabType = "courses" | "series" | "classes";

export function AcademicoClient({
  initialCourses,
  initialSeries,
  initialClasses,
  userRole,
  schoolName,
}: AcademicoClientProps) {
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [seriesList, setSeriesList] = useState<Series[]>(initialSeries);
  const [classesList, setClassesList] = useState<SchoolClass[]>(initialClasses);

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  useEffect(() => {
    setSeriesList(initialSeries);
  }, [initialSeries]);

  useEffect(() => {
    setClassesList(initialClasses);
  }, [initialClasses]);

  const [activeTab, setActiveTab] = useState<TabType>("courses");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");

  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modais de Curso
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Modais de Série
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);

  // Modais de Turma
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);

  // Permissões
  const canManage = ["admin_escola", "coordenacao", "secretaria"].includes(userRole);
  const canDelete = ["admin_escola", "coordenacao"].includes(userRole);

  const coursesMap = new Map(courses.map((c) => [c.id, c]));
  const seriesMap = new Map(seriesList.map((s) => [s.id, s]));

  // Anos letivos disponíveis
  const academicYears = Array.from(new Set(classesList.map((c) => c.academic_year))).sort().reverse();
  if (!academicYears.includes(new Date().getFullYear().toString())) {
    academicYears.unshift(new Date().getFullYear().toString());
  }

  // Operações - Cursos
  const handleSaveCourse = async (data: { id?: string; name: string; description?: string; is_active: boolean }) => {
    setActionError(null);
    setActionSuccess(null);
    const res = await saveCourseAction(data as any);
    if (!res.success || !res.id) {
      throw new Error(res.error || "Erro ao salvar curso/segmento.");
    }
    setActionSuccess(data.id ? "Curso atualizado com sucesso!" : "Curso criado com sucesso!");
    const realCourseId = res.id;

    if (data.id) {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === data.id
            ? { ...c, name: data.name, description: data.description || null, is_active: data.is_active }
            : c
        )
      );
    } else {
      setCourses((prev) => [
        ...prev,
        {
          id: realCourseId,
          tenant_id: "",
          name: data.name,
          description: data.description || null,
          is_active: data.is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          series_count: 0,
        },
      ]);
    }
    router.refresh();
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!confirm(`Deseja realmente excluir o curso "${course.name}"? Esta ação não poderá ser desfeita.`)) {
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const res = await deleteCourseAction(course.id);
      if (!res.success) {
        setActionError(res.error || "Erro ao excluir curso.");
      } else {
        setCourses((prev) => prev.filter((c) => c.id !== course.id));
        setActionSuccess("Curso excluído com sucesso.");
        router.refresh();
      }
    });
  };

  // Operações - Séries
  const handleSaveSeries = async (data: {
    id?: string;
    course_id: string;
    name: string;
    description?: string;
    order_index: number;
    is_active: boolean;
  }) => {
    setActionError(null);
    setActionSuccess(null);
    const res = await saveSeriesAction(data as any);
    if (!res.success || !res.id) {
      throw new Error(res.error || "Erro ao salvar série/ano escolar.");
    }
    setActionSuccess(data.id ? "Série atualizada com sucesso!" : "Série criada com sucesso!");
    const realSeriesId = res.id;
    const linkedCourse = coursesMap.get(data.course_id);

    if (data.id) {
      setSeriesList((prev) =>
        prev.map((s) =>
          s.id === data.id
            ? {
                ...s,
                course_id: data.course_id,
                course: linkedCourse,
                name: data.name,
                description: data.description || null,
                order_index: data.order_index,
                is_active: data.is_active,
              }
            : s
        )
      );
    } else {
      setSeriesList((prev) => [
        ...prev,
        {
          id: realSeriesId,
          tenant_id: "",
          course_id: data.course_id,
          course: linkedCourse,
          name: data.name,
          description: data.description || null,
          order_index: data.order_index,
          is_active: data.is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          classes_count: 0,
        },
      ]);
    }
    router.refresh();
  };

  const handleDeleteSeries = async (series: Series) => {
    if (!confirm(`Deseja realmente excluir a série "${series.name}"? Esta ação não poderá ser desfeita.`)) {
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const res = await deleteSeriesAction(series.id);
      if (!res.success) {
        setActionError(res.error || "Erro ao excluir série.");
      } else {
        setSeriesList((prev) => prev.filter((s) => s.id !== series.id));
        setActionSuccess("Série excluída com sucesso.");
        router.refresh();
      }
    });
  };

  // Operações - Turmas
  const handleSaveClass = async (data: {
    id?: string;
    series_id: string;
    name: string;
    academic_year: string;
    shift: AcademicShift;
    capacity: number;
    is_active: boolean;
  }) => {
    setActionError(null);
    setActionSuccess(null);
    const res = await saveSchoolClassAction(data as any);
    if (!res.success || !res.id) {
      throw new Error(res.error || "Erro ao salvar turma.");
    }
    setActionSuccess(data.id ? "Turma atualizada com sucesso!" : "Turma criada com sucesso!");
    const realClassId = res.id;
    const linkedSeries = seriesMap.get(data.series_id);

    if (data.id) {
      setClassesList((prev) =>
        prev.map((c) =>
          c.id === data.id
            ? {
                ...c,
                series_id: data.series_id,
                series: linkedSeries,
                name: data.name,
                academic_year: data.academic_year,
                shift: data.shift,
                capacity: data.capacity,
                is_active: data.is_active,
              }
            : c
        )
      );
    } else {
      setClassesList((prev) => [
        ...prev,
        {
          id: realClassId,
          tenant_id: "",
          series_id: data.series_id,
          series: linkedSeries,
          name: data.name,
          academic_year: data.academic_year,
          shift: data.shift,
          capacity: data.capacity,
          is_active: data.is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          students_enrolled_count: 0,
        },
      ]);
    }
    router.refresh();
  };

  const handleDeleteClass = async (schoolClass: SchoolClass) => {
    if (!confirm(`Deseja realmente excluir a turma "${schoolClass.name}"?`)) {
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const res = await deleteSchoolClassAction(schoolClass.id);
      if (!res.success) {
        setActionError(res.error || "Erro ao excluir turma.");
      } else {
        setClassesList((prev) => prev.filter((c) => c.id !== schoolClass.id));
        setActionSuccess("Turma excluída com sucesso.");
        router.refresh();
      }
    });
  };

  // Filtros
  const filteredCourses = courses.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" ? true : statusFilter === "active" ? c.is_active : !c.is_active;
    return matchesSearch && matchesStatus;
  });

  const filteredSeries = seriesList.filter((s) => {
    const course = coursesMap.get(s.course_id);
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course && course.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" ? true : statusFilter === "active" ? s.is_active : !s.is_active;
    const matchesCourse = courseFilter === "all" || s.course_id === courseFilter;
    return matchesSearch && matchesStatus && matchesCourse;
  });

  const filteredClasses = classesList.filter((c) => {
    const series = seriesMap.get(c.series_id);
    const course = series ? coursesMap.get(series.course_id) : null;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (series && series.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course && course.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" ? true : statusFilter === "active" ? c.is_active : !c.is_active;
    const matchesCourse = courseFilter === "all" || (series && series.course_id === courseFilter);
    const matchesYear = yearFilter === "all" || c.academic_year === yearFilter;
    const matchesShift = shiftFilter === "all" || c.shift === shiftFilter;
    return matchesSearch && matchesStatus && matchesCourse && matchesYear && matchesShift;
  });

  // Ícones de Turno
  const getShiftBadge = (shift: AcademicShift) => {
    switch (shift) {
      case "matutino":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Sun className="w-3 h-3" /> Manhã
          </span>
        );
      case "vespertino":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
            <Sunset className="w-3 h-3" /> Tarde
          </span>
        );
      case "noturno":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Moon className="w-3 h-3" /> Noite
          </span>
        );
      case "integral":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3 h-3" /> Integral
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
            <School className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Estrutura Acadêmica</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                Fase 1
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Gerencie cursos/segmentos, séries curriculares e turmas ativas em <strong className="text-slate-700">{schoolName}</strong>.
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {activeTab === "courses" && (
              <button
                onClick={() => {
                  setEditingCourse(null);
                  setIsCourseModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Novo Curso
              </button>
            )}
            {activeTab === "series" && (
              <button
                onClick={() => {
                  setEditingSeries(null);
                  setIsSeriesModalOpen(true);
                }}
                disabled={courses.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nova Série
              </button>
            )}
            {activeTab === "classes" && (
              <button
                onClick={() => {
                  setEditingClass(null);
                  setIsClassModalOpen(true);
                }}
                disabled={seriesList.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nova Turma
              </button>
            )}
          </div>
        )}
      </div>

      {/* Alertas de Ação */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Navegação de Abas */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("courses")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "courses"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Cursos / Segmentos
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {courses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("series")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "series"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Séries / Anos
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {seriesList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("classes")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "classes"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Users className="w-4 h-4" />
          Turmas Escolares
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {classesList.length}
          </span>
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === "courses"
                ? "Buscar cursos..."
                : activeTab === "series"
                ? "Buscar séries..."
                : "Buscar turmas..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filtro por Curso (em Séries e Turmas) */}
          {(activeTab === "series" || activeTab === "classes") && (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os Cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Filtro por Ano Letivo (em Turmas) */}
          {activeTab === "classes" && (
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os Anos</option>
              {academicYears.map((y) => (
                <option key={y} value={y}>
                  Ano {y}
                </option>
              ))}
            </select>
          )}

          {/* Filtro por Turno (em Turmas) */}
          {activeTab === "classes" && (
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os Turnos</option>
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
              <option value="noturno">Noturno</option>
              <option value="integral">Integral</option>
            </select>
          )}

          {/* Filtro por Situação */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas Situações</option>
            <option value="active">Somente Ativos</option>
            <option value="inactive">Somente Inativos</option>
          </select>
        </div>
      </div>

      {/* Conteúdo da Aba: TURMAS */}
      {activeTab === "classes" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredClasses.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Nenhuma turma encontrada</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || courseFilter !== "all" || yearFilter !== "all" || shiftFilter !== "all"
                  ? "Tente ajustar os filtros de busca para encontrar as turmas."
                  : "Comece cadastrando suas turmas escolares para organizar os alunos e horários."}
              </p>
              {canManage && seriesList.length > 0 && (
                <button
                  onClick={() => {
                    setEditingClass(null);
                    setIsClassModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Criar Primeira Turma
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Turma</th>
                    <th className="px-6 py-3.5">Série & Curso</th>
                    <th className="px-6 py-3.5">Ano Letivo</th>
                    <th className="px-6 py-3.5">Turno</th>
                    <th className="px-6 py-3.5">Capacidade</th>
                    <th className="px-6 py-3.5">Situação</th>
                    {canManage && <th className="px-6 py-3.5 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredClasses.map((item) => {
                    const series = seriesMap.get(item.series_id);
                    const course = series ? coursesMap.get(series.course_id) : null;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            {item.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{series ? series.name : "—"}</p>
                          <p className="text-[11px] text-slate-400">{course ? course.name : "Segmento"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 font-mono font-medium text-slate-700">
                            {item.academic_year}
                          </span>
                        </td>
                        <td className="px-6 py-4">{getShiftBadge(item.shift)}</td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-700">{item.capacity}</span> alunos
                        </td>
                        <td className="px-6 py-4">
                          {item.is_active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ativa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                              <XCircle className="w-3.5 h-3.5" /> Inativa
                            </span>
                          )}
                        </td>
                        {canManage && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingClass(item);
                                  setIsClassModalOpen(true);
                                }}
                                title="Editar Turma"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteClass(item)}
                                  title="Excluir Turma"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba: SÉRIES */}
      {activeTab === "series" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredSeries.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Nenhuma série encontrada</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || courseFilter !== "all"
                  ? "Tente ajustar a busca para encontrar as séries."
                  : "Cadastre as séries e etapas escolares vinculadas aos cursos."}
              </p>
              {canManage && courses.length > 0 && (
                <button
                  onClick={() => {
                    setEditingSeries(null);
                    setIsSeriesModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Criar Primeira Série
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Ordem</th>
                    <th className="px-6 py-3.5">Série / Ano</th>
                    <th className="px-6 py-3.5">Curso / Segmento</th>
                    <th className="px-6 py-3.5">Turmas Cadastradas</th>
                    <th className="px-6 py-3.5">Situação</th>
                    {canManage && <th className="px-6 py-3.5 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSeries.map((item) => {
                    const course = coursesMap.get(item.course_id);
                    const classCount = classesList.filter((c) => c.series_id === item.id).length;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-700 font-semibold flex items-center justify-center text-[11px]">
                            {item.order_index}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          {item.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                            {course ? course.name : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-700">{classCount}</span> turmas
                        </td>
                        <td className="px-6 py-4">
                          {item.is_active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ativa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                              <XCircle className="w-3.5 h-3.5" /> Inativa
                            </span>
                          )}
                        </td>
                        {canManage && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingSeries(item);
                                  setIsSeriesModalOpen(true);
                                }}
                                title="Editar Série"
                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteSeries(item)}
                                  title="Excluir Série"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba: CURSOS */}
      {activeTab === "courses" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredCourses.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Nenhum curso cadastrado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? "Nenhum resultado para os termos pesquisados."
                  : "Defina os segmentos de ensino oferecidos pela escola (Ex: Infantil, Fundamental, Médio)."}
              </p>
              {canManage && (
                <button
                  onClick={() => {
                    setEditingCourse(null);
                    setIsCourseModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Primeiro Curso
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Curso / Segmento</th>
                    <th className="px-6 py-3.5">Descrição</th>
                    <th className="px-6 py-3.5">Séries Vinculadas</th>
                    <th className="px-6 py-3.5">Situação</th>
                    {canManage && <th className="px-6 py-3.5 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCourses.map((item) => {
                    const seriesCount = seriesList.filter((s) => s.course_id === item.id).length;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">{item.name}</td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                          {item.description || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-700">{seriesCount}</span> séries
                        </td>
                        <td className="px-6 py-4">
                          {item.is_active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                              <XCircle className="w-3.5 h-3.5" /> Inativo
                            </span>
                          )}
                        </td>
                        {canManage && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingCourse(item);
                                  setIsCourseModalOpen(true);
                                }}
                                title="Editar Curso"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteCourse(item)}
                                  title="Excluir Curso"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onSave={handleSaveCourse}
        course={editingCourse}
      />

      <SeriesModal
        isOpen={isSeriesModalOpen}
        onClose={() => setIsSeriesModalOpen(false)}
        onSave={handleSaveSeries}
        courses={courses.filter((c) => c.is_active)}
        series={editingSeries}
        defaultCourseId={courseFilter !== "all" ? courseFilter : undefined}
      />

      <ClassModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        onSave={handleSaveClass}
        seriesList={seriesList.filter((s) => s.is_active)}
        courses={courses}
        schoolClass={editingClass}
      />
    </div>
  );
}
