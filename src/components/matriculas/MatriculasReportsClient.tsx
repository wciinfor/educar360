'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  Enrollment,
  EnrollmentStatus,
  EnrollmentShift,
  ENROLLMENT_STATUS_LABELS,
  EnrollmentDocumentItem,
  DOCUMENT_STATUS_CONFIG,
} from '@/types/matriculas';
import { Course, Series, SchoolClass } from '@/types/academico';
import {
  getEnrollmentsAction,
} from '@/app/actions/matriculas';
import {
  FileSpreadsheet,
  ArrowLeft,
  Filter,
  Download,
  Calendar,
  Layers,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  AlertCircle,
  FileText,
  User,
  Search,
  RefreshCw,
  Users,
} from 'lucide-react';

interface MatriculasReportsClientProps {
  initialEnrollments: Enrollment[];
  courses?: Course[];
  seriesList?: Series[];
  schoolClasses?: SchoolClass[];
  tenantName: string;
  currentUserRole: string;
}


const COURSES = [
  'Educação Infantil',
  'Ensino Fundamental I',
  'Ensino Fundamental II',
  'Ensino Médio',
  'Ensino Técnico',
];

const GRADE_LEVELS = [
  'Maternal I',
  'Maternal II',
  'Pré I',
  'Pré II',
  '1º Ano',
  '2º Ano',
  '3º Ano',
  '4º Ano',
  '5º Ano',
  '6º Ano',
  '7º Ano',
  '8º Ano',
  '9º Ano',
  '1ª Série EM',
  '2ª Série EM',
  '3ª Série EM',
];

export function MatriculasReportsClient({
  initialEnrollments,
  courses = [],
  seriesList = [],
  schoolClasses = [],
  tenantName,
  currentUserRole,
}: MatriculasReportsClientProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>(initialEnrollments);
  const [activeTab, setActiveTab] = useState<'geral' | 'pendencias'>('geral');

  // Filtros
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EnrollmentStatus>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<'all' | EnrollmentShift>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Turmas filtradas conforme os demais seletores
  const availableClasses = useMemo(() => {
    return schoolClasses.filter((c) => {
      if (academicYearFilter !== 'all' && c.academic_year !== academicYearFilter) return false;
      if (shiftFilter !== 'all' && c.shift !== shiftFilter) return false;
      return true;
    });
  }, [schoolClasses, academicYearFilter, shiftFilter]);

  // Anos letivos disponíveis nos dados
  const availableYears = useMemo(() => {
    const years = new Set(enrollments.map((e) => e.academic_year));
    years.add('2026');
    years.add('2025');
    return Array.from(years).sort().reverse();
  }, [enrollments]);

  // Aplica filtros localmente
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      if (academicYearFilter !== 'all' && e.academic_year !== academicYearFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (courseFilter !== 'all' && e.course_name !== courseFilter) return false;
      if (gradeFilter !== 'all' && e.grade_level !== gradeFilter) return false;
      if (classFilter !== 'all' && e.class_id !== classFilter) return false;
      if (shiftFilter !== 'all' && e.shift !== shiftFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const stdName = `${e.student?.first_name || ''} ${e.student?.last_name || ''}`.toLowerCase();
        const code = e.enrollment_code.toLowerCase();
        const className = e.school_class?.name?.toLowerCase() || '';
        return stdName.includes(q) || code.includes(q) || className.includes(q);
      }
      return true;
    });
  }, [enrollments, academicYearFilter, statusFilter, courseFilter, gradeFilter, classFilter, shiftFilter, searchQuery]);

  // Indicadores Numéricos Consolidados
  const metrics = useMemo(() => {
    const total = filteredEnrollments.length;
    const matriculados = filteredEnrollments.filter((e) => e.status === 'matriculado').length;
    const preMatricula = filteredEnrollments.filter((e) => e.status === 'pre_matricula').length;
    const emAnalise = filteredEnrollments.filter((e) => e.status === 'em_analise').length;
    const transferidos = filteredEnrollments.filter((e) => e.status === 'transferido').length;
    const cancelados = filteredEnrollments.filter((e) => e.status === 'cancelado').length;

    // Agrupamentos por Curso
    const byCourse: Record<string, number> = {};
    // Agrupamentos por Série
    const byGrade: Record<string, number> = {};
    // Agrupamentos por Turno
    const byShift: Record<string, number> = {};

    filteredEnrollments.forEach((e) => {
      byCourse[e.course_name] = (byCourse[e.course_name] || 0) + 1;
      byGrade[e.grade_level] = (byGrade[e.grade_level] || 0) + 1;
      byShift[e.shift] = (byShift[e.shift] || 0) + 1;
    });

    return {
      total,
      matriculados,
      preMatricula,
      emAnalise,
      transferidos,
      cancelados,
      byCourse,
      byGrade,
      byShift,
    };
  }, [filteredEnrollments]);

  // Relatório de Pendências Documentais
  const documentPendingList = useMemo(() => {
    const list: Array<{
      enrollment: Enrollment;
      doc: EnrollmentDocumentItem;
    }> = [];

    filteredEnrollments.forEach((enr) => {
      if (enr.documents && enr.documents.length > 0) {
        enr.documents.forEach((doc) => {
          if (doc.status === 'pendente' || doc.status === 'rejeitado') {
            list.push({ enrollment: enr, doc });
          }
        });
      }
    });

    return list;
  }, [filteredEnrollments]);

  // Recarrega dados com filtros do backend
  const handleRefresh = () => {
    startTransition(async () => {
      const res = await getEnrollmentsAction({
        academicYear: academicYearFilter !== 'all' ? academicYearFilter : undefined,
        status: statusFilter,
        course: courseFilter !== 'all' ? courseFilter : undefined,
        gradeLevel: gradeFilter !== 'all' ? gradeFilter : undefined,
        shift: shiftFilter,
      });

      if (res.success) {
        setEnrollments(res.data);
        setFeedbackMessage('Dados sincronizados com o servidor!');
        setTimeout(() => setFeedbackMessage(null), 3000);
      }
    });
  };

  // Exportação para CSV (Em estrita conformidade com LGPD - sem dados desnecessários)
  const handleExportCSV = () => {
    if (activeTab === 'geral') {
      if (filteredEnrollments.length === 0) {
        alert('Não há dados para exportar no filtro atual.');
        return;
      }

      const headers = [
        'Codigo_Matricula',
        'Aluno_Nome',
        'Ano_Letivo',
        'Curso',
        'Serie',
        'Turma',
        'Turno',
        'Situacao',
        'Data_Inscricao',
        'Progresso_Documental',
      ];

      const rows = filteredEnrollments.map((e) => {
        const studentName = e.student
          ? `"${e.student.first_name} ${e.student.last_name}"`
          : '"Aluno não informado"';
        const progressStr = e.document_progress ? `"${e.document_progress.percent}%"` : '"0%"';
        const statusLabel = ENROLLMENT_STATUS_LABELS[e.status]?.label || e.status;
        const className = e.school_class?.name ? `"${e.school_class.name}"` : '"Aguardando enturmação"';

        return [
          e.enrollment_code,
          studentName,
          e.academic_year,
          `"${e.course_name}"`,
          `"${e.grade_level}"`,
          className,
          e.shift,
          `"${statusLabel}"`,
          e.entry_date ? new Date(e.entry_date).toLocaleDateString('pt-BR') : '',
          progressStr,
        ].join(';');
      });


      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_matriculas_${tenantName.replace(/\s+/g, '_')}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Exportação das Pendências Documentais
      if (documentPendingList.length === 0) {
        alert('Não há pendências documentais para exportar no filtro atual.');
        return;
      }

      const headers = [
        'Codigo_Matricula',
        'Aluno_Nome',
        'Ano_Letivo',
        'Serie',
        'Documento_Pendente',
        'Obrigatorio',
        'Situacao_Documento',
        'Observacoes',
      ];

      const rows = documentPendingList.map(({ enrollment: e, doc }) => {
        const studentName = e.student
          ? `"${e.student.first_name} ${e.student.last_name}"`
          : '"Aluno não informado"';
        const docName = `"${doc.document_name}"`;
        const required = doc.is_required ? 'Sim' : 'Nao';
        const statusDoc = doc.status === 'rejeitado' ? 'Rejeitado' : 'Pendente';
        const notes = `"${(doc.notes || '').replace(/"/g, '""')}"`;

        return [
          e.enrollment_code,
          studentName,
          e.academic_year,
          `"${e.grade_level}"`,
          docName,
          required,
          statusDoc,
          notes,
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pendencias_documentais_${tenantName.replace(/\s+/g, '_')}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/app/matriculas"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Voltar para Matrículas"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Relatórios & Indicadores de Matrículas</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {tenantName}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-8">
            Análise consolidada de ocupação de vagas, distribuição acadêmica e conformidade documental.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0 pl-8 sm:pl-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isPending ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Multifatoriais */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          <span>Filtros do Relatório</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Busca Aluno/Código */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Buscar</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Aluno ou código..."
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Ano Letivo */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Ano Letivo</label>
            <select
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer"
            >
              <option value="all">Todos os Anos</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Situação */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Situação</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer"
            >
              <option value="all">Todas as Situações</option>
              {(Object.keys(ENROLLMENT_STATUS_LABELS) as EnrollmentStatus[]).map((st) => (
                <option key={st} value={st}>
                  {ENROLLMENT_STATUS_LABELS[st].label}
                </option>
              ))}
            </select>
          </div>

          {/* Curso */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Curso / Segmento</label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer"
            >
              <option value="all">Todos os Cursos</option>
              {COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Série */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Série / Ano</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer"
            >
              <option value="all">Todas as Séries</option>
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Turno */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Turno</label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer"
            >
              <option value="all">Todos os Turnos</option>
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
              <option value="noturno">Noturno</option>
              <option value="integral">Integral</option>
            </select>
          </div>

          {/* Turma (Fase 2) */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Turma Escolar</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer"
            >
              <option value="all">Todas as Turmas</option>
              {availableClasses.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>


      {/* Abas do Relatório */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('geral')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
            activeTab === 'geral'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Visão Geral & Indicadores ({metrics.total})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pendencias')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'pendencias'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Pendências Documentais</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'pendencias' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {documentPendingList.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CONTEÚDO 1: VISÃO GERAL & INDICADORES                                     */}
      {/* ========================================================================= */}
      {activeTab === 'geral' && (
        <div className="space-y-6">
          {/* Cards de Métricas por Status */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block font-medium">Total Filtrado</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{metrics.total}</span>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/80 shadow-xs">
              <span className="text-[11px] text-emerald-800 block font-medium">Matriculados</span>
              <span className="text-xl font-bold text-emerald-700 mt-1 block">{metrics.matriculados}</span>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 shadow-xs">
              <span className="text-[11px] text-amber-800 block font-medium">Pré-matrículas</span>
              <span className="text-xl font-bold text-amber-700 mt-1 block">{metrics.preMatricula}</span>
            </div>

            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200/80 shadow-xs">
              <span className="text-[11px] text-blue-800 block font-medium">Em Análise</span>
              <span className="text-xl font-bold text-blue-700 mt-1 block">{metrics.emAnalise}</span>
            </div>

            <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200/80 shadow-xs">
              <span className="text-[11px] text-purple-800 block font-medium">Transferidos</span>
              <span className="text-xl font-bold text-purple-700 mt-1 block">{metrics.transferidos}</span>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200/80 shadow-xs">
              <span className="text-[11px] text-rose-800 block font-medium">Cancelados</span>
              <span className="text-xl font-bold text-rose-700 mt-1 block">{metrics.cancelados}</span>
            </div>
          </div>

          {/* Grids de Distribuição: Cursos e Séries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Ocupação por Segmento / Curso */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Distribuição por Curso / Segmento</span>
              </div>

              <div className="space-y-2 text-xs">
                {Object.keys(metrics.byCourse).length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">Nenhum dado encontrado.</p>
                ) : (
                  Object.entries(metrics.byCourse).map(([course, count]) => {
                    const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                    return (
                      <div key={course} className="space-y-1">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-700">{course}</span>
                          <span className="text-slate-900 font-bold">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Ocupação por Série / Ano */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Ocupação por Série / Ano Escolar</span>
              </div>

              <div className="space-y-2 text-xs max-h-60 overflow-y-auto pr-1">
                {Object.keys(metrics.byGrade).length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">Nenhum dado encontrado.</p>
                ) : (
                  Object.entries(metrics.byGrade).map(([grade, count]) => {
                    const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                    return (
                      <div key={grade} className="space-y-1">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-700">{grade}</span>
                          <span className="text-slate-900 font-bold">{count} alunos</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Tabela de Resultados Filtrados */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Lista de Matrículas do Filtro ({filteredEnrollments.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Aluno</th>
                    <th className="py-3 px-4">Ano Letivo</th>
                    <th className="py-3 px-4">Série / Turno</th>
                    <th className="py-3 px-4">Turma</th>
                    <th className="py-3 px-4">Documentação</th>
                    <th className="py-3 px-4">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        Nenhuma matrícula localizada para os filtros definidos.
                      </td>
                    </tr>
                  ) : (
                    filteredEnrollments.map((item) => {
                      const studentName = item.student
                        ? `${item.student.first_name} ${item.student.last_name}`
                        : 'Aluno não identificado';
                      const stInfo = ENROLLMENT_STATUS_LABELS[item.status];
                      const prog = item.document_progress;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                            {item.enrollment_code}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {studentName}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {item.academic_year}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">{item.grade_level}</span>
                            <span className="text-[10px] text-slate-400 block capitalize">{item.shift}</span>
                          </td>
                          <td className="py-3 px-4">
                            {item.school_class ? (
                              <span className="inline-flex items-center gap-1 font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                {item.school_class.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Sem turma</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] font-semibold text-slate-700">
                              {prog ? `${prog.percent}%` : '0%'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${stInfo.badgeColor}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {stInfo.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEÚDO 2: RELATÓRIO DE PENDÊNCIAS DOCUMENTAIS                           */}
      {/* ========================================================================= */}
      {activeTab === 'pendencias' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Relatório de Documentos Faltantes ou Rejeitados ({documentPendingList.length})
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Alunos com documentação incompleta para cobrança e regularização pela secretaria.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-4">Matrícula</th>
                  <th className="py-3 px-4">Aluno</th>
                  <th className="py-3 px-4">Série</th>
                  <th className="py-3 px-4">Documento Exigido</th>
                  <th className="py-3 px-4">Obrigatoriedade</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documentPendingList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                      <p className="font-semibold text-slate-700">Parabéns! Nenhuma pendência documental encontrada.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Todas as matrículas no filtro atual estão com a documentação em dia.
                      </p>
                    </td>
                  </tr>
                ) : (
                  documentPendingList.map(({ enrollment: e, doc }, idx) => {
                    const studentName = e.student
                      ? `${e.student.first_name} ${e.student.last_name}`
                      : 'Aluno não identificado';

                    return (
                      <tr key={`${e.id}-${doc.id || idx}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {e.enrollment_code}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {studentName}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {e.grade_level}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{doc.document_name}</span>
                        </td>
                        <td className="py-3 px-4">
                          {doc.is_required ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                              Obrigatório
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Opcional
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              doc.status === 'rejeitado'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {doc.status === 'rejeitado' ? 'Rejeitado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 italic text-[11px]">
                          {doc.notes || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
