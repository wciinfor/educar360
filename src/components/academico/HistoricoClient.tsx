"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  CompleteStudentHistoryDocument,
  StudentAcademicHistoryRecord,
  HistoryCurriculumSubject,
  HistoryFinalResult,
  HISTORY_RESULT_LABELS,
  SaveExternalHistoryInput,
  ConsolidateCurrentYearHistoryInput,
  RectifyHistoryInput,
} from "@/types/academico";
import {
  searchStudentsForHistoryAction,
  getStudentAcademicHistoryDocumentAction,
  consolidateCurrentYearHistoryAction,
  saveExternalHistoryRecordAction,
  rectifyHistoryRecordAction,
  deleteHistoryRecordAction,
} from "@/app/actions/academico";
import {
  GraduationCap,
  Printer,
  Search,
  Users,
  Award,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Info,
  Lock,
  Unlock,
  Plus,
  Edit3,
  Trash2,
  FileText,
  Building2,
  UserCheck,
  ShieldCheck,
  X,
  History as HistoryIcon,
} from "lucide-react";
import clsx from "clsx";

interface HistoricoClientProps {
  initialStudents: {
    id: string;
    full_name: string;
    cpf?: string | null;
    birth_date?: string | null;
    enrollment_number?: string | null;
    current_class_name?: string | null;
    current_year?: string | null;
  }[];
  userRole: string;
  userName: string;
}

export function HistoricoClient({
  initialStudents,
  userRole,
  userName,
}: HistoricoClientProps) {
  const searchParams = useSearchParams();
  const initialStudentParam = searchParams.get("studentId");

  const [students, setStudents] = useState(initialStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentParam && initialStudents.some((s) => s.id === initialStudentParam)
      ? initialStudentParam
      : initialStudents.length > 0
      ? initialStudents[0].id
      : ""
  );

  const [historyDoc, setHistoryDoc] = useState<CompleteStudentHistoryDocument | null>(null);
  const [loadingDoc, setLoadingDoc] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modais
  const [isConsolidateModalOpen, setIsConsolidateModalOpen] = useState(false);
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [isRectifyModalOpen, setIsRectifyModalOpen] = useState(false);
  const [recordToRectify, setRecordToRectify] = useState<StudentAcademicHistoryRecord | null>(null);

  // Estados de formulário
  const [consolidateForm, setConsolidateForm] = useState({
    total_days: 200,
    total_workload_hours: 800,
    final_result: "aprovado" as HistoryFinalResult,
    observations: "",
  });

  const [externalForm, setExternalForm] = useState<SaveExternalHistoryInput>({
    student_id: "",
    academic_year: (new Date().getFullYear() - 1).toString(),
    grade_level: "1º Ano - Ensino Fundamental",
    course_name: "Ensino Fundamental I",
    school_name: "",
    school_city: "",
    school_state: "SP",
    origin_type: "externa_transferencia",
    shift: "matutino",
    total_days: 200,
    total_workload_hours: 800,
    attendance_percentage: 100,
    final_result: "aprovado",
    observations: "",
    curriculum: [
      { subject_name: "Língua Portuguesa", workload_hours: 160, final_score: 8.0, situation: "aprovado" },
      { subject_name: "Matemática", workload_hours: 160, final_score: 8.0, situation: "aprovado" },
      { subject_name: "Ciências", workload_hours: 80, final_score: 8.0, situation: "aprovado" },
      { subject_name: "História", workload_hours: 80, final_score: 8.0, situation: "aprovado" },
      { subject_name: "Geografia", workload_hours: 80, final_score: 8.0, situation: "aprovado" },
      { subject_name: "Artes", workload_hours: 40, final_score: 9.0, situation: "aprovado" },
      { subject_name: "Educação Física", workload_hours: 40, final_score: 9.5, situation: "aprovado" },
    ],
  });

  const [rectifyForm, setRectifyForm] = useState({
    reason: "",
    final_result: "aprovado" as HistoryFinalResult,
    observations: "",
    curriculum: [] as HistoryCurriculumSubject[],
  });

  const [submitting, setSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isStaff = ["admin_escola", "coordenacao", "secretaria"].includes(userRole);

  // Carrega histórico quando o aluno selecionado muda
  useEffect(() => {
    if (!selectedStudentId) {
      setHistoryDoc(null);
      return;
    }

    async function loadHistory() {
      setLoadingDoc(true);
      setFeedback(null);
      try {
        const res = await getStudentAcademicHistoryDocumentAction(selectedStudentId);
        if (res.success && res.document) {
          setHistoryDoc(res.document);
        } else {
          setFeedback({ type: "error", text: res.error || "Erro ao consultar histórico escolar." });
          setHistoryDoc(null);
        }
      } catch (err: any) {
        setFeedback({ type: "error", text: "Falha de comunicação ao carregar histórico." });
      } finally {
        setLoadingDoc(false);
      }
    }

    loadHistory();
  }, [selectedStudentId]);

  // Busca de alunos com debounce
  const handleSearchStudents = async (term: string) => {
    setSearchTerm(term);
    try {
      const res = await searchStudentsForHistoryAction(term);
      if (res.success && res.students) {
        setStudents(res.students);
      }
    } catch {
      // Ignora erro momentâneo de digitação
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // 1. Ação: Consolidar Ano Atual
  const handleConsolidateCurrentYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyDoc || !selectedStudentId) return;

    const activeEnrollmentId = historyDoc.current_year_record?.enrollment_id;
    if (!activeEnrollmentId) {
      setFeedback({
        type: "error",
        text: "Não foi localizada uma matrícula ativa enturmada para consolidação do ano corrente.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await consolidateCurrentYearHistoryAction({
        student_id: selectedStudentId,
        enrollment_id: activeEnrollmentId,
        total_days: Number(consolidateForm.total_days),
        total_workload_hours: Number(consolidateForm.total_workload_hours),
        final_result: consolidateForm.final_result,
        observations: consolidateForm.observations,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: "Ano letivo consolidado com sucesso no Histórico Escolar permanente!",
        });
        setIsConsolidateModalOpen(false);

        // Recarrega documento
        const refresh = await getStudentAcademicHistoryDocumentAction(selectedStudentId);
        if (refresh.success && refresh.document) {
          setHistoryDoc(refresh.document);
        }
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao consolidar histórico." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: "Erro inesperado ao processar consolidação." });
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Ação: Cadastrar Histórico Externo
  const handleSaveExternalHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await saveExternalHistoryRecordAction({
        ...externalForm,
        student_id: selectedStudentId,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: "Registro de histórico escolar cadastrado com sucesso!",
        });
        setIsExternalModalOpen(false);

        // Recarrega documento
        const refresh = await getStudentAcademicHistoryDocumentAction(selectedStudentId);
        if (refresh.success && refresh.document) {
          setHistoryDoc(refresh.document);
        }
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao salvar histórico." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: "Erro inesperado ao cadastrar histórico." });
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Ação: Abrir Modal de Retificação
  const handleOpenRectifyModal = (record: StudentAcademicHistoryRecord) => {
    setRecordToRectify(record);
    setRectifyForm({
      reason: "",
      final_result: record.final_result,
      observations: record.observations || "",
      curriculum: JSON.parse(JSON.stringify(record.curriculum_snapshot || [])),
    });
    setIsRectifyModalOpen(true);
  };

  // 4. Ação: Salvar Retificação
  const handleSaveRectify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordToRectify) return;

    if (!rectifyForm.reason || rectifyForm.reason.trim().length < 10) {
      setFeedback({
        type: "error",
        text: "Informe a justificativa formal da retificação (mínimo de 10 caracteres).",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await rectifyHistoryRecordAction({
        history_record_id: recordToRectify.id,
        reason: rectifyForm.reason,
        updated_record: {
          final_result: rectifyForm.final_result,
          observations: rectifyForm.observations,
          curriculum: rectifyForm.curriculum,
        },
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: "Registro retificado formalmente e registrado na trilha de auditoria!",
        });
        setIsRectifyModalOpen(false);

        // Recarrega documento
        const refresh = await getStudentAcademicHistoryDocumentAction(selectedStudentId);
        if (refresh.success && refresh.document) {
          setHistoryDoc(refresh.document);
        }
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao retificar registro." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: "Erro inesperado ao salvar retificação." });
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Ação: Excluir Registro
  const handleDeleteRecord = async (record: StudentAcademicHistoryRecord) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir o registro de ${record.academic_year} (${record.grade_level})? Esta ação ficará gravada na auditoria.`
      )
    ) {
      return;
    }

    try {
      const res = await deleteHistoryRecordAction(record.id);
      if (res.success) {
        setFeedback({ type: "success", text: "Registro histórico excluído." });
        const refresh = await getStudentAcademicHistoryDocumentAction(selectedStudentId);
        if (refresh.success && refresh.document) {
          setHistoryDoc(refresh.document);
        }
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao excluir registro." });
      }
    } catch {
      setFeedback({ type: "error", text: "Falha ao excluir histórico." });
    }
  };

  // Funções para manipular a lista de disciplinas no form externo
  const handleAddExternalSubject = () => {
    setExternalForm((prev) => ({
      ...prev,
      curriculum: [
        ...prev.curriculum,
        { subject_name: "", workload_hours: 80, final_score: 7.0, situation: "aprovado" },
      ],
    }));
  };

  const handleUpdateExternalSubject = (index: number, field: keyof HistoryCurriculumSubject, value: any) => {
    setExternalForm((prev) => {
      const list = [...prev.curriculum];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, curriculum: list };
    });
  };

  const handleRemoveExternalSubject = (index: number) => {
    setExternalForm((prev) => ({
      ...prev,
      curriculum: prev.curriculum.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Barra de Controle (Ocultada na Impressão) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              <GraduationCap className="w-4 h-4" />
              <span>Vida Acadêmica • Histórico Escolar e Certificação</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Histórico Escolar Permanente
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Trajetória acadêmica, anos cursados, aproveitamento de estudos e registros imutáveis
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor com Busca de Aluno */}
            <div className="w-full sm:w-80">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Selecionar Aluno
              </label>
              <div className="relative">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.full_name} {st.cpf ? `• ${st.cpf}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ações da Secretaria */}
            {isStaff && (
              <div className="flex items-center gap-2 mt-4 sm:mt-5">
                <button
                  onClick={() => {
                    setExternalForm({
                      student_id: selectedStudentId,
                      academic_year: (new Date().getFullYear() - 1).toString(),
                      grade_level: "1º Ano - Ensino Fundamental",
                      course_name: "Ensino Fundamental I",
                      school_name: "",
                      school_city: "",
                      school_state: "SP",
                      origin_type: "externa_transferencia",
                      shift: "matutino",
                      total_days: 200,
                      total_workload_hours: 800,
                      attendance_percentage: 100,
                      final_result: "aprovado",
                      observations: "",
                      curriculum: [
                        { subject_name: "Língua Portuguesa", workload_hours: 160, final_score: 8.0, situation: "aprovado" },
                        { subject_name: "Matemática", workload_hours: 160, final_score: 8.0, situation: "aprovado" },
                        { subject_name: "Ciências", workload_hours: 80, final_score: 8.0, situation: "aprovado" },
                        { subject_name: "História", workload_hours: 80, final_score: 8.0, situation: "aprovado" },
                        { subject_name: "Geografia", workload_hours: 80, final_score: 8.0, situation: "aprovado" },
                      ],
                    });
                    setIsExternalModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Incluir Histórico Externo</span>
                </button>

                {historyDoc?.current_year_record && (
                  <button
                    onClick={() => {
                      setConsolidateForm({
                        total_days: 200,
                        total_workload_hours: 800,
                        final_result: (historyDoc.current_year_record?.overall_situation || "aprovado") as HistoryFinalResult,
                        observations: "",
                      });
                      setIsConsolidateModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Consolidar Ano {historyDoc.current_year_record.academic_year}</span>
                  </button>
                )}
              </div>
            )}

            {/* Botão Imprimir */}
            {historyDoc && (
              <button
                onClick={handlePrint}
                className="mt-4 sm:mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all active:scale-98"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Histórico Oficial</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={clsx(
            "p-4 rounded-xl flex items-center justify-between text-sm shadow-xs transition-all print:hidden",
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          )}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
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

      {/* Carregando */}
      {loadingDoc ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-xs">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">
            Carregando assentamentos escolares do aluno...
          </p>
        </div>
      ) : !historyDoc ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-xs print:hidden">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            Nenhum histórico selecionado
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Selecione um aluno na barra superior para emitir e consultar a folha de histórico escolar.
          </p>
        </div>
      ) : (
        /* ========================================================================= */
        /* FICHA DO HISTÓRICO ESCOLAR COMPLETO (OTIMIZADO PARA IMPRESSÃO OFICIAL)    */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-10 print:p-0 print:border-none print:shadow-none space-y-8">
          {/* Cabeçalho da Instituição de Ensino */}
          <div className="border-b-2 border-slate-900 pb-6 text-center space-y-1">
            <span className="text-2xs font-bold uppercase tracking-widest text-indigo-700 block">
              REPÚBLICA FEDERATIVA DO BRASIL • SISTEMA NACIONAL DE EDUCAÇÃO
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase">
              {historyDoc.institution.name}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {historyDoc.institution.cnpj ? `CNPJ: ${historyDoc.institution.cnpj} • ` : ""}
              {historyDoc.institution.city || "Sede"} - {historyDoc.institution.state || "SP"}
            </p>
            <div className="pt-2">
              <span className="inline-block px-4 py-1 rounded-md bg-slate-100 text-slate-900 font-black text-sm uppercase tracking-wider border border-slate-300">
                HISTÓRICO ESCOLAR • EDUCAÇÃO BÁSICA
              </span>
            </div>
          </div>

          {/* 1. DADOS DE IDENTIFICAÇÃO DO EDUCANDO */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                1. Identificação do Educando
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl text-xs border border-slate-200">
              <div className="col-span-2">
                <span className="text-slate-400 block font-medium">Nome Completo:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {historyDoc.student.full_name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Data de Nascimento:</span>
                <span className="font-bold text-slate-800">
                  {historyDoc.student.birth_date
                    ? historyDoc.student.birth_date.split("-").reverse().join("/")
                    : "Não informada"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Sexo / Gênero:</span>
                <span className="font-bold text-slate-800 capitalize">
                  {historyDoc.student.gender === "male"
                    ? "Masculino"
                    : historyDoc.student.gender === "female"
                    ? "Feminino"
                    : "Não informado"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">CPF:</span>
                <span className="font-bold text-slate-800">
                  {historyDoc.student.cpf || "Não informado"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">RG / Órgão Expedidor:</span>
                <span className="font-bold text-slate-800">
                  {historyDoc.student.rg
                    ? `${historyDoc.student.rg} ${historyDoc.student.rg_issuer || ""}`
                    : "Não informado"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Naturalidade / UF:</span>
                <span className="font-bold text-slate-800">
                  {historyDoc.student.city
                    ? `${historyDoc.student.city}/${historyDoc.student.state || ""}`
                    : "Não informada"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Filiação / Responsáveis:</span>
                <span className="font-bold text-slate-800">
                  {historyDoc.student.guardians && historyDoc.student.guardians.length > 0
                    ? historyDoc.student.guardians.map((g) => g.name).join(" e ")
                    : "Não informada"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. REGISTRO ANUAL DOS ANOS/SÉRIES CURSADAS */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                2. Assentamentos e Registro do Rendimento Escolar
              </span>
              <span className="text-2xs text-slate-400">
                Total de Anos Registrados:{" "}
                {historyDoc.consolidated_records.length + (historyDoc.current_year_record ? 1 : 0)}
              </span>
            </div>

            {historyDoc.consolidated_records.length === 0 && !historyDoc.current_year_record ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Nenhum ano letivo consolidado ou em curso registrado para este aluno.
              </div>
            ) : (
              <div className="space-y-6">
                {/* 2.1 Anos Consolidados */}
                {historyDoc.consolidated_records.map((record) => (
                  <div
                    key={record.id}
                    className="border border-slate-300 rounded-xl overflow-hidden text-xs bg-white shadow-2xs"
                  >
                    {/* Header do Ano Letivo */}
                    <div className="bg-slate-100/90 p-3.5 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm text-slate-900">
                          {record.academic_year} • {record.grade_level}
                        </span>
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700">
                          {record.course_name}
                        </span>
                        <span className="text-2xs font-bold text-slate-500">
                          ({record.school_name} - {record.school_city || "Sede"}/{record.school_state || "SP"})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-800">
                          <Lock className="w-3 h-3 text-slate-600" />
                          <span>Consolidado</span>
                        </span>
                        <span
                          className={clsx(
                            "px-2.5 py-0.5 rounded-md text-2xs font-black uppercase tracking-wider",
                            record.final_result === "aprovado" || record.final_result === "concluido"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : record.final_result === "reprovado"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          )}
                        >
                          {HISTORY_RESULT_LABELS[record.final_result] || record.final_result}
                        </span>

                        {/* Botões de Ação para Secretaria (Ocultado na Impressão) */}
                        {isStaff && (
                          <div className="flex items-center gap-1 print:hidden ml-2">
                            <button
                              onClick={() => handleOpenRectifyModal(record)}
                              title="Retificar registro formalmente"
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-md"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record)}
                              title="Excluir este registro histórico"
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tabela de Componentes Curriculares */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-2xs uppercase tracking-wider font-bold text-slate-600">
                            <th className="py-2 px-3">Componente Curricular / Disciplina</th>
                            <th className="py-2 px-3 text-center w-28">Carga Horária (h)</th>
                            <th className="py-2 px-3 text-center w-28">Nota Final</th>
                            <th className="py-2 px-3 text-center w-28">Faltas</th>
                            <th className="py-2 px-3 text-center w-28">Frequência (%)</th>
                            <th className="py-2 px-3 text-center w-28">Resultado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {record.curriculum_snapshot.map((subj, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {subj.subject_name}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600">
                                {subj.workload_hours ? `${subj.workload_hours}h` : "--"}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-900">
                                {subj.final_score !== null && subj.final_score !== undefined
                                  ? subj.final_score.toFixed(1)
                                  : "--"}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600">
                                {subj.absences ?? 0}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600">
                                {subj.attendance_pct ? `${subj.attendance_pct}%` : "--"}
                              </td>
                              <td className="py-2 px-3 text-center font-bold">
                                <span
                                  className={clsx(
                                    "capitalize",
                                    subj.situation === "aprovado"
                                      ? "text-emerald-700"
                                      : subj.situation === "reprovado"
                                      ? "text-rose-700"
                                      : "text-slate-600"
                                  )}
                                >
                                  {HISTORY_RESULT_LABELS[subj.situation] || subj.situation}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50/80 border-t border-slate-200 font-bold text-2xs text-slate-700">
                            <td className="py-2 px-3 uppercase tracking-wider">
                              Totais do Ano Letivo:
                            </td>
                            <td className="py-2 px-3 text-center">
                              {record.total_workload_hours ? `${record.total_workload_hours}h` : "--"}
                            </td>
                            <td className="py-2 px-3 text-center">--</td>
                            <td className="py-2 px-3 text-center">--</td>
                            <td className="py-2 px-3 text-center">
                              {record.attendance_percentage
                                ? `${record.attendance_percentage}%`
                                : "--"}
                            </td>
                            <td className="py-2 px-3 text-center uppercase tracking-wider">
                              {HISTORY_RESULT_LABELS[record.final_result]}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Observações do Registro */}
                    {record.observations && (
                      <div className="p-2.5 bg-slate-50/50 border-t border-slate-200 text-2xs text-slate-500">
                        <strong>Observações Legais:</strong> {record.observations}
                      </div>
                    )}
                  </div>
                ))}

                {/* 2.2 Ano Corrente em Andamento */}
                {historyDoc.current_year_record && (
                  <div className="border-2 border-indigo-200 rounded-xl overflow-hidden text-xs bg-white shadow-2xs">
                    <div className="bg-indigo-50/80 p-3.5 border-b border-indigo-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm text-indigo-950">
                          {historyDoc.current_year_record.academic_year} •{" "}
                          {historyDoc.current_year_record.grade_level}
                        </span>
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700">
                          {historyDoc.current_year_record.course_name}
                        </span>
                        <span className="text-2xs font-bold text-slate-500">
                          (Turma: {historyDoc.current_year_record.school_class_name})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>Em Curso (Ano Atual)</span>
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-2xs uppercase tracking-wider font-bold text-slate-600">
                            <th className="py-2 px-3">Componente Curricular</th>
                            <th className="py-2 px-3 text-center w-28">Aulas Ministradas</th>
                            <th className="py-2 px-3 text-center w-28">Média Atual</th>
                            <th className="py-2 px-3 text-center w-28">Faltas</th>
                            <th className="py-2 px-3 text-center w-28">Assiduidade (%)</th>
                            <th className="py-2 px-3 text-center w-28">Situação Atual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {historyDoc.current_year_record.subjects.map((subj, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {subj.subject_name}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600">
                                {subj.workload_hours ? `${subj.workload_hours} aulas` : "--"}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-indigo-700">
                                {subj.final_score !== null && subj.final_score !== undefined
                                  ? subj.final_score.toFixed(1)
                                  : "Pendente"}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600">
                                {subj.absences ?? 0}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600">
                                {subj.attendance_pct ? `${subj.attendance_pct}%` : "--"}
                              </td>
                              <td className="py-2 px-3 text-center font-bold">
                                <span className="text-amber-700 capitalize">
                                  {HISTORY_RESULT_LABELS[subj.situation] || "Em Curso"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-indigo-50/40 border-t border-indigo-100 font-bold text-2xs text-indigo-900">
                            <td className="py-2 px-3 uppercase tracking-wider">
                              Parcial do Ano Atual:
                            </td>
                            <td className="py-2 px-3 text-center">--</td>
                            <td className="py-2 px-3 text-center">
                              {historyDoc.current_year_record.overall_average !== null
                                ? historyDoc.current_year_record.overall_average.toFixed(1)
                                : "--"}
                            </td>
                            <td className="py-2 px-3 text-center">--</td>
                            <td className="py-2 px-3 text-center">
                              {historyDoc.current_year_record.overall_attendance_percentage}%
                            </td>
                            <td className="py-2 px-3 text-center uppercase tracking-wider text-amber-800">
                              Em Curso
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="p-2.5 bg-indigo-50/30 border-t border-indigo-100 text-2xs text-indigo-900 flex items-center justify-between">
                      <span>
                        * Este período letivo encontra-se em andamento e será consolidado ao término do ano escolar.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. TRILHA DE RETIFICAÇÕES FORMAIS */}
          {historyDoc.rectifications && historyDoc.rectifications.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800 block">
                3. Trilha de Retificações Oficiais (Auditada)
              </span>
              <div className="space-y-1.5 text-2xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {historyDoc.rectifications.map((r) => (
                  <div key={r.id} className="flex items-start gap-2">
                    <HistoryIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">
                        {new Date(r.rectified_at).toLocaleDateString("pt-BR")}:
                      </span>{" "}
                      {r.reason} (Operador: {r.rectifier_name || "Secretaria"})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. BASE LEGAL E TERMO DE CERTIFICAÇÃO */}
          <div className="border-t-2 border-slate-800 pt-5 space-y-4">
            <div className="text-2xs text-slate-500 leading-relaxed space-y-1">
              <p>
                <strong>Observações e Amparo Legal:</strong> Histórico Escolar emitido em
                conformidade com a Lei de Diretrizes e Bases da Educação Nacional (Lei Federal nº
                9.394/1996) e resoluções vigentes dos Conselhos de Educação.
              </p>
              <p>
                Certificamos que as informações constantes neste documento conferem rigorosamente
                com os assentamentos e atas arquivadas na Secretaria desta Instituição Escolar.
              </p>
            </div>

            {/* Campos de Assinatura Oficial */}
            <div className="grid grid-cols-2 gap-12 pt-12 text-center text-xs">
              <div className="border-t border-slate-400 pt-2">
                <span className="font-bold block text-slate-900">Secretaria Escolar</span>
                <span className="text-2xs text-slate-500">Assinatura / Registro Funcional</span>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <span className="font-bold block text-slate-900">Direção Geral</span>
                <span className="text-2xs text-slate-500">Assinatura / Carimbo Oficial</span>
              </div>
            </div>

            <div className="text-center text-2xs text-slate-400 pt-4">
              Emissão eletrônica pelo Sistema Educar360 em {new Date().toLocaleDateString("pt-BR")} às{" "}
              {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CONSOLIDAR ANO LETIVO ATUAL                                      */}
      {/* ========================================================================= */}
      {isConsolidateModalOpen && historyDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600">
                <Lock className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">
                  Consolidar Ano Letivo no Histórico
                </h3>
              </div>
              <button
                onClick={() => setIsConsolidateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConsolidateCurrentYear} className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Ao consolidar, os dados oficiais do ano corrente (notas finais, componentes
                curriculares e frequência) serão congelados como um{" "}
                <strong>snapshot permanente e imutável</strong> no Histórico Escolar do aluno.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total de Dias Letivos
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={consolidateForm.total_days}
                    onChange={(e) =>
                      setConsolidateForm({
                        ...consolidateForm,
                        total_days: parseInt(e.target.value) || 200,
                      })
                    }
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Carga Horária Total (Horas)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={consolidateForm.total_workload_hours}
                    onChange={(e) =>
                      setConsolidateForm({
                        ...consolidateForm,
                        total_workload_hours: parseInt(e.target.value) || 800,
                      })
                    }
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Resultado Final Oficial *
                </label>
                <select
                  value={consolidateForm.final_result}
                  onChange={(e) =>
                    setConsolidateForm({
                      ...consolidateForm,
                      final_result: e.target.value as HistoryFinalResult,
                    })
                  }
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="aprovado">Aprovado</option>
                  <option value="concluido">Concluído</option>
                  <option value="reprovado">Reprovado</option>
                  <option value="transferido">Transferido</option>
                  <option value="classificado">Classificado</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observações Legais / Atas da Turma (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={consolidateForm.observations}
                  onChange={(e) =>
                    setConsolidateForm({ ...consolidateForm, observations: e.target.value })
                  }
                  placeholder="Ex: Aprovado conforme Resolução do Conselho de Classe..."
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConsolidateModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Confirmar e Consolidar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CADASTRAR HISTÓRICO EXTERNO (OUTRA ESCOLA)                      */}
      {/* ========================================================================= */}
      {isExternalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600">
                <Building2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">
                  Cadastrar Histórico de Outra Escola / Anos Anteriores
                </h3>
              </div>
              <button
                onClick={() => setIsExternalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExternalHistory} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ano Letivo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 2024"
                    value={externalForm.academic_year}
                    onChange={(e) =>
                      setExternalForm({ ...externalForm, academic_year: e.target.value })
                    }
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Série / Ano *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 1º Ano"
                    value={externalForm.grade_level}
                    onChange={(e) =>
                      setExternalForm({ ...externalForm, grade_level: e.target.value })
                    }
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Curso / Etapa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ensino Fundamental I"
                    value={externalForm.course_name}
                    onChange={(e) =>
                      setExternalForm({ ...externalForm, course_name: e.target.value })
                    }
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nome da Escola de Origem *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: E.E. Professor João Silva"
                    value={externalForm.school_name}
                    onChange={(e) =>
                      setExternalForm({ ...externalForm, school_name: e.target.value })
                    }
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Município / UF
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={externalForm.school_city || ""}
                      onChange={(e) =>
                        setExternalForm({ ...externalForm, school_city: e.target.value })
                      }
                      className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="UF"
                      maxLength={2}
                      value={externalForm.school_state || ""}
                      onChange={(e) =>
                        setExternalForm({ ...externalForm, school_state: e.target.value.toUpperCase() })
                      }
                      className="w-14 text-center text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Resultado Final *</label>
                  <select
                    value={externalForm.final_result}
                    onChange={(e) =>
                      setExternalForm({
                        ...externalForm,
                        final_result: e.target.value as HistoryFinalResult,
                      })
                    }
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  >
                    <option value="aprovado">Aprovado</option>
                    <option value="concluido">Concluído</option>
                    <option value="reprovado">Reprovado</option>
                    <option value="transferido">Transferido</option>
                    <option value="dispensado">Dispensado / Aproveitamento</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Carga Horária (h)</label>
                  <input
                    type="number"
                    value={externalForm.total_workload_hours || 800}
                    onChange={(e) =>
                      setExternalForm({
                        ...externalForm,
                        total_workload_hours: parseInt(e.target.value) || 800,
                      })
                    }
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assiduidade (%)</label>
                  <input
                    type="number"
                    value={externalForm.attendance_percentage || 100}
                    onChange={(e) =>
                      setExternalForm({
                        ...externalForm,
                        attendance_percentage: parseInt(e.target.value) || 100,
                      })
                    }
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* Componentes Curriculares Dinâmicos */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 uppercase tracking-wider text-2xs">
                    Componentes Curriculares / Disciplinas ({externalForm.curriculum.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddExternalSubject}
                    className="text-2xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Disciplina
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {externalForm.curriculum.map((subj, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Nome da Disciplina"
                        required
                        value={subj.subject_name}
                        onChange={(e) =>
                          handleUpdateExternalSubject(idx, "subject_name", e.target.value)
                        }
                        className="flex-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1"
                      />
                      <input
                        type="number"
                        placeholder="Horas"
                        value={subj.workload_hours || ""}
                        onChange={(e) =>
                          handleUpdateExternalSubject(idx, "workload_hours", parseInt(e.target.value) || null)
                        }
                        className="w-16 text-xs text-center text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1"
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Nota"
                        value={subj.final_score !== null && subj.final_score !== undefined ? subj.final_score : ""}
                        onChange={(e) =>
                          handleUpdateExternalSubject(idx, "final_score", parseFloat(e.target.value) || null)
                        }
                        className="w-16 text-xs text-center font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExternalSubject(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExternalModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  <span>Salvar Registro Histórico</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RETIFICAR REGISTRO CONSOLIDADO                                   */}
      {/* ========================================================================= */}
      {isRectifyModalOpen && recordToRectify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600">
                <Edit3 className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">
                  Retificar Registro Consolidado ({recordToRectify.academic_year} • {recordToRectify.grade_level})
                </h3>
              </div>
              <button
                onClick={() => setIsRectifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRectify} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <strong>Atenção:</strong> A retificação é um ato oficial que altera dados consolidados. A justificativa será registrada na trilha perpétua de auditoria.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Justificativa Formal da Retificação * (Obrigatória)
                </label>
                <textarea
                  rows={2}
                  required
                  value={rectifyForm.reason}
                  onChange={(e) => setRectifyForm({ ...rectifyForm, reason: e.target.value })}
                  placeholder="Ex: Correção de nota de Língua Portuguesa após revisão da banca examinadora (Ata nº 12/2025)..."
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Resultado Final Retificado
                </label>
                <select
                  value={rectifyForm.final_result}
                  onChange={(e) =>
                    setRectifyForm({
                      ...rectifyForm,
                      final_result: e.target.value as HistoryFinalResult,
                    })
                  }
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                >
                  <option value="aprovado">Aprovado</option>
                  <option value="concluido">Concluído</option>
                  <option value="reprovado">Reprovado</option>
                  <option value="transferido">Transferido</option>
                </select>
              </div>

              {/* Edição rápida de notas por disciplina */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-2xs block">
                  Notas das Disciplinas
                </label>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {rectifyForm.curriculum.map((subj, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="flex-1 font-semibold text-slate-800">
                        {subj.subject_name}
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Nota"
                        value={subj.final_score !== null && subj.final_score !== undefined ? subj.final_score : ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          const cur = [...rectifyForm.curriculum];
                          cur[idx].final_score = isNaN(val) ? null : val;
                          setRectifyForm({ ...rectifyForm, curriculum: cur });
                        }}
                        className="w-20 text-xs text-center font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRectifyModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Gravar Retificação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
