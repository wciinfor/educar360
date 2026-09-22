"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Enrollment,
  EnrollmentStatus,
  EnrollmentShift,
  ENROLLMENT_STATUS_LABELS,
  CreateEnrollmentInput,
  EnrollmentDocumentItem,
  EnrollmentDocumentProgress,
  EnrollmentDocumentTemplate,
} from "@/types/matriculas";
import { Student, Guardian } from "@/types/secretaria";
import {
  createEnrollmentAction,
  updateEnrollmentStatusAction,
  getEnrollmentLookupDataAction,
} from "@/app/actions/matriculas";
import {
  Search,
  Plus,
  Filter,
  User,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRightLeft,
  X,
  UserCheck,
  Building2,
  ChevronDown,
  FileCheck,
  ShieldAlert,
  SlidersHorizontal,
  History,
  Edit,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { Course, Series, SchoolClass } from "@/types/academico";
import { StudentModal } from "@/components/secretaria/StudentModal";
import { GuardianModal } from "@/components/secretaria/GuardianModal";
import { EnrollmentChecklistModal } from "./EnrollmentChecklistModal";
import { InstitutionChecklistModal } from "./InstitutionChecklistModal";
import { EnrollmentEditModal } from "./EnrollmentEditModal";
import { EnrollmentHistoryModal } from "./EnrollmentHistoryModal";
import { EnrollmentDetailModal } from "./EnrollmentDetailModal";

interface MatriculasClientProps {
  initialEnrollments: Enrollment[];
  existingStudents: Student[];
  existingGuardians: Guardian[];
  initialChecklistTemplates?: EnrollmentDocumentTemplate[];
  courses?: Course[];
  seriesList?: Series[];
  schoolClasses?: SchoolClass[];
  tenantName: string;
  currentUserRole: string;
}

const COURSES = [
  "Educação Infantil",
  "Ensino Fundamental I",
  "Ensino Fundamental II",
  "Ensino Médio",
  "Ensino Técnico",
];

const GRADE_LEVELS = [
  "Maternal I",
  "Maternal II",
  "Pré I",
  "Pré II",
  "1º Ano",
  "2º Ano",
  "3º Ano",
  "4º Ano",
  "5º Ano",
  "6º Ano",
  "7º Ano",
  "8º Ano",
  "9º Ano",
  "1ª Série EM",
  "2ª Série EM",
  "3ª Série EM",
];

export function MatriculasClient({
  initialEnrollments,
  existingStudents,
  existingGuardians,
  initialChecklistTemplates = [],
  courses = [],
  seriesList = [],
  schoolClasses = [],
  tenantName,
  currentUserRole,
}: MatriculasClientProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>(initialEnrollments);
  const [studentsList, setStudentsList] = useState<Student[]>(existingStudents);
  const [guardiansList, setGuardiansList] = useState<Guardian[]>(existingGuardians);
  const [checklistTemplates, setChecklistTemplates] = useState<EnrollmentDocumentTemplate[]>(initialChecklistTemplates);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EnrollmentStatus>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [checklistEnrollment, setChecklistEnrollment] = useState<Enrollment | null>(null);
  const [editingAcademicEnrollment, setEditingAcademicEnrollment] = useState<Enrollment | null>(null);
  const [historyEnrollment, setHistoryEnrollment] = useState<Enrollment | null>(null);
  const [detailEnrollmentId, setDetailEnrollmentId] = useState<string | null>(null);
  const [isInstitutionChecklistOpen, setIsInstitutionChecklistOpen] = useState(false);
  const [statusNotes, setStatusNotes] = useState("");
  const [targetStatusChoice, setTargetStatusChoice] = useState<EnrollmentStatus | null>(null);

  // Estados do formulário de criação
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");

  const [selectedGuardianId, setSelectedGuardianId] = useState("");
  const [guardianSearchTerm, setGuardianSearchTerm] = useState("");

  const [academicYear, setAcademicYear] = useState("2026");
  const [courseName, setCourseName] = useState(
    courses.length > 0 ? courses[0].name : COURSES[2]
  );
  const [gradeLevel, setGradeLevel] = useState("1º Ano");
  const [shift, setShift] = useState<EnrollmentShift>("matutino");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [initialStatus, setInitialStatus] = useState<EnrollmentStatus>("pre_matricula");
  const [notes, setNotes] = useState("");

  // Cursos ativos
  const activeCourses = useMemo(() => {
    const list = courses.filter((c) => c.is_active);
    return list.length > 0 ? list : courses;
  }, [courses]);

  // Séries filtradas pelo curso selecionado
  const availableSeries = useMemo(() => {
    if (activeCourses.length === 0) return [];
    const currentCourse = activeCourses.find(
      (c) => c.name.toLowerCase().trim() === courseName.toLowerCase().trim()
    );
    if (!currentCourse) return [];
    return seriesList.filter((s) => s.course_id === currentCourse.id && s.is_active);
  }, [activeCourses, seriesList, courseName]);

  // Turmas compatíveis filtradas por série, ano e turno
  const availableClasses = useMemo(() => {
    return schoolClasses.filter((sc) => {
      if (!sc.is_active) return false;
      if (sc.academic_year !== academicYear) return false;
      if (sc.shift !== shift) return false;

      // Se temos séries cadastradas e uma selecionada
      const matchingSeries = seriesList.find(
        (s) => s.name.toLowerCase().trim() === gradeLevel.toLowerCase().trim()
      );
      if (matchingSeries) {
        return sc.series_id === matchingSeries.id;
      }

      return true;
    });
  }, [schoolClasses, seriesList, gradeLevel, academicYear, shift]);

  // Turma atualmente selecionada
  const selectedClass = useMemo(() => {
    if (!selectedClassId) return null;
    return schoolClasses.find((c) => c.id === selectedClassId) || null;
  }, [schoolClasses, selectedClassId]);

  // Transições e feedback
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Quando seleciona um aluno existente, pré-seleciona o responsável vinculado se houver
  const handleStudentSelectChange = (studentId: string, currentStudents = studentsList) => {
    setSelectedStudentId(studentId);
    const foundStudent = currentStudents.find((s) => s.id === studentId);
    if (foundStudent && foundStudent.guardians && foundStudent.guardians.length > 0) {
      const primaryGuardian =
        foundStudent.guardians.find((g) => g.is_financial) || foundStudent.guardians[0];
      if (primaryGuardian?.guardian_id) {
        setSelectedGuardianId(primaryGuardian.guardian_id);
      }
    }
  };

  // Alunos existentes filtrados pelo termo de busca no modal de matrícula
  const filteredExistingStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return studentsList;
    const term = studentSearchTerm.toLowerCase().trim();
    const cleanTerm = term.replace(/\D/g, "");
    return studentsList.filter((st) => {
      const fullName = (st.full_name || `${st.first_name} ${st.last_name}`).toLowerCase();
      const cpf = (st.cpf || "").replace(/\D/g, "");
      return fullName.includes(term) || (cleanTerm && cpf.includes(cleanTerm));
    });
  }, [studentsList, studentSearchTerm]);

  // Responsáveis existentes filtrados pelo termo de busca no modal de matrícula
  const filteredExistingGuardians = useMemo(() => {
    if (!guardianSearchTerm.trim()) return guardiansList;
    const term = guardianSearchTerm.toLowerCase().trim();
    const cleanTerm = term.replace(/\D/g, "");
    return guardiansList.filter((gd) => {
      const name = (gd.name || "").toLowerCase();
      const cpf = (gd.cpf || "").replace(/\D/g, "");
      return name.includes(term) || (cleanTerm && cpf.includes(cleanTerm));
    });
  }, [guardiansList, guardianSearchTerm]);

  // Callback ao salvar novo aluno no StudentModal sem fechar o modal de matrícula
  const handleStudentSavedFromModal = async (newStudentId?: string) => {
    try {
      const lookupRes = await getEnrollmentLookupDataAction();
      if (lookupRes.success) {
        setStudentsList(lookupRes.students);
        setGuardiansList(lookupRes.guardians);
        if (newStudentId) {
          handleStudentSelectChange(newStudentId, lookupRes.students);
        }
      }
    } catch (err) {
      console.error("Erro ao atualizar lista de alunos após cadastro:", err);
    }
  };

  // Callback ao salvar novo responsável no GuardianModal sem fechar o modal de matrícula
  const handleGuardianSavedFromModal = async (newGuardianId?: string) => {
    try {
      const lookupRes = await getEnrollmentLookupDataAction();
      if (lookupRes.success) {
        setGuardiansList(lookupRes.guardians);
        setStudentsList(lookupRes.students);
        if (newGuardianId) {
          setSelectedGuardianId(newGuardianId);
        }
      }
    } catch (err) {
      console.error("Erro ao atualizar lista de responsáveis após cadastro:", err);
    }
  };

  // Métricas calculadas
  const metrics = useMemo(() => {
    const total = enrollments.length;
    const matriculados = enrollments.filter((e) => e.status === "matriculado").length;
    const emAnalise = enrollments.filter(
      (e) => e.status === "em_analise" || e.status === "pre_matricula"
    ).length;
    const transferidosCancelados = enrollments.filter(
      (e) => e.status === "transferido" || e.status === "cancelado"
    ).length;
    return { total, matriculados, emAnalise, transferidosCancelados };
  }, [enrollments]);

  // Lista filtrada
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      // Filtro de status
      if (statusFilter !== "all" && e.status !== statusFilter) {
        return false;
      }
      // Filtro de ano
      if (yearFilter !== "all" && e.academic_year !== yearFilter) {
        return false;
      }
      // Filtro de busca
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const stdName = `${e.student?.first_name || ""} ${e.student?.last_name || ""}`.toLowerCase();
        const code = e.enrollment_code.toLowerCase();
        const cpf = e.student?.cpf || "";
        const grdName = (e.guardian?.name || "").toLowerCase();
        return stdName.includes(q) || code.includes(q) || cpf.includes(q) || grdName.includes(q);
      }
      return true;
    });
  }, [enrollments, statusFilter, yearFilter, searchQuery]);

  // Anos letivos disponíveis
  const availableYears = useMemo(() => {
    const years = new Set(enrollments.map((e) => e.academic_year));
    years.add("2026");
    years.add("2025");
    return Array.from(years).sort().reverse();
  }, [enrollments]);

  // Salvar Nova Matrícula
  const handleCreateEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const payload: CreateEnrollmentInput = {
      isExistingStudent: true,
      studentId: selectedStudentId,
      isExistingGuardian: true,
      guardianId: selectedGuardianId || undefined,
      academic_year: academicYear,
      course_name: courseName,
      grade_level: gradeLevel,
      shift,
      class_id: selectedClassId || null,
      initial_status: initialStatus,
      notes,
    };

    if (!selectedStudentId) {
      setActionError("Por favor, selecione um aluno já cadastrado na Secretaria.");
      return;
    }

    startTransition(async () => {
      const res = await createEnrollmentAction(payload);
      if (res.success) {
        setIsCreateModalOpen(false);
        setSuccessToast("Matrícula registrada com sucesso!");
        // Reset form
        setSelectedStudentId("");
        setStudentSearchTerm("");
        setSelectedGuardianId("");
        setGuardianSearchTerm("");
        setSelectedClassId("");
        setNotes("");
        // Recarrega lista
        window.location.reload();
      } else {
        setActionError(res.error || "Erro ao registrar matrícula.");
      }
    });
  };

  // Atualizar Status da Matrícula
  const handleUpdateStatus = (targetStatus: EnrollmentStatus, statusNotes: string) => {
    if (!editingEnrollment) return;
    setActionError(null);

    startTransition(async () => {
      const res = await updateEnrollmentStatusAction({
        enrollmentId: editingEnrollment.id,
        targetStatus,
        notes: statusNotes,
      });

      if (res.success) {
        setEnrollments((prev) =>
          prev.map((item) =>
            item.id === editingEnrollment.id
              ? {
                  ...item,
                  status: targetStatus,
                  status_notes: statusNotes,
                  exit_date:
                    targetStatus === "cancelado" || targetStatus === "transferido"
                      ? new Date().toISOString().split("T")[0]
                      : null,
                }
              : item
          )
        );
        setEditingEnrollment(null);
        setSuccessToast(`Situação alterada para "${ENROLLMENT_STATUS_LABELS[targetStatus].label}".`);
      } else {
        setActionError(res.error || "Erro ao atualizar situação.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast de Sucesso */}
      {successToast && (
        <div className="p-4 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header com Ações & Métricas */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Módulo de Matrículas</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {tenantName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Captação de novos alunos, acompanhamento de pré-matrículas, transferências e rematrículas vigentes.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/app/matriculas/relatorios"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-all cursor-pointer shrink-0"
              title="Acessar painel de relatórios e exportação CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Relatórios</span>
            </Link>

            {(currentUserRole === "admin_escola" ||
              currentUserRole === "super_admin" ||
              currentUserRole === "secretaria") && (
              <button
                type="button"
                onClick={() => setIsInstitutionChecklistOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-all cursor-pointer shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <span>Checklist da Escola</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Matrícula</span>
            </button>
          </div>
        </div>

        {/* Cards de Métricas Rápidas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[11px] text-slate-500 block font-medium">Total de Registros</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-slate-900">{metrics.total}</span>
              <span className="text-[10px] text-slate-400">matrículas</span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <span className="text-[11px] text-emerald-700 block font-medium">Matriculados Ativos</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-emerald-700">{metrics.matriculados}</span>
              <span className="text-[10px] text-emerald-600">confirmados</span>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100">
            <span className="text-[11px] text-blue-700 block font-medium">Em Análise / Pré-Matrícula</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-blue-700">{metrics.emAnalise}</span>
              <span className="text-[10px] text-blue-600">em andamento</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-[11px] text-slate-500 block font-medium">Transferidos / Cancelados</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-slate-700">
                {metrics.transferidosCancelados}
              </span>
              <span className="text-[10px] text-slate-400">saídas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Barra de Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Busca Textual */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar aluno, matrícula ou CPF..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Filtro de Ano Letivo */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium shrink-0">Ano Letivo:</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Todos os Anos</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtro por Situação (Tabs / Badges) */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 overflow-x-auto text-xs pb-1">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === "all"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Todas ({metrics.total})
          </button>

          {(Object.keys(ENROLLMENT_STATUS_LABELS) as EnrollmentStatus[]).map((st) => {
            const count = enrollments.filter((e) => e.status === st).length;
            const isSelected = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{ENROLLMENT_STATUS_LABELS[st].label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela de Matrículas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              <tr>
                <th className="py-3 px-4">Aluno</th>
                <th className="py-3 px-4">Código / Ano</th>
                <th className="py-3 px-4">Série / Turno</th>
                <th className="py-3 px-4">Responsável Legal</th>
                <th className="py-3 px-4">Documentação</th>
                <th className="py-3 px-4">Situação</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                    <p className="text-xs font-medium text-slate-600">
                      Nenhuma matrícula encontrada para os filtros selecionados.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clique em "Nova Matrícula" para cadastrar um novo aluno ou registrar uma inscrição.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((item) => {
                  const studentName = item.student
                    ? `${item.student.first_name} ${item.student.last_name}`
                    : "Aluno não identificado";
                  const statusInfo = ENROLLMENT_STATUS_LABELS[item.status];
                  const progress: EnrollmentDocumentProgress = item.document_progress || {
                    total: 0,
                    received: 0,
                    dispensed: 0,
                    pending: 0,
                    rejected: 0,
                    percent: 0,
                    isComplete: false,
                  };

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Aluno */}
                      <td className="py-3 px-4">
                        <div
                          onClick={() => setDetailEnrollmentId(item.id)}
                          className="flex items-center gap-2.5 cursor-pointer group"
                          title="Clique para ver o prontuário completo"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {studentName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {studentName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {item.student?.cpf ? `CPF: ${item.student.cpf}` : "CPF não informado"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Código e Ano */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-slate-800">
                          {item.enrollment_code}
                        </div>
                        <span className="inline-block text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded mt-0.5">
                          Ano {item.academic_year}
                        </span>
                      </td>

                      {/* Série, Turno e Turma */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{item.grade_level}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.course_name} • <span className="capitalize">{item.shift}</span>
                        </div>
                        {item.school_class ? (
                          <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 w-fit">
                            <GraduationCap className="w-3 h-3 text-indigo-500" />
                            <span>Turma {item.school_class.name}</span>
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] text-slate-400 italic">
                            Sem turma vinculada
                          </div>
                        )}
                      </td>

                      {/* Responsável */}
                      <td className="py-3 px-4">
                        {item.guardian ? (
                          <div>
                            <span className="font-medium text-slate-800 block">
                              {item.guardian.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {item.guardian.phone || item.guardian.email || "Contato não inf."}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Sem responsável vinculado
                          </span>
                        )}
                      </td>

                      {/* Documentação & Progresso */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5 max-w-[150px]">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-slate-700">
                              {progress.received + progress.dispensed}/{progress.total} docs
                            </span>
                            <span
                              className={`font-mono font-bold ${
                                progress.isComplete ? "text-emerald-600" : "text-slate-500"
                              }`}
                            >
                              {progress.percent}%
                            </span>
                          </div>

                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                progress.isComplete
                                  ? "bg-emerald-500"
                                  : progress.rejected > 0
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                              }`}
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between pt-0.5">
                            <button
                              type="button"
                              onClick={() => setChecklistEnrollment(item)}
                              className="text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <FileCheck className="w-3 h-3" />
                              <span>Conferir</span>
                            </button>

                            {progress.rejected > 0 && (
                              <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                                {progress.rejected} rejeitado{progress.rejected > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Situação */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.badgeColor}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {statusInfo.label}
                        </span>
                        {item.status_notes && (
                          <span className="block text-[10px] text-slate-400 truncate max-w-[150px] mt-0.5">
                            {item.status_notes}
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailEnrollmentId(item.id)}
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Ver Prontuário e Detalhes da Matrícula"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setChecklistEnrollment(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar Checklist de Documentos"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setHistoryEnrollment(item)}
                            className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Ver Histórico e Linha do Tempo"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {(currentUserRole === "admin_escola" ||
                            currentUserRole === "super_admin" ||
                            currentUserRole === "secretaria" ||
                            currentUserRole === "coordenacao") && (
                            <button
                              type="button"
                              onClick={() => setEditingAcademicEnrollment(item)}
                              disabled={item.status === "cancelado" || item.status === "transferido"}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                              title={
                                item.status === "cancelado" || item.status === "transferido"
                                  ? "Edição bloqueada para matrículas encerradas"
                                  : "Editar Dados Acadêmicos"
                              }
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingEnrollment(item);
                              setTargetStatusChoice(item.status);
                              setStatusNotes(item.status_notes || "");
                              setActionError(null);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>Situação</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* MODAL 1: NOVA MATRÍCULA                                                        */}
      {/* ============================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Registrar Nova Matrícula</h3>
                <p className="text-xs text-slate-500">
                  Cadastre uma nova vaga ou vincule um aluno já existente na instituição.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEnrollment} className="space-y-5 text-xs">
              {/* SEÇÃO 1: ALUNO */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600" />
                    1. Identificação do Aluno
                  </span>
                  <span className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {studentsList.length} aluno(s) cadastrado(s)
                  </span>
                </div>

                {studentsList.length === 0 ? (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="font-bold text-amber-900 text-xs">
                          Nenhum aluno cadastrado na instituição
                        </p>
                        <p className="text-[11px] text-amber-700">
                          Para registrar uma nova matrícula, é necessário cadastrar o aluno primeiro no módulo Secretaria.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsStudentModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Cadastrar Aluno Agora
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-slate-700 font-semibold">
                      Buscar e Selecionar Aluno Existente *
                    </label>

                    {/* Campo de Busca Rápida */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Filtrar por nome ou CPF..."
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Seleção do Aluno */}
                    <select
                      value={selectedStudentId}
                      onChange={(e) => handleStudentSelectChange(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800"
                    >
                      <option value="">-- Selecione o aluno cadastrado ({filteredExistingStudents.length} encontrado(s)) --</option>
                      {filteredExistingStudents.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.full_name || `${st.first_name} ${st.last_name}`} {st.cpf ? `• CPF: ${st.cpf}` : ""}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Reaproveita prontuário, documentos e histórico escolar da Secretaria.</span>
                      <button
                        type="button"
                        onClick={() => setIsStudentModalOpen(true)}
                        className="text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1 font-medium cursor-pointer"
                      >
                        + Cadastrar novo na Secretaria
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO 2: RESPONSÁVEL LEGAL / FINANCEIRO */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    2. Responsável Legal / Financeiro
                  </span>
                  <span className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {guardiansList.length} cadastrado(s)
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-700 font-semibold">
                    Buscar e Selecionar Responsável
                  </label>

                  {/* Campo de Busca Rápida de Responsável */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Filtrar por nome ou CPF..."
                      value={guardianSearchTerm}
                      onChange={(e) => setGuardianSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Seleção de Responsável */}
                  <select
                    value={selectedGuardianId}
                    onChange={(e) => setSelectedGuardianId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800"
                  >
                    <option value="">-- Selecione o responsável (opcional) ({filteredExistingGuardians.length} encontrado(s)) --</option>
                    {filteredExistingGuardians.map((gd) => (
                      <option key={gd.id} value={gd.id}>
                        {gd.name} {gd.cpf ? `• CPF: ${gd.cpf}` : ""} {gd.phone ? `• Tel: ${gd.phone}` : ""}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span>Vincula o responsável financeiro e pedagógico ao aluno na matrícula.</span>
                    <button
                      type="button"
                      onClick={() => setIsGuardianModalOpen(true)}
                      className="text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      + Cadastrar novo na Secretaria
                    </button>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: DADOS ACADÊMICOS DA MATRÍCULA */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  3. Dados da Matrícula & Alocação Acadêmica
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Ano Letivo *</label>
                    <input
                      type="text"
                      required
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Curso / Segmento *</label>
                    <select
                      value={courseName}
                      onChange={(e) => {
                        const newCourse = e.target.value;
                        setCourseName(newCourse);
                        // Ao alterar curso, atualiza a série se disponível
                        const matchedCourse = activeCourses.find(
                          (c) => c.name.toLowerCase().trim() === newCourse.toLowerCase().trim()
                        );
                        if (matchedCourse) {
                          const childSeries = seriesList.filter(
                            (s) => s.course_id === matchedCourse.id && s.is_active
                          );
                          if (childSeries.length > 0) {
                            setGradeLevel(childSeries[0].name);
                          }
                        }
                        setSelectedClassId("");
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {activeCourses.length > 0
                        ? activeCourses.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))
                        : COURSES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Série / Ano Escolar *</label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => {
                        setGradeLevel(e.target.value);
                        setSelectedClassId("");
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {availableSeries.length > 0
                        ? availableSeries.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))
                        : GRADE_LEVELS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Turno *</label>
                    <select
                      value={shift}
                      onChange={(e) => {
                        setShift(e.target.value as any);
                        setSelectedClassId("");
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="matutino">Matutino</option>
                      <option value="vespertino">Vespertino</option>
                      <option value="noturno">Noturno</option>
                      <option value="integral">Integral</option>
                    </select>
                  </div>
                </div>

                {/* Seleção de Turma e Capacidade */}
                <div className="pt-1">
                  <label className="block text-slate-700 font-semibold mb-1">
                    Turma Vinculada (Opcional ou imediata)
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Deixar sem turma vinculada (Enturmação posterior) --</option>
                    {availableClasses.map((sc) => {
                      const count = sc.students_enrolled_count ?? 0;
                      const cap = sc.capacity;
                      const isFull = cap > 0 && count >= cap;
                      return (
                        <option
                          key={sc.id}
                          value={sc.id}
                          disabled={isFull && initialStatus === "matriculado"}
                        >
                          Turma {sc.name} ({count}/{cap} vagas ocupadas)
                          {isFull ? " — LOTADA" : ""}
                        </option>
                      );
                    })}
                  </select>

                  {/* Informações detalhadas da turma selecionada */}
                  {selectedClass && (
                    <div className="mt-2 p-2.5 rounded-lg border text-xs flex items-center justify-between bg-indigo-50/70 border-indigo-200">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span className="font-semibold text-slate-800">
                            Turma {selectedClass.name}
                          </span>
                          <span className="text-[11px] text-slate-500 ml-2">
                            Ano {selectedClass.academic_year} • Turno {selectedClass.shift}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-600">
                          Ocupação: {selectedClass.students_enrolled_count ?? 0} / {selectedClass.capacity} alunos
                        </span>
                        {(selectedClass.students_enrolled_count ?? 0) >= selectedClass.capacity ? (
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded border border-rose-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Lotada
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-300">
                            {selectedClass.capacity - (selectedClass.students_enrolled_count ?? 0)} vagas livres
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {availableClasses.length === 0 && (
                    <span className="text-[11px] text-amber-600 mt-1 block">
                      Nenhuma turma ativa cadastrada para a série "{gradeLevel}", ano {academicYear} e turno {shift}. Você pode matricular e enturmar posteriormente.
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Situação Inicial da Matrícula
                    </label>
                    <select
                      value={initialStatus}
                      onChange={(e) => setInitialStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    >
                      <option value="pre_matricula">Pré-matrícula (Captação / Reserva)</option>
                      <option value="em_analise">Em Análise (Conferência documental)</option>
                      <option value="matriculado">Matriculado (Vaga confirmada)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Observações / Parecer
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Apresentou transferência original..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isPending ? "Processando..." : "Confirmar Matrícula"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 2: ALTERAR SITUAÇÃO DA MATRÍCULA                                        */}
      {/* ============================================================================== */}
      {editingEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Atualizar Situação da Matrícula</h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {editingEnrollment.enrollment_code}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingEnrollment(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <span className="text-slate-500 block font-medium">Aluno(a):</span>
              <strong className="text-slate-900 text-sm block">
                {editingEnrollment.student
                  ? `${editingEnrollment.student.first_name} ${editingEnrollment.student.last_name}`
                  : "Aluno"}
              </strong>
              <span className="text-[11px] text-slate-500">
                {editingEnrollment.grade_level} ({editingEnrollment.academic_year}) •{" "}
                <span className="font-semibold text-slate-700">
                  Situação Atual: {ENROLLMENT_STATUS_LABELS[editingEnrollment.status].label}
                </span>
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-slate-800">
                Selecione o Novo Status:
              </label>

              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(ENROLLMENT_STATUS_LABELS) as EnrollmentStatus[]).map((st) => {
                  const info = ENROLLMENT_STATUS_LABELS[st];
                  const isSelected = targetStatusChoice === st;
                  const isCurrent = editingEnrollment.status === st;

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTargetStatusChoice(st)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{info.label}</span>
                          {isCurrent && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-bold">
                              Atual
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">{info.desc}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Justificativa / Parecer */}
              <div className="pt-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Justificativa / Parecer Documental{" "}
                  {targetStatusChoice === "cancelado" || targetStatusChoice === "transferido" ? (
                    <span className="text-rose-600">* (obrigatório)</span>
                  ) : (
                    <span className="text-slate-400 font-normal">(opcional)</span>
                  )}
                </label>
                <textarea
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder={
                    targetStatusChoice === "cancelado" || targetStatusChoice === "transferido"
                      ? "Informe o motivo do cancelamento ou dados da guia de transferência..."
                      : "Observações adicionais..."
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingEnrollment(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isPending ||
                  !targetStatusChoice ||
                  targetStatusChoice === editingEnrollment.status ||
                  ((targetStatusChoice === "cancelado" || targetStatusChoice === "transferido") &&
                    statusNotes.trim().length < 3)
                }
                onClick={() => {
                  if (targetStatusChoice) {
                    handleUpdateStatus(targetStatusChoice, statusNotes);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isPending ? "Salvando..." : "Confirmar Alteração"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 3: CHECKLIST DE DOCUMENTOS DO ALUNO (FASE 2)                             */}
      {/* ============================================================================== */}
      {checklistEnrollment && (
        <EnrollmentChecklistModal
          isOpen={Boolean(checklistEnrollment)}
          onClose={() => setChecklistEnrollment(null)}
          enrollment={checklistEnrollment}
          canEdit={
            currentUserRole === "admin_escola" ||
            currentUserRole === "super_admin" ||
            currentUserRole === "secretaria" ||
            currentUserRole === "coordenacao" ||
            currentUserRole === "comercial"
          }
          onDocumentsUpdated={(updatedDocs: EnrollmentDocumentItem[]) => {
            const total = updatedDocs.length;
            const received = updatedDocs.filter((d) => d.status === "recebido").length;
            const dispensed = updatedDocs.filter((d) => d.status === "dispensado").length;
            const pending = updatedDocs.filter((d) => d.status === "pendente").length;
            const rejected = updatedDocs.filter((d) => d.status === "rejeitado").length;
            const percent = total > 0 ? Math.round(((received + dispensed) / total) * 100) : 100;
            const isComplete = updatedDocs.every(
              (d) => !d.is_required || d.status === "recebido" || d.status === "dispensado"
            );

            const newProgress = {
              total,
              received,
              dispensed,
              pending,
              rejected,
              percent,
              isComplete,
            };

            setEnrollments((prev) =>
              prev.map((e) =>
                e.id === checklistEnrollment.id
                  ? {
                      ...e,
                      documents: updatedDocs,
                      document_progress: newProgress,
                    }
                  : e
              )
            );
            setChecklistEnrollment((prev) =>
              prev && prev.id === checklistEnrollment.id
                ? {
                    ...prev,
                    documents: updatedDocs,
                    document_progress: newProgress,
                  }
                : prev
            );
          }}
        />
      )}

      {/* ============================================================================== */}
      {/* MODAL 4: CHECKLIST INSTITUCIONAL DA ESCOLA (FASE 2)                            */}
      {/* ============================================================================== */}
      {isInstitutionChecklistOpen && (
        <InstitutionChecklistModal
          isOpen={isInstitutionChecklistOpen}
          onClose={() => setIsInstitutionChecklistOpen(false)}
          templates={checklistTemplates}
          onSaved={(newTemplates) => {
            setChecklistTemplates(newTemplates);
            setSuccessToast("Checklist institucional atualizada com sucesso!");
          }}
        />
      )}

      {/* ============================================================================== */}
      {/* MODAL 5: EDIÇÃO DE DADOS ACADÊMICOS (FASE 3)                                  */}
      {/* ============================================================================== */}
      {editingAcademicEnrollment && (
        <EnrollmentEditModal
          isOpen={Boolean(editingAcademicEnrollment)}
          onClose={() => setEditingAcademicEnrollment(null)}
          enrollment={editingAcademicEnrollment}
          courses={courses}
          seriesList={seriesList}
          schoolClasses={schoolClasses}
          canEdit={
            currentUserRole === "admin_escola" ||
            currentUserRole === "super_admin" ||
            currentUserRole === "secretaria" ||
            currentUserRole === "coordenacao"
          }
          onUpdated={(updatedFields) => {
            setEnrollments((prev) =>
              prev.map((e) =>
                e.id === editingAcademicEnrollment.id
                  ? {
                      ...e,
                      ...updatedFields,
                    }
                  : e
              )
            );
            setSuccessToast("Dados acadêmicos da matrícula atualizados com sucesso!");
          }}
        />
      )}

      {/* ============================================================================== */}
      {/* MODAL 6: HISTÓRICO & LINHA DO TEMPO DA MATRÍCULA (FASE 3)                      */}
      {/* ============================================================================== */}
      {historyEnrollment && (
        <EnrollmentHistoryModal
          isOpen={Boolean(historyEnrollment)}
          onClose={() => setHistoryEnrollment(null)}
          enrollment={historyEnrollment}
        />
      )}

      {/* ============================================================================== */}
      {/* MODAL 7: DETALHAMENTO COMPLETO & PRONTUÁRIO DA MATRÍCULA (FASE 4)              */}
      {/* ============================================================================== */}
      {detailEnrollmentId && (
        <EnrollmentDetailModal
          isOpen={Boolean(detailEnrollmentId)}
          onClose={() => setDetailEnrollmentId(null)}
          enrollmentId={detailEnrollmentId}
          currentUserRole={currentUserRole}
          onOpenChecklist={(enr) => {
            setDetailEnrollmentId(null);
            setChecklistEnrollment(enr);
          }}
          onOpenEdit={(enr) => {
            setDetailEnrollmentId(null);
            setEditingAcademicEnrollment(enr);
          }}
          onOpenHistory={(enr) => {
            setDetailEnrollmentId(null);
            setHistoryEnrollment(enr);
          }}
          onOpenStatusChange={(enr) => {
            setDetailEnrollmentId(null);
            setEditingEnrollment(enr);
            setTargetStatusChoice(enr.status);
            setStatusNotes(enr.status_notes || "");
            setActionError(null);
          }}
        />
      )}

      {/* MODAL: NOVO ALUNO DA SECRETARIA (INTEGRADO DIRETAMENTE À MATRÍCULA) */}
      <StudentModal
        isOpen={isStudentModalOpen}
        zIndexClass="z-70"
        onClose={() => setIsStudentModalOpen(false)}
        onSaved={handleStudentSavedFromModal}
      />

      {/* MODAL: NOVO RESPONSÁVEL DA SECRETARIA (INTEGRADO DIRETAMENTE À MATRÍCULA) */}
      <GuardianModal
        isOpen={isGuardianModalOpen}
        zIndexClass="z-70"
        onClose={() => setIsGuardianModalOpen(false)}
        onSaved={handleGuardianSavedFromModal}
      />
    </div>
  );
}
