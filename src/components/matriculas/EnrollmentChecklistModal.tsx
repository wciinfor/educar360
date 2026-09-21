"use client";

import React, { useState, useTransition } from "react";
import {
  Enrollment,
  EnrollmentDocumentItem,
  EnrollmentDocumentStatus,
  DOCUMENT_STATUS_CONFIG,
} from "@/types/matriculas";
import {
  updateEnrollmentDocumentStatusAction,
  addCustomEnrollmentDocumentAction,
} from "@/app/actions/matriculas";
import {
  X,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Plus,
  ShieldCheck,
  Calendar,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface EnrollmentChecklistModalProps {
  enrollment: Enrollment;
  isOpen: boolean;
  onClose: () => void;
  onDocumentsUpdated: (updatedDocs: EnrollmentDocumentItem[]) => void;
  canEdit: boolean;
}

export function EnrollmentChecklistModal({
  enrollment,
  isOpen,
  onClose,
  onDocumentsUpdated,
  canEdit,
}: EnrollmentChecklistModalProps) {
  const [docs, setDocs] = useState<EnrollmentDocumentItem[]>(enrollment.documents || []);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docNotes, setDocNotes] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocRequired, setNewDocRequired] = useState(true);

  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Cálculo de progresso local
  const total = docs.length;
  const received = docs.filter((d) => d.status === "recebido").length;
  const dispensed = docs.filter((d) => d.status === "dispensado").length;
  const pending = docs.filter((d) => d.status === "pendente").length;
  const rejected = docs.filter((d) => d.status === "rejeitado").length;
  const percent = total > 0 ? Math.round(((received + dispensed) / total) * 100) : 0;
  const isComplete =
    total > 0 &&
    docs
      .filter((d) => d.is_required)
      .every((d) => d.status === "recebido" || d.status === "dispensado");

  // Atualizar status de um documento
  const handleUpdateStatus = (
    documentItem: EnrollmentDocumentItem,
    newStatus: EnrollmentDocumentStatus,
    customNote?: string
  ) => {
    if (!canEdit) return;
    setActionError(null);

    const noteToSave = customNote !== undefined ? customNote : documentItem.notes || "";

    startTransition(async () => {
      const res = await updateEnrollmentDocumentStatusAction({
        enrollmentId: enrollment.id,
        documentId: documentItem.id,
        documentType: documentItem.document_type,
        status: newStatus,
        notes: noteToSave,
      });

      if (res.success) {
        const receivedAt =
          newStatus === "recebido" ? new Date().toISOString() : null;

        const updated = docs.map((d) =>
          d.id === documentItem.id
            ? {
                ...d,
                status: newStatus,
                notes: noteToSave,
                received_at: receivedAt,
              }
            : d
        );

        setDocs(updated);
        onDocumentsUpdated(updated);
        setEditingDocId(null);
        setToastMessage(`Documento "${documentItem.document_name}" atualizado para ${DOCUMENT_STATUS_CONFIG[newStatus].label}.`);
      } else {
        setActionError(res.error || "Erro ao atualizar documento.");
      }
    });
  };

  // Adicionar documento extra à matrícula
  const handleAddCustomDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    setActionError(null);

    startTransition(async () => {
      const res = await addCustomEnrollmentDocumentAction({
        enrollmentId: enrollment.id,
        documentName: newDocName.trim(),
        isRequired: newDocRequired,
      });

      if (res.success) {
        const newDoc: EnrollmentDocumentItem = {
          id: crypto.randomUUID(),
          enrollment_id: enrollment.id,
          tenant_id: enrollment.tenant_id,
          document_type: newDocName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          document_name: newDocName.trim(),
          status: "pendente",
          is_required: newDocRequired,
          received_at: null,
          verified_by: null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updated = [...docs, newDoc];
        setDocs(updated);
        onDocumentsUpdated(updated);
        setIsAddingCustom(false);
        setNewDocName("");
        setToastMessage(`Documento "${newDocName}" adicionado à checklist da matrícula.`);
      } else {
        setActionError(res.error || "Erro ao adicionar documento.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 my-8">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Checklist Documental da Matrícula
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {enrollment.enrollment_code} • {enrollment.academic_year}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Aluno & Barra de Progresso */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Aluno(a):</span>
              <strong className="text-sm font-bold text-slate-900 block">
                {enrollment.student
                  ? `${enrollment.student.first_name} ${enrollment.student.last_name}`
                  : "Aluno"}
              </strong>
              <span className="text-xs text-slate-500">
                {enrollment.grade_level} • {enrollment.course_name} ({enrollment.shift})
              </span>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  isComplete
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {isComplete ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Documentação Completa</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{pending} {pending === 1 ? "pendência" : "pendências"}</span>
                  </>
                )}
              </span>
              <span className="block text-[11px] text-slate-400 font-mono mt-0.5">
                {received + dispensed} de {total} documentos entregues
              </span>
            </div>
          </div>

          {/* Barra de Progresso Visual */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Progresso Documental</span>
              <span>{percent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${(received / (total || 1)) * 100}%` }}
                title={`${received} recebidos`}
              />
              <div
                className="bg-slate-400 transition-all duration-300"
                style={{ width: `${(dispensed / (total || 1)) * 100}%` }}
                title={`${dispensed} dispensados`}
              />
              <div
                className="bg-rose-400 transition-all duration-300"
                style={{ width: `${(rejected / (total || 1)) * 100}%` }}
                title={`${rejected} rejeitados`}
              />
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> {received} recebidos
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> {pending} pendentes
              </span>
              {dispensed > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400" /> {dispensed} dispensados
                </span>
              )}
              {rejected > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> {rejected} rejeitados
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {toastMessage && (
          <div className="p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Lista de Documentos Exigidos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Documentos Exigidos para Esta Matrícula
            </span>
            {canEdit && !isAddingCustom && (
              <button
                type="button"
                onClick={() => setIsAddingCustom(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Documento Extra</span>
              </button>
            )}
          </div>

          {/* Formulário Inline de Adição de Documento Extra */}
          {isAddingCustom && (
            <form
              onSubmit={handleAddCustomDocument}
              className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200 text-xs space-y-2.5"
            >
              <div className="flex items-center justify-between font-bold text-indigo-900">
                <span>Adicionar Novo Documento à Matrícula</span>
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="text-indigo-500 hover:text-indigo-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="Ex: Laudo Oftalmológico, Termo de Imagem..."
                    className="w-full px-3 py-1.5 border border-indigo-200 rounded-lg bg-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newDocRequired}
                      onChange={(e) => setNewDocRequired(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                    <span>Obrigatório</span>
                  </label>
                  <button
                    type="submit"
                    disabled={isPending || !newDocName.trim()}
                    className="ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Itens do Checklist */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {docs.map((doc) => {
              const cfg = DOCUMENT_STATUS_CONFIG[doc.status];
              const isEditing = editingDocId === doc.id;

              return (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {doc.document_name}
                          </span>
                          {doc.is_required ? (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold">
                              Obrigatório
                            </span>
                          ) : (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-semibold">
                              Facultativo
                            </span>
                          )}
                        </div>

                        {doc.received_at && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Recebido em: {new Date(doc.received_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}

                        {doc.notes && !isEditing && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 mt-1">
                            <strong>Obs:</strong> {doc.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Badge de Status e Botões Rápidos */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.badgeColor}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {cfg.label}
                      </span>

                      {canEdit && (
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                          <button
                            type="button"
                            disabled={isPending || doc.status === "recebido"}
                            onClick={() => handleUpdateStatus(doc, "recebido")}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40 cursor-pointer"
                            title="Marcar como Recebido"
                          >
                            Receber
                          </button>

                          <button
                            type="button"
                            disabled={isPending || doc.status === "dispensado"}
                            onClick={() => handleUpdateStatus(doc, "dispensado")}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold text-slate-700 hover:bg-white transition-colors disabled:opacity-40 cursor-pointer"
                            title="Dispensar Documento"
                          >
                            Dispensar
                          </button>

                          <button
                            type="button"
                            disabled={isPending || doc.status === "rejeitado"}
                            onClick={() => {
                              setEditingDocId(doc.id);
                              setDocNotes(doc.notes || "Documento ilegível ou inválido");
                            }}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold text-rose-700 hover:bg-white transition-colors disabled:opacity-40 cursor-pointer"
                            title="Rejeitar Documento com Motivo"
                          >
                            Rejeitar
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingDocId(null);
                              } else {
                                setEditingDocId(doc.id);
                                setDocNotes(doc.notes || "");
                              }
                            }}
                            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-white transition-colors cursor-pointer"
                            title="Adicionar / Editar Observação"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Editor Inline de Observação */}
                  {isEditing && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={docNotes}
                          onChange={(e) => setDocNotes(e.target.value)}
                          placeholder="Informe a observação ou motivo da rejeição..."
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(doc, doc.status, docNotes)}
                          disabled={isPending}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Salvar Obs
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDocId(null)}
                          className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Conferência autenticada e auditada pelo sistema.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
