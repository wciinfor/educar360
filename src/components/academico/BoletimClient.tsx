"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  SchoolClass,
  StudentReportCard,
  AcademicSettings,
  ACADEMIC_PERIODS,
} from "@/types/academico";
import {
  getStudentReportCardAction,
  getClassReportCardsAction,
} from "@/app/actions/academico";
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
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
  Layers,
} from "lucide-react";
import clsx from "clsx";

interface BoletimClientProps {
  initialClasses: SchoolClass[];
  initialSettings: AcademicSettings;
  userRole: string;
  userName: string;
}

export function BoletimClient({
  initialClasses,
  initialSettings,
  userRole,
  userName,
}: BoletimClientProps) {
  const searchParams = useSearchParams();
  const initialClassParam = searchParams.get("classId");
  const initialStudentParam = searchParams.get("studentId");

  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassParam && initialClasses.some((c) => c.id === initialClassParam)
      ? initialClassParam
      : initialClasses.length > 0
      ? initialClasses[0].id
      : ""
  );

  const [studentsList, setStudentsList] = useState<
    { id: string; name: string; cpf?: string | null; enrollment_number?: string | null }[]
  >([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentParam || "");
  const [reportCard, setReportCard] = useState<StudentReportCard | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const [loadingClass, setLoadingClass] = useState<boolean>(false);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentClass = initialClasses.find((c) => c.id === selectedClassId);

  // Carrega lista de alunos da turma selecionada
  useEffect(() => {
    if (!selectedClassId) {
      setStudentsList([]);
      setSelectedStudentId("");
      setReportCard(null);
      return;
    }

    async function loadClassRoster() {
      setLoadingClass(true);
      setErrorMessage(null);
      try {
        const res = await getClassReportCardsAction(selectedClassId);
        if (res.success && res.students) {
          setStudentsList(res.students);
          // Se houver alunos e nenhum selecionado (ou o selecionado não estiver na turma), seleciona o primeiro
          if (res.students.length > 0) {
            if (!selectedStudentId || !res.students.some((s) => s.id === selectedStudentId)) {
              setSelectedStudentId(res.students[0].id);
            }
          } else {
            setSelectedStudentId("");
            setReportCard(null);
          }
        } else {
          setErrorMessage(res.error || "Erro ao consultar alunos da turma.");
        }
      } catch (err: any) {
        setErrorMessage("Falha de conexão ao carregar turma.");
      } finally {
        setLoadingClass(false);
      }
    }

    loadClassRoster();
  }, [selectedClassId]);

  // Carrega boletim do aluno selecionado
  useEffect(() => {
    if (!selectedClassId || !selectedStudentId) {
      setReportCard(null);
      return;
    }

    async function loadReportCard() {
      setLoadingReport(true);
      setErrorMessage(null);
      try {
        const res = await getStudentReportCardAction(selectedClassId, selectedStudentId);
        if (res.success && res.reportCard) {
          setReportCard(res.reportCard);
        } else {
          setErrorMessage(res.error || "Erro ao gerar boletim escolar.");
          setReportCard(null);
        }
      } catch (err: any) {
        setErrorMessage("Erro ao compor dados do boletim.");
      } finally {
        setLoadingReport(false);
      }
    }

    loadReportCard();
  }, [selectedClassId, selectedStudentId]);

  const toggleSubjectExpand = (subjectName: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectName]: !prev[subjectName],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const effectiveTerms =
    reportCard?.terms && reportCard.terms.length > 0
      ? reportCard.terms
      : [
          { name: "1º Bimestre", sequence_order: 1, status: "aberto" },
          { name: "2º Bimestre", sequence_order: 2, status: "aberto" },
          { name: "3º Bimestre", sequence_order: 3, status: "aberto" },
          { name: "4º Bimestre", sequence_order: 4, status: "aberto" },
        ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Controle (Ocultado na impressão) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Vida Acadêmica • Boletim Escolar Oficial</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Boletim de Desempenho e Rendimento
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Acompanhamento de médias, frequência, avaliações parciais e situação acadêmica
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Turma */}
            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">Turma</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {initialClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.academic_year})
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Aluno */}
            <div className="w-full sm:w-64">
              <label className="block text-xs font-medium text-slate-600 mb-1">Aluno</label>
              <select
                value={selectedStudentId}
                disabled={loadingClass || studentsList.length === 0}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              >
                {studentsList.length === 0 ? (
                  <option value="">Nenhum aluno enturmado</option>
                ) : (
                  studentsList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} {st.enrollment_number ? `(${st.enrollment_number})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Botão de Impressão */}
            {reportCard && (
              <button
                onClick={handlePrint}
                className="mt-4 sm:mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-xs transition-all active:scale-98"
              >
                <Printer className="w-4 h-4 text-indigo-600" />
                <span>Imprimir / Salvar PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Erro */}
      {errorMessage && (
        <div className="bg-rose-50 text-rose-800 border border-rose-200 p-4 rounded-xl flex items-center gap-3 text-sm print:hidden">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Estado Carregando */}
      {loadingReport ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-xs">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">
            Calculando médias e consolidando dados de frequência...
          </p>
        </div>
      ) : !reportCard ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-xs print:hidden">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            Nenhum boletim selecionado
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Selecione uma turma e um aluno matriculado para emitir a ficha de rendimento escolar.
          </p>
        </div>
      ) : (
        /* ========================================================================= */
        /* FICHA DO BOLETIM ESCOLAR (RENDERIZÁVEL EM TELA E OTIMIZADO PARA IMPRESSÃO) */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 print:p-0 print:border-none print:shadow-none space-y-6">
          {/* Cabeçalho Institucional Oficial */}
          <div className="border-b-2 border-slate-800 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-2xs font-bold uppercase tracking-widest text-indigo-700">
                  Educar360 • Sistema de Gestão Escolar
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  BOLETIM ESCOLAR INDIVIDUAL
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">
                    Ano Letivo: {reportCard.school_year?.title || reportCard.academic_year}
                  </span>
                  {reportCard.school_year_id && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Calendário Oficial
                    </span>
                  )}
                </div>
              </div>

              {/* Status Geral do Aluno */}
              <div className="text-left sm:text-right">
                <span className="text-2xs uppercase tracking-wider text-slate-400 font-semibold block">
                  Situação Acadêmica Geral
                </span>
                <span
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-xs uppercase tracking-wider mt-1",
                    reportCard.overall_situation === "aprovado"
                      ? "bg-emerald-100 text-emerald-800"
                      : reportCard.overall_situation === "recuperacao"
                      ? "bg-amber-100 text-amber-800"
                      : reportCard.overall_situation === "reprovado"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-blue-100 text-blue-800"
                  )}
                >
                  {reportCard.overall_situation === "aprovado" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {reportCard.overall_situation === "recuperacao" && <AlertTriangle className="w-3.5 h-3.5" />}
                  {reportCard.overall_situation === "reprovado" && <XCircle className="w-3.5 h-3.5" />}
                  {reportCard.overall_situation === "em_andamento" && <Clock className="w-3.5 h-3.5" />}
                  <span>
                    {reportCard.overall_situation === "aprovado"
                      ? "Aprovado"
                      : reportCard.overall_situation === "recuperacao"
                      ? "Em Recuperação"
                      : reportCard.overall_situation === "reprovado"
                      ? "Reprovado"
                      : "Em Andamento"}
                  </span>
                </span>
              </div>
            </div>

            {/* Informações Cadastrais do Aluno e Turma */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100 bg-slate-50/70 p-4 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Nome do Aluno:</span>
                <span className="font-bold text-slate-900">{reportCard.student_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Matrícula / CPF:</span>
                <span className="font-bold text-slate-800">
                  {reportCard.enrollment_number || "Sem matrícula"}
                  {reportCard.student_cpf ? ` • ${reportCard.student_cpf}` : ""}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Turma / Turno:</span>
                <span className="font-bold text-slate-800">
                  {reportCard.school_class.name} ({reportCard.school_class.shift})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Série / Curso:</span>
                <span className="font-bold text-slate-800">
                  {reportCard.school_class.series?.name || "Ensino Regular"}
                </span>
              </div>
            </div>
          </div>

          {/* Tabela de Notas por Disciplina */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100/80 text-2xs uppercase tracking-wider font-bold text-slate-700 border-b border-slate-300">
                  <th className="py-3 px-3 border-r border-slate-200">Disciplina</th>
                  {effectiveTerms.map((term) => (
                    <th key={term.name} className="py-3 px-2 text-center border-r border-slate-200 min-w-[75px]">
                      <div className="flex flex-col items-center justify-center">
                        <span>
                          {term.name
                            .replace("º Bimestre", "º Bim")
                            .replace("º Trimestre", "º Tri")
                            .replace("º Semestre", "º Sem")}
                        </span>
                        {term.status === "bloqueado" && (
                          <span className="text-[9px] px-1 py-0.2 bg-rose-100 text-rose-700 rounded font-semibold mt-0.5">
                            Bloqueado
                          </span>
                        )}
                        {term.status === "fechado" && (
                          <span className="text-[9px] px-1 py-0.2 bg-slate-200 text-slate-700 rounded font-semibold mt-0.5">
                            Fechado
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-2 text-center border-r border-slate-200 w-20 bg-indigo-50/60 text-indigo-900">
                    Média Final
                  </th>
                  <th className="py-3 px-2 text-center border-r border-slate-200 w-16">Aulas</th>
                  <th className="py-3 px-2 text-center border-r border-slate-200 w-16">Faltas</th>
                  <th className="py-3 px-2 text-center border-r border-slate-200 w-20">Assiduidade</th>
                  <th className="py-3 px-3 text-center w-28">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {reportCard.subjects.length === 0 ? (
                  <tr>
                    <td colSpan={effectiveTerms.length + 6} className="py-8 text-center text-slate-400">
                      Nenhuma disciplina vinculada ou avaliações lançadas para esta turma.
                    </td>
                  </tr>
                ) : (
                  reportCard.subjects.map((subj) => {
                    const isExpanded = !!expandedSubjects[subj.subject_name];
                    const isAttBelowMin =
                      subj.attendance_percentage < reportCard.settings.min_attendance_percentage;

                    return (
                      <React.Fragment key={subj.subject_name}>
                        <tr className="hover:bg-slate-50/50 transition-all font-medium">
                          {/* Nome da Disciplina com Toggle de Detalhes */}
                          <td className="py-3 px-3 border-r border-slate-200 font-bold text-slate-900">
                            <div className="flex items-center justify-between gap-2">
                              <span>{subj.subject_name}</span>
                              <button
                                onClick={() => toggleSubjectExpand(subj.subject_name)}
                                className="print:hidden text-slate-400 hover:text-indigo-600 p-1"
                                title="Ver avaliações detalhadas"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Notas dos Períodos Oficiais */}
                          {effectiveTerms.map((term) => {
                            const pDetail = subj.periods[term.name];
                            const grade = pDetail?.final_period_grade;

                            return (
                              <td
                                key={term.name}
                                className="py-3 px-2 text-center border-r border-slate-200 font-bold"
                              >
                                {grade !== null && grade !== undefined ? (
                                  <span
                                    className={clsx(
                                      grade >= reportCard.settings.passing_grade
                                        ? "text-emerald-700"
                                        : "text-rose-600"
                                    )}
                                  >
                                    {grade.toFixed(reportCard.settings.decimal_places)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-normal">--</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Média Anual / Final */}
                          <td className="py-3 px-2 text-center border-r border-slate-200 font-black bg-indigo-50/30 text-sm">
                            {subj.annual_average !== null ? (
                              <span
                                className={clsx(
                                  subj.annual_average >= reportCard.settings.passing_grade
                                    ? "text-indigo-700"
                                    : "text-rose-600"
                                )}
                              >
                                {subj.annual_average.toFixed(reportCard.settings.decimal_places)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal text-xs">Parcial</span>
                            )}
                          </td>

                          {/* Total Aulas */}
                          <td className="py-3 px-2 text-center border-r border-slate-200 text-slate-700">
                            {subj.total_lessons}
                          </td>

                          {/* Faltas */}
                          <td className="py-3 px-2 text-center border-r border-slate-200 text-slate-700">
                            {subj.absences}
                          </td>

                          {/* Assiduidade (%) */}
                          <td className="py-3 px-2 text-center border-r border-slate-200 font-semibold">
                            <span
                              className={clsx(
                                isAttBelowMin ? "text-rose-600 font-bold" : "text-slate-700"
                              )}
                            >
                              {subj.attendance_percentage}%
                            </span>
                          </td>

                          {/* Situação da Disciplina */}
                          <td className="py-3 px-3 text-center font-bold">
                            <span
                              className={clsx(
                                "inline-block px-2 py-0.5 rounded-md text-2xs uppercase tracking-wider",
                                subj.situation === "aprovado"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : subj.situation === "recuperacao"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : subj.situation === "reprovado"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-slate-100 text-slate-600"
                              )}
                            >
                              {subj.situation === "aprovado"
                                ? "Aprovado"
                                : subj.situation === "recuperacao"
                                ? "Recuperação"
                                : subj.situation === "reprovado"
                                ? "Reprovado"
                                : "Em Curso"}
                            </span>
                          </td>
                        </tr>

                        {/* Linha Expansível de Detalhamento das Avaliações */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 print:table-row">
                            <td colSpan={effectiveTerms.length + 6} className="p-4 border-b border-slate-200">
                              <div className="space-y-2">
                                <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block">
                                  Composição das Avaliações • {subj.subject_name}
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {effectiveTerms.map((term) => {
                                    const pDetail = subj.periods[term.name];
                                    const assessList = pDetail?.assessments || [];

                                    return (
                                      <div
                                        key={term.name}
                                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5"
                                      >
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-xs text-slate-800">
                                              {term.name}
                                            </span>
                                            {term.status === "bloqueado" && (
                                              <span className="text-[8px] px-1 bg-rose-100 text-rose-700 rounded font-semibold">
                                                Bloqueado
                                              </span>
                                            )}
                                            {term.status === "fechado" && (
                                              <span className="text-[8px] px-1 bg-slate-200 text-slate-700 rounded font-semibold">
                                                Fechado
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-2xs font-bold text-indigo-600">
                                            {pDetail?.final_period_grade !== null
                                              ? `${pDetail.final_period_grade.toFixed(1)} pts`
                                              : "--"}
                                          </span>
                                        </div>

                                        {assessList.length === 0 ? (
                                          <span className="text-2xs text-slate-400 italic block py-1">
                                            Sem avaliações
                                          </span>
                                        ) : (
                                          <ul className="space-y-1 text-2xs">
                                            {assessList.map((ass) => (
                                              <li
                                                key={ass.id}
                                                className="flex items-center justify-between text-slate-600"
                                              >
                                                <span className="truncate pr-1" title={ass.title}>
                                                  {ass.title}
                                                </span>
                                                <span className="font-bold shrink-0">
                                                  {ass.score !== null ? (
                                                    <span className="text-slate-900">
                                                      {ass.score} / {ass.max_score}
                                                    </span>
                                                  ) : (
                                                    <span className="text-slate-400">Pendente</span>
                                                  )}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>

              {/* Linha de Totais e Médias Gerais */}
              <tfoot>
                <tr className="bg-slate-100/90 font-black text-xs border-t-2 border-slate-300">
                  <td className="py-3 px-3 border-r border-slate-200 uppercase tracking-wider text-slate-800">
                    Média Geral do Aluno
                  </td>
                  <td colSpan={effectiveTerms.length} className="border-r border-slate-200"></td>
                  <td className="py-3 px-2 text-center border-r border-slate-200 text-indigo-700 text-sm">
                    {reportCard.overall_average !== null
                      ? reportCard.overall_average.toFixed(reportCard.settings.decimal_places)
                      : "--"}
                  </td>
                  <td colSpan={2} className="border-r border-slate-200"></td>
                  <td className="py-3 px-2 text-center border-r border-slate-200 text-slate-800">
                    {reportCard.overall_attendance_percentage}%
                  </td>
                  <td className="py-3 px-3 text-center uppercase tracking-wider text-slate-800">
                    {reportCard.overall_situation}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Legenda e Critérios Institucionais */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                Critérios de Aprovação e Regras da Escola:
              </span>
              <p className="text-2xs text-slate-500 leading-relaxed">
                • <strong>Média Mínima para Aprovação:</strong>{" "}
                {reportCard.settings.passing_grade.toFixed(1)} pontos.
                <br />• <strong>Fórmula Adotada:</strong>{" "}
                {reportCard.settings.calculation_formula === "media_aritmetica"
                  ? "Média Aritmética Simples"
                  : reportCard.settings.calculation_formula === "media_ponderada"
                  ? "Média Ponderada por Pesos"
                  : "Soma de Pontos Acumulada"}
                .
                <br />• <strong>Frequência Mínima Exigida:</strong>{" "}
                {reportCard.settings.min_attendance_percentage}% da carga horária ministrada.
              </p>
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="font-bold text-slate-800 block">Validação Documental:</span>
              <p className="text-2xs text-slate-400">
                Documento emitido digitalmente pela plataforma Educar360.
                <br />
                Data de emissão: {new Date().toLocaleDateString("pt-BR")} às{" "}
                {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          {/* Assinaturas para Impressão */}
          <div className="hidden print:grid grid-cols-2 gap-12 pt-16 text-center text-xs">
            <div className="border-t border-slate-400 pt-2">
              <span className="font-bold block text-slate-800">Secretaria Escolar</span>
              <span className="text-2xs text-slate-500">Educar360 Gestão Acadêmica</span>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <span className="font-bold block text-slate-800">Direção / Coordenação Pedagógica</span>
              <span className="text-2xs text-slate-500">Assinatura / Carimbo</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
