'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
import { Enrollment, EnrollmentShift } from '@/types/matriculas';
import { Course, Series, SchoolClass } from '@/types/academico';
import { updateEnrollmentAcademicDataAction } from '@/app/actions/matriculas';
import {
  X,
  GraduationCap,
  Calendar,
  Layers,
  Clock,
  AlertTriangle,
  FileEdit,
  Save,
  CheckCircle2,
  Lock,
  Users,
  AlertCircle,
} from 'lucide-react';

interface EnrollmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollment: Enrollment;
  canEdit: boolean;
  courses?: Course[];
  seriesList?: Series[];
  schoolClasses?: SchoolClass[];
  onUpdated: (updatedData: {
    academic_year: string;
    course_name: string;
    grade_level: string;
    shift: EnrollmentShift;
    class_id?: string | null;
    school_class?: SchoolClass | null;
  }) => void;
}

const DEFAULT_COURSES = [
  'Educação Infantil',
  'Ensino Fundamental I',
  'Ensino Fundamental II',
  'Ensino Médio',
  'Ensino Técnico',
];

const DEFAULT_GRADE_LEVELS = [
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

export function EnrollmentEditModal({
  isOpen,
  onClose,
  enrollment,
  canEdit,
  courses = [],
  seriesList = [],
  schoolClasses = [],
  onUpdated,
}: EnrollmentEditModalProps) {
  const [academicYear, setAcademicYear] = useState(enrollment.academic_year);
  const [courseName, setCourseName] = useState(enrollment.course_name);
  const [gradeLevel, setGradeLevel] = useState(enrollment.grade_level);
  const [shift, setShift] = useState<EnrollmentShift>(enrollment.shift);
  const [classId, setClassId] = useState<string>(enrollment.class_id || '');
  const [reason, setReason] = useState('');

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Apenas itens ativos da estrutura acadêmica
  const activeCourses = useMemo(() => courses.filter((c) => c.is_active), [courses]);
  const activeSeries = useMemo(() => seriesList.filter((s) => s.is_active), [seriesList]);
  const activeClasses = useMemo(() => schoolClasses.filter((c) => c.is_active), [schoolClasses]);

  // Encontra o curso selecionado (se houver cadastro acadêmico)
  const selectedCourse = activeCourses.find((c) => c.name === courseName);

  // Séries filtradas por curso selecionado
  const availableSeries = useMemo(() => {
    if (!selectedCourse) return [];
    return activeSeries.filter((s) => s.course_id === selectedCourse.id);
  }, [selectedCourse, activeSeries]);

  // Encontra a série selecionada
  const selectedSeries = availableSeries.find((s) => s.name === gradeLevel);

  // Turmas filtradas por Série, Ano Letivo e Turno
  const compatibleClasses = useMemo(() => {
    if (!selectedSeries) return [];
    return activeClasses.filter(
      (c) =>
        c.series_id === selectedSeries.id &&
        c.academic_year === academicYear &&
        c.shift === shift
    );
  }, [selectedSeries, activeClasses, academicYear, shift]);

  // Informações da turma selecionada no momento
  const currentSelectedClass = activeClasses.find((c) => c.id === classId);

  useEffect(() => {
    if (enrollment) {
      setAcademicYear(enrollment.academic_year);
      setCourseName(enrollment.course_name);
      setGradeLevel(enrollment.grade_level);
      setShift(enrollment.shift);
      setClassId(enrollment.class_id || '');
      setReason('');
      setErrorMessage(null);
    }
  }, [enrollment, isOpen]);

  if (!isOpen) return null;

  const isBlocked =
    enrollment.status === 'cancelado' || enrollment.status === 'transferido';

  const hasChanges =
    academicYear !== enrollment.academic_year ||
    courseName !== enrollment.course_name ||
    gradeLevel !== enrollment.grade_level ||
    shift !== enrollment.shift ||
    classId !== (enrollment.class_id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isBlocked) {
      setErrorMessage(
        'Não é permitido alterar dados de matrículas canceladas ou transferidas.'
      );
      return;
    }

    if (!canEdit) {
      setErrorMessage('Seu perfil não possui permissão para editar esta matrícula.');
      return;
    }

    if (!hasChanges) {
      setErrorMessage('Nenhum dado acadêmico foi alterado.');
      return;
    }

    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMessage(
        'Informe a justificativa da alteração acadêmica (mínimo de 5 caracteres).'
      );
      return;
    }

    startTransition(async () => {
      const res = await updateEnrollmentAcademicDataAction({
        enrollmentId: enrollment.id,
        academic_year: academicYear,
        course_name: courseName,
        grade_level: gradeLevel,
        shift,
        class_id: classId || null,
        reason: reason.trim(),
      });

      if (res.success) {
        onUpdated({
          academic_year: academicYear,
          course_name: courseName,
          grade_level: gradeLevel,
          shift,
          class_id: classId || null,
          school_class: currentSelectedClass || null,
        });
        onClose();
      } else {
        setErrorMessage(res.error || 'Erro ao atualizar dados acadêmicos.');
      }
    });
  };

  const studentName = enrollment.student
    ? `${enrollment.student.first_name} ${enrollment.student.last_name}`
    : 'Aluno não identificado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Editar Dados Acadêmicos & Turma
              </h2>
              <p className="text-xs text-slate-500">
                {studentName} • Matrícula <span className="font-mono font-semibold">{enrollment.enrollment_code}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerta de Bloqueio se cancelado/transferido */}
        {isBlocked && (
          <div className="mx-5 mt-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5">
            <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800">
              <p className="font-bold">Edição Bloqueada</p>
              <p className="mt-0.5">
                Esta matrícula está <strong>{enrollment.status === 'cancelado' ? 'Cancelada' : 'Transferida'}</strong>. Por conformidade pedagógica e integridade de registros, matrículas encerradas não podem ter seus dados acadêmicos alterados.
              </p>
            </div>
          </div>
        )}

        {/* Feedback de Erro */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <fieldset disabled={isBlocked || isPending || !canEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Ano Letivo */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ano Letivo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={academicYear}
                    onChange={(e) => {
                      setAcademicYear(e.target.value);
                      setClassId('');
                    }}
                    placeholder="2026"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Turno */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Turno <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={shift}
                    onChange={(e) => {
                      setShift(e.target.value as EnrollmentShift);
                      setClassId('');
                    }}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="matutino">Matutino</option>
                    <option value="vespertino">Vespertino</option>
                    <option value="noturno">Noturno</option>
                    <option value="integral">Integral</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Curso / Segmento */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Curso / Segmento de Ensino <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={courseName}
                  onChange={(e) => {
                    const newCourse = e.target.value;
                    setCourseName(newCourse);
                    const foundC = activeCourses.find((c) => c.name === newCourse);
                    const relSeries = foundC ? activeSeries.filter((s) => s.course_id === foundC.id) : [];
                    setGradeLevel(relSeries.length > 0 ? relSeries[0].name : '');
                    setClassId('');
                  }}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer"
                >
                  {activeCourses.length > 0 ? (
                    activeCourses.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  ) : (
                    DEFAULT_COURSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Série / Ano */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Série / Ano Escolar <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Layers className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={gradeLevel}
                  onChange={(e) => {
                    setGradeLevel(e.target.value);
                    setClassId('');
                  }}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer"
                >
                  {availableSeries.length > 0 ? (
                    availableSeries.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))
                  ) : (
                    DEFAULT_GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Seleção de Turma Escolar (Fase 2) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Turma Escolar (Enturmação)
              </label>
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white cursor-pointer"
                >
                  <option value="">Sem turma vinculada (Aguardando enturmação)</option>
                  {compatibleClasses.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.name} (Capacidade: {cl.capacity} alunos)
                    </option>
                  ))}
                </select>
              </div>

              {compatibleClasses.length === 0 && selectedSeries && (
                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Nenhuma turma ativa cadastrada para {selectedSeries.name} no turno {shift} ({academicYear}).
                </p>
              )}

              {currentSelectedClass && (
                <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Turma selecionada: <strong>{currentSelectedClass.name}</strong></span>
                  <span className="font-mono text-slate-500">Capacidade: {currentSelectedClass.capacity} vagas</span>
                </div>
              )}
            </div>

            {/* Justificativa Obrigatória */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block font-semibold text-slate-700 mb-1">
                Motivo / Justificativa da Alteração <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Mudança de turma solicitada pelos pais / remanejamento de turno..."
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Esta justificativa será salva permanentemente na linha do tempo da matrícula.
              </span>
            </div>
          </fieldset>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isBlocked || isPending || !canEdit || !hasChanges || reason.trim().length < 5}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isPending ? 'Salvando...' : 'Salvar Alteração'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

