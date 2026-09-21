'use client';

import React, { useState, useEffect } from 'react';
import {
  Enrollment,
  ENROLLMENT_STATUS_LABELS,
  EnrollmentStatus,
  DOCUMENT_STATUS_CONFIG,
} from '@/types/matriculas';
import { getEnrollmentByIdAction } from '@/app/actions/matriculas';
import {
  X,
  GraduationCap,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  History,
  Edit,
  Clock,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Layers,
  FileText,
  Lock,
} from 'lucide-react';

interface EnrollmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollmentId: string;
  currentUserRole: string;
  onOpenChecklist: (enrollment: Enrollment) => void;
  onOpenEdit: (enrollment: Enrollment) => void;
  onOpenHistory: (enrollment: Enrollment) => void;
  onOpenStatusChange: (enrollment: Enrollment) => void;
}

export function EnrollmentDetailModal({
  isOpen,
  onClose,
  enrollmentId,
  currentUserRole,
  onOpenChecklist,
  onOpenEdit,
  onOpenHistory,
  onOpenStatusChange,
}: EnrollmentDetailModalProps) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'documentos' | 'historico'>('geral');

  useEffect(() => {
    if (!isOpen || !enrollmentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getEnrollmentByIdAction(enrollmentId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.enrollment) {
          setEnrollment(res.enrollment);
        } else {
          setError(res.error || 'Não foi possível carregar os detalhes da matrícula.');
        }
      })
      .catch(() => {
        if (isMounted) setError('Erro de conexão ao consultar dados da matrícula.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, enrollmentId]);

  if (!isOpen) return null;

  const canEditAcademic =
    (currentUserRole === 'admin_escola' ||
      currentUserRole === 'super_admin' ||
      currentUserRole === 'secretaria' ||
      currentUserRole === 'coordenacao') &&
    enrollment?.status !== 'cancelado' &&
    enrollment?.status !== 'transferido';

  const canChangeStatus =
    currentUserRole === 'admin_escola' ||
    currentUserRole === 'super_admin' ||
    currentUserRole === 'secretaria' ||
    currentUserRole === 'coordenacao' ||
    currentUserRole === 'comercial';

  const studentName = enrollment?.student
    ? `${enrollment.student.first_name} ${enrollment.student.last_name}`
    : 'Aluno não identificado';

  const statusInfo = enrollment
    ? ENROLLMENT_STATUS_LABELS[enrollment.status]
    : null;

  const progress = enrollment?.document_progress || {
    total: 0,
    received: 0,
    dispensed: 0,
    pending: 0,
    rejected: 0,
    percent: 0,
    isComplete: false,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              {studentName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-lg font-bold text-slate-900">{studentName}</h2>
                {statusInfo && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.badgeColor}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {statusInfo.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Código: <span className="font-mono font-bold text-slate-700">{enrollment?.enrollment_code}</span> •
                Ano Letivo: <span className="font-semibold text-slate-700">{enrollment?.academic_year}</span> •
                Inscrição em: {enrollment?.entry_date ? new Date(enrollment.entry_date).toLocaleDateString('pt-BR') : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar Sub-Header */}
        {enrollment && (
          <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            {/* Abas de Navegação Interna */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setActiveTab('geral')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'geral'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                Visão Geral & Cadastros
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documentos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'documentos'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <span>Documentação</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    progress.isComplete
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {progress.percent}%
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('historico')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'historico'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <span>Linha do Tempo</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-200 text-slate-700">
                  {enrollment.history?.length || 0}
                </span>
              </button>
            </div>

            {/* Ações Rápidas de Gestão */}
            <div className="flex items-center space-x-1.5">
              {canEditAcademic ? (
                <button
                  type="button"
                  onClick={() => onOpenEdit(enrollment)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-500" />
                  <span>Editar Dados</span>
                </button>
              ) : (
                <span
                  title="Edição restrita ou matrícula encerrada"
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-400 bg-slate-200/60 rounded-lg flex items-center space-x-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>Edição Bloqueada</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => onOpenChecklist(enrollment)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Conferir Documentos</span>
              </button>

              {canChangeStatus && (
                <button
                  type="button"
                  onClick={() => onOpenStatusChange(enrollment)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <span>Alterar Situação</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Carregando prontuário detalhado...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && enrollment && (
            <>
              {/* ========================================================================= */}
              {/* ABA 1: VISÃO GERAL & CADASTROS                                            */}
              {/* ========================================================================= */}
              {activeTab === 'geral' && (
                <div className="space-y-6">
                  {/* Grid de 2 Colunas: Alocação Acadêmica + Aluno */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Card 1: Alocação Acadêmica */}
                    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3">
                      <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                        <GraduationCap className="w-4 h-4" />
                        <span>Alocação Acadêmica</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-medium">Ano Letivo</span>
                          <span className="font-bold text-slate-800 text-sm">{enrollment.academic_year}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-medium">Turno</span>
                          <span className="font-bold text-slate-800 text-sm capitalize">{enrollment.shift}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100 col-span-2">
                          <span className="text-[10px] text-slate-400 block font-medium">Curso / Segmento</span>
                          <span className="font-bold text-slate-800">{enrollment.course_name}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100 col-span-2">
                          <span className="text-[10px] text-slate-400 block font-medium">Série / Ano Escolar</span>
                          <span className="font-bold text-indigo-700">{enrollment.grade_level}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100 col-span-2">
                          <span className="text-[10px] text-slate-400 block font-medium">Turma Escolar</span>
                          {enrollment.school_class ? (
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="font-bold text-blue-700 text-sm flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {enrollment.school_class.name}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                                Capacidade: {enrollment.school_class.capacity} alunos
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">
                              Aguardando enturmação (Sem turma vinculada)
                            </span>
                          )}
                        </div>
                      </div>


                      {enrollment.status_notes && (
                        <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-lg text-xs text-amber-900">
                          <span className="font-semibold block text-[10px] text-amber-700 uppercase">
                            Parecer / Observação Atual da Situação:
                          </span>
                          <p className="mt-0.5 italic">{enrollment.status_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Card 2: Prontuário do Aluno */}
                    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3">
                      <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                        <User className="w-4 h-4" />
                        <span>Prontuário do Aluno</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Nome Completo:</span>
                          <span className="font-semibold text-slate-800">{studentName}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">CPF:</span>
                          <span className="font-mono text-slate-800">{enrollment.student?.cpf || 'Não informado'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Data de Nascimento:</span>
                          <span className="text-slate-800">
                            {enrollment.student?.birth_date
                              ? new Date(enrollment.student.birth_date).toLocaleDateString('pt-BR')
                              : 'Não informada'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Gênero:</span>
                          <span className="text-slate-800 capitalize">
                            {enrollment.student?.gender === 'male'
                              ? 'Masculino'
                              : enrollment.student?.gender === 'female'
                              ? 'Feminino'
                              : 'Não informado'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">E-mail / Telefone:</span>
                          <span className="text-slate-800">
                            {enrollment.student?.phone || enrollment.student?.email || 'Não informado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Responsáveis Vinculados */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Responsáveis Vinculados</span>
                      </div>
                      {enrollment.student?.guardians && enrollment.student.guardians.length > 0 && (
                        <span className="text-[11px] text-slate-500">
                          {enrollment.student.guardians.length} cadastrado(s)
                        </span>
                      )}
                    </div>

                    {enrollment.student?.guardians && enrollment.student.guardians.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {enrollment.student.guardians.map((link) => {
                          const g = link.guardian;
                          return (
                            <div
                              key={link.id}
                              className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{g?.name || 'Responsável'}</span>
                                <div className="flex items-center space-x-1">
                                  {link.is_financial && (
                                    <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">
                                      Financeiro
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] uppercase font-semibold">
                                    {link.kinship || 'Vínculo'}
                                  </span>
                                </div>
                              </div>
                              <div className="text-[11px] text-slate-500 space-y-0.5">
                                <p><strong>CPF:</strong> {g?.cpf || 'Não informado'}</p>
                                <p><strong>Telefone:</strong> {g?.phone || g?.whatsapp || 'Não informado'}</p>
                                <p><strong>E-mail:</strong> {g?.email || 'Não informado'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : enrollment.guardian ? (
                      <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{enrollment.guardian.name}</span>
                          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">
                            Principal
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          <span>CPF: {enrollment.guardian.cpf || 'Não informado'} • </span>
                          <span>Contato: {enrollment.guardian.phone || enrollment.guardian.email || 'Não informado'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-400 text-xs bg-white rounded-lg border border-dashed border-slate-200">
                        Nenhum responsável legal diretamente vinculado a esta matrícula.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* ABA 2: DOCUMENTAÇÃO & CONFORMIDADE                                        */}
              {/* ========================================================================= */}
              {activeTab === 'documentos' && (
                <div className="space-y-4">
                  {/* Resumo de Progresso */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Status Geral da Documentação
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {progress.received + progress.dispensed} de {progress.total} documentos validados ({progress.percent}%)
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="w-44 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            progress.isComplete
                              ? 'bg-emerald-500'
                              : progress.rejected > 0
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenChecklist(enrollment)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                      >
                        Abrir Conferência
                      </button>
                    </div>
                  </div>

                  {/* Lista de Documentos */}
                  <div className="space-y-2">
                    {enrollment.documents && enrollment.documents.length > 0 ? (
                      enrollment.documents.map((doc) => {
                        const docCfg = DOCUMENT_STATUS_CONFIG[doc.status];
                        return (
                          <div
                            key={doc.id}
                            className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-3">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-slate-800">{doc.document_name}</span>
                                  {doc.is_required ? (
                                    <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1 py-0.2 rounded">
                                      Obrigatório
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                                      Opcional
                                    </span>
                                  )}
                                </div>
                                {doc.notes && (
                                  <p className="text-[11px] text-slate-500 italic mt-0.5">{doc.notes}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              {doc.received_at && (
                                <span className="text-[10px] text-slate-400">
                                  Entregue em: {new Date(doc.received_at).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${docCfg.badgeColor}`}
                              >
                                {docCfg.label}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Nenhum documento exigido para esta matrícula.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* ABA 3: HISTÓRICO & LINHA DO TEMPO                                         */}
              {/* ========================================================================= */}
              {activeTab === 'historico' && (
                <div className="space-y-4">
                  {enrollment.history && enrollment.history.length > 0 ? (
                    <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 space-y-4">
                      {enrollment.history.map((item, idx) => {
                        const isAcademic = item.action_type === 'ACADEMIC_DATA_UPDATED';
                        const isStatus = item.action_type === 'STATUS_CHANGED';
                        const isCreated = item.action_type === 'ENROLLMENT_CREATED';

                        return (
                          <div key={item.id || idx} className="relative group text-xs">
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

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-800">
                                  {isAcademic
                                    ? 'Alteração de Dados Acadêmicos'
                                    : isStatus
                                    ? 'Transição de Situação'
                                    : 'Criação da Matrícula'}
                                </span>
                                <span className="text-slate-400">
                                  {new Date(item.created_at).toLocaleString('pt-BR')} • {item.changed_by_name || 'Sistema'}
                                </span>
                              </div>

                              {item.reason && (
                                <p className="text-[11px] text-slate-600 italic">
                                  <strong>Motivo:</strong> {item.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Nenhum histórico adicional registrado para esta matrícula.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Fechar Prontuário
          </button>
        </div>
      </div>
    </div>
  );
}
