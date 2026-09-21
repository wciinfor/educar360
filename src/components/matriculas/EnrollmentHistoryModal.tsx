'use client';

import React, { useState, useEffect } from 'react';
import { Enrollment, EnrollmentHistoryItem, ENROLLMENT_STATUS_LABELS, EnrollmentStatus } from '@/types/matriculas';
import { getEnrollmentHistoryAction } from '@/app/actions/matriculas';
import {
  X,
  History,
  Clock,
  User,
  GraduationCap,
  ArrowRight,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface EnrollmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollment: Enrollment;
}

export function EnrollmentHistoryModal({
  isOpen,
  onClose,
  enrollment,
}: EnrollmentHistoryModalProps) {
  const [history, setHistory] = useState<EnrollmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    getEnrollmentHistoryAction(enrollment.id)
      .then((res) => {
        if (!mounted) return;
        if (res.success) {
          setHistory(res.history);
        } else {
          setError(res.error || 'Não foi possível carregar o histórico.');
        }
      })
      .catch(() => {
        if (mounted) setError('Erro de conexão ao buscar histórico.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, enrollment.id]);

  if (!isOpen) return null;

  const studentName = enrollment.student
    ? `${enrollment.student.first_name} ${enrollment.student.last_name}`
    : 'Aluno não identificado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Histórico & Linha do Tempo da Matrícula
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Carregando linha do tempo...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="text-xs font-medium text-slate-600">
                Nenhum evento adicional registrado no histórico.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Alterações de dados acadêmicos ou situação alimentarão esta linha do tempo.
              </p>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 space-y-6">
              {history.map((item, index) => {
                const dateStr = new Date(item.created_at).toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                });

                const isAcademic = item.action_type === 'ACADEMIC_DATA_UPDATED';
                const isStatus = item.action_type === 'STATUS_CHANGED';
                const isCreated = item.action_type === 'ENROLLMENT_CREATED';

                return (
                  <div key={item.id || index} className="relative group">
                    {/* Marcador na Timeline */}
                    <div
                      className={`absolute -left-[27px] top-1.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                        isAcademic
                          ? 'bg-blue-600 text-white'
                          : isStatus
                          ? 'bg-purple-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isAcademic ? (
                        <GraduationCap className="w-2.5 h-2.5" />
                      ) : isStatus ? (
                        <History className="w-2.5 h-2.5" />
                      ) : (
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      )}
                    </div>

                    {/* Card de Informação */}
                    <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl p-4 transition-colors">
                      {/* Top Header do Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isAcademic
                                ? 'bg-blue-100 text-blue-800'
                                : isStatus
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isAcademic
                              ? 'Alteração de Dados Acadêmicos'
                              : isStatus
                              ? 'Transição de Situação'
                              : 'Criação da Matrícula'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{dateStr}</span>
                          </span>
                          <span className="flex items-center space-x-1 font-medium text-slate-600">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{item.changed_by_name || 'Sistema'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Conteúdo de Comparação (Valores Anteriores vs Novos) */}
                      {isAcademic && (
                        <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200/80 text-xs space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-2 bg-slate-50 rounded border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                Dados Anteriores
                              </span>
                              <div className="text-slate-700 space-y-0.5 text-[11px]">
                                <p><strong>Ano:</strong> {item.previous_values?.academic_year || '—'}</p>
                                <p><strong>Curso:</strong> {item.previous_values?.course_name || '—'}</p>
                                <p><strong>Série:</strong> {item.previous_values?.grade_level || '—'}</p>
                                <p><strong>Turno:</strong> <span className="capitalize">{item.previous_values?.shift || '—'}</span></p>
                              </div>
                            </div>

                            <div className="p-2 bg-blue-50/50 rounded border border-blue-100">
                              <span className="text-[10px] font-bold text-blue-700 uppercase block mb-1">
                                Novos Dados Definidos
                              </span>
                              <div className="text-slate-800 space-y-0.5 text-[11px]">
                                <p><strong>Ano:</strong> {item.new_values?.academic_year || '—'}</p>
                                <p><strong>Curso:</strong> {item.new_values?.course_name || '—'}</p>
                                <p><strong>Série:</strong> {item.new_values?.grade_level || '—'}</p>
                                <p><strong>Turno:</strong> <span className="capitalize">{item.new_values?.shift || '—'}</span></p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isStatus && (
                        <div className="mt-2 flex items-center space-x-3 text-xs">
                          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400">De:</span>
                            <span className="font-semibold text-slate-700">
                              {item.previous_values?.status
                                ? ENROLLMENT_STATUS_LABELS[item.previous_values.status as EnrollmentStatus]?.label || item.previous_values.status
                                : 'Inicial'}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400">Para:</span>
                            <span className="font-semibold text-indigo-700">
                              {item.new_values?.status
                                ? ENROLLMENT_STATUS_LABELS[item.new_values.status as EnrollmentStatus]?.label || item.new_values.status
                                : '—'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Justificativa do Registro */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-start space-x-1.5 text-xs text-slate-600">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-700">Justificativa: </span>
                          <span className="italic">{item.reason}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
