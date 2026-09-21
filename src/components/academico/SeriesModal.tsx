"use client";

import React, { useState, useEffect } from "react";
import { Series, Course } from "@/types/academico";
import { X, Loader2, GraduationCap } from "lucide-react";

interface SeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    course_id: string;
    name: string;
    description?: string;
    order_index: number;
    is_active: boolean;
  }) => Promise<void>;
  courses: Course[];
  series?: Series | null;
  defaultCourseId?: string;
}

export function SeriesModal({
  isOpen,
  onClose,
  onSave,
  courses,
  series,
  defaultCourseId,
}: SeriesModalProps) {
  const [courseId, setCourseId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [orderIndex, setOrderIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (series) {
      setCourseId(series.course_id);
      setName(series.name);
      setDescription(series.description || "");
      setOrderIndex(series.order_index ?? 0);
      setIsActive(series.is_active);
    } else {
      setCourseId(defaultCourseId || (courses.length > 0 ? courses[0].id : ""));
      setName("");
      setDescription("");
      setOrderIndex(0);
      setIsActive(true);
    }
    setError(null);
  }, [series, defaultCourseId, courses, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome da série/ano escolar é obrigatório.");
      return;
    }
    if (!courseId) {
      setError("Selecione um curso/segmento para vincular a série.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        id: series ? series.id : undefined,
        course_id: courseId,
        name: name.trim(),
        description: description.trim() || undefined,
        order_index: Number(orderIndex) || 0,
        is_active: isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar série.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                {series ? "Editar Série / Ano Escolar" : "Nova Série / Ano Escolar"}
              </h3>
              <p className="text-xs text-slate-500">Ex: 1º Ano, 9º Ano, 3º Ano Médio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Curso / Segmento de Ensino <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
            >
              <option value="" disabled>Selecione o segmento</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {!c.is_active ? "(Inativo)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Nome da Série / Ano <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 6º Ano Fundamental"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Ordem / Nível
              </label>
              <input
                type="number"
                min={0}
                value={orderIndex}
                onChange={(e) => setOrderIndex(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Descrição ou Matriz Curricular (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Detalhes ou referências sobre a faixa etária/matriz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <p className="text-xs font-semibold text-slate-800">Situação da Série</p>
              <p className="text-[11px] text-slate-500">Séries inativas ficam ocultas para novas turmas</p>
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
              {series ? "Salvar Alterações" : "Criar Série"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
