"use client";

import React, { useState, useEffect } from "react";
import { SchoolClass, Series, Course, AcademicShift } from "@/types/academico";
import { SchoolYear } from "@/types/calendario";
import { X, Loader2, Users, Calendar } from "lucide-react";

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    series_id: string;
    school_year_id?: string | null;
    name: string;
    academic_year: string;
    shift: AcademicShift;
    capacity: number;
    is_active: boolean;
  }) => Promise<void>;
  seriesList: Series[];
  courses: Course[];
  schoolYears?: SchoolYear[];
  schoolClass?: SchoolClass | null;
  defaultSeriesId?: string;
}

export function ClassModal({
  isOpen,
  onClose,
  onSave,
  seriesList,
  courses,
  schoolYears = [],
  schoolClass,
  defaultSeriesId,
}: ClassModalProps) {
  const currentYear = new Date().getFullYear().toString();
  const [seriesId, setSeriesId] = useState("");
  const [name, setName] = useState("");
  const [schoolYearId, setSchoolYearId] = useState("");
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [shift, setShift] = useState<AcademicShift>("matutino");
  const [capacity, setCapacity] = useState(30);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schoolClass) {
      setSeriesId(schoolClass.series_id);
      setName(schoolClass.name);
      setSchoolYearId(schoolClass.school_year_id || "");
      setAcademicYear(schoolClass.academic_year);
      setShift(schoolClass.shift);
      setCapacity(schoolClass.capacity);
      setIsActive(schoolClass.is_active);
    } else {
      setSeriesId(defaultSeriesId || (seriesList.length > 0 ? seriesList[0].id : ""));
      setName("");
      const currentDefaultYear = schoolYears.find((y) => y.is_current) || schoolYears[0];
      if (currentDefaultYear) {
        setSchoolYearId(currentDefaultYear.id);
        setAcademicYear(currentDefaultYear.year);
      } else {
        setSchoolYearId("");
        setAcademicYear(currentYear);
      }
      setShift("matutino");
      setCapacity(30);
      setIsActive(true);
    }
    setError(null);
  }, [schoolClass, defaultSeriesId, seriesList, schoolYears, currentYear, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome da turma é obrigatório (Ex: Turma A, 1º Ano B).");
      return;
    }
    if (!seriesId) {
      setError("Selecione uma série para vincular a turma.");
      return;
    }
    if (schoolYears.length > 0 && !schoolYearId) {
      setError("Selecione um Ano Letivo cadastrado no Calendário Acadêmico.");
      return;
    }
    if (!academicYear.trim()) {
      setError("O ano letivo é obrigatório.");
      return;
    }
    if (capacity <= 0) {
      setError("A capacidade deve ser maior que 0.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        id: schoolClass ? schoolClass.id : undefined,
        series_id: seriesId,
        school_year_id: schoolYearId || undefined,
        name: name.trim(),
        academic_year: academicYear.trim(),
        shift,
        capacity: Number(capacity),
        is_active: isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar turma.");
    } finally {
      setSubmitting(false);
    }
  };

  const coursesMap = new Map(courses.map((c) => [c.id, c.name]));

  const isCreating = !schoolClass;
  const hasNoSchoolYears = schoolYears.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                {schoolClass ? "Editar Turma" : "Nova Turma"}
              </h3>
              <p className="text-xs text-slate-500">Defina série, ano letivo, turno e capacidade de alunos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isCreating && hasNoSchoolYears ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
              <Calendar className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Nenhum Ano Letivo Cadastrado</p>
                <p className="text-amber-700 leading-relaxed">
                  Para criar novas turmas no sistema, é obrigatório cadastrar previamente o <strong>Ano Letivo</strong> correspondente no Calendário Acadêmico.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Fechar
              </button>
              <a
                href="/app/academico/calendario"
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
              >
                <Calendar className="w-4 h-4" />
                <span>Cadastrar Ano Letivo</span>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Série / Ano Escolar <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
              >
                <option value="" disabled>Selecione a série</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({coursesMap.get(s.course_id) || "Segmento"}) {!s.is_active ? "- Inativo" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nome da Turma <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Turma A, Sala 101"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Ano Letivo <span className="text-rose-500">*</span>
                </label>
                {schoolYears.length > 0 ? (
                  <select
                    required
                    value={schoolYearId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setSchoolYearId(selId);
                      const found = schoolYears.find((y) => y.id === selId);
                      if (found) setAcademicYear(found.year);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
                  >
                    <option value="" disabled>Selecione o Ano Letivo</option>
                    {schoolYears.map((sy) => (
                      <option key={sy.id} value={sy.id}>
                        {sy.year} — {sy.title} {sy.is_current ? "★ (Atual)" : `(${sy.status})`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={`${academicYear} (Legado)`}
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                  />
                )}
              </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Turno <span className="text-rose-500">*</span>
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as AcademicShift)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
              >
                <option value="matutino">Matutino (Manhã)</option>
                <option value="vespertino">Vespertino (Tarde)</option>
                <option value="noturno">Noturno (Noite)</option>
                <option value="integral">Integral</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Capacidade Máxima <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <p className="text-xs font-semibold text-slate-800">Situação da Turma</p>
              <p className="text-[11px] text-slate-500">Turmas ativas aceitam matrículas e enturmações</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {schoolClass ? "Salvar Alterações" : "Criar Turma"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
