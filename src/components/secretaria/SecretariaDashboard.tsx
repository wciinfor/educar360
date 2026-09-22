"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Student, Guardian } from "@/types/secretaria";
import { StudentModal } from "./StudentModal";
import { GuardianModal } from "./GuardianModal";
import { toggleStudentStatusAction, toggleGuardianStatusAction } from "@/app/actions/secretaria";
import {
  Users,
  UserCheck,
  Search,
  Plus,
  Edit2,
  Eye,
  DollarSign,
  BookOpen,
  CheckCircle2,
  XCircle,
  UserX,
  Printer,
} from "lucide-react";
import { printStudentCard } from "@/lib/utils/studentPdf";

interface SecretariaDashboardProps {
  initialStudents: Student[];
  initialGuardians: Guardian[];
  tenantName: string;
}

export function SecretariaDashboard({
  initialStudents,
  initialGuardians,
  tenantName,
}: SecretariaDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"students" | "guardians">("students");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false);
  const [guardianToEdit, setGuardianToEdit] = useState<Guardian | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const filteredStudents = initialStudents.filter((s) => {
    const matchesStatus =
      statusFilter === "all" ? true : statusFilter === "active" ? s.is_active : !s.is_active;

    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      s.full_name?.toLowerCase().includes(term) ||
      s.cpf?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term);

    return matchesStatus && matchesSearch;
  });

  const filteredGuardians = initialGuardians.filter((g) => {
    const matchesStatus =
      statusFilter === "all" ? true : statusFilter === "active" ? g.is_active : !g.is_active;

    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      g.name?.toLowerCase().includes(term) ||
      g.cpf?.toLowerCase().includes(term) ||
      g.email?.toLowerCase().includes(term) ||
      g.phone?.toLowerCase().includes(term) ||
      g.whatsapp?.toLowerCase().includes(term);

    return matchesStatus && matchesSearch;
  });

  async function handleToggleStudentStatus(id: string, current: boolean) {
    if (confirm("Deseja alterar o status deste aluno?")) {
      const res = await toggleStudentStatusAction(id, !current);
      if (res.success) {
        startTransition(() => {
          router.refresh();
        });
      }
    }
  }

  async function handleToggleGuardianStatus(id: string, current: boolean) {
    if (confirm("Deseja alterar o status deste responsável?")) {
      const res = await toggleGuardianStatusAction(id, !current);
      if (res.success) {
        startTransition(() => {
          router.refresh();
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Módulo Secretaria</h1>
            <p className="text-xs text-slate-500">
              Gestão de Alunos, Responsáveis Legais e Vínculos da instituição{" "}
              <strong className="text-slate-700">{tenantName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setGuardianToEdit(null);
              setIsGuardianModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4 text-slate-600" />
            + Responsável
          </button>

          <button
            type="button"
            onClick={() => {
              setStudentToEdit(null);
              setIsStudentModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Novo Aluno
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("students")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "students"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Alunos ({initialStudents.length})
            </button>
            <button
              onClick={() => setActiveTab("guardians")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "guardians"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Responsáveis ({initialGuardians.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={activeTab === "students" ? "Buscar por aluno, CPF..." : "Buscar responsável..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl w-60 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700"
            >
              <option value="all">Todos os status</option>
              <option value="active">Apenas Ativos</option>
              <option value="inactive">Apenas Inativos</option>
            </select>
          </div>
        </div>

        {activeTab === "students" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Aluno</th>
                  <th className="px-6 py-3">Documentos / Nascimento</th>
                  <th className="px-6 py-3">Responsáveis Vinculados</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((std) => (
                    <tr key={std.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden border border-slate-200">
                            {std.photo_url ? (
                              <img src={std.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              `${std.first_name[0] || ""}${std.last_name[0] || ""}`
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{std.full_name}</div>
                            <div className="text-[11px] text-slate-400">
                              {std.email || "Sem e-mail cadastrado"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 space-y-0.5">
                        <div className="text-slate-800 font-medium">CPF: {std.cpf || "—"}</div>
                        <div className="text-[11px] text-slate-400">
                          Nasc:{" "}
                          {std.birth_date
                            ? new Date(std.birth_date + "T00:00:00").toLocaleDateString("pt-BR")
                            : "—"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {std.guardians && std.guardians.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {std.guardians.map((g) => (
                              <div key={g.id} className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-semibold text-slate-800">
                                  {g.guardian?.name || "Responsável"}
                                </span>
                                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-sm text-[10px] uppercase font-bold">
                                  {g.kinship}
                                </span>
                                {g.is_financial && (
                                  <span className="text-emerald-700 bg-emerald-50 px-1 rounded-sm text-[10px]" title="Responsável Financeiro">
                                    Fin
                                  </span>
                                )}
                                {g.is_pedagogical && (
                                  <span className="text-indigo-700 bg-indigo-50 px-1 rounded-sm text-[10px]" title="Responsável Pedagógico">
                                    Ped
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sem responsável</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            std.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {std.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingStudent(std)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Visualizar Ficha"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStudentToEdit(std);
                              setIsStudentModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStudentStatus(std.id, std.is_active)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              std.is_active
                                ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={std.is_active ? "Inativar" : "Ativar"}
                          >
                            {std.is_active ? <UserX className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Nenhum aluno encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "guardians" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Responsável</th>
                  <th className="px-6 py-3">CPF / Contato</th>
                  <th className="px-6 py-3">Atribuições</th>
                  <th className="px-6 py-3">Endereço</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGuardians.length > 0 ? (
                  filteredGuardians.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">{g.name}</div>
                        <div className="text-[11px] text-slate-400 capitalize">
                          {g.profession || "Profissão não informada"} • {g.kinship}
                        </div>
                      </td>

                      <td className="px-6 py-4 space-y-0.5">
                        <div className="font-semibold text-slate-800">CPF: {g.cpf}</div>
                        <div className="text-[11px] text-slate-500">
                          {g.whatsapp || g.phone || "Sem telefone"} {g.email ? `• ${g.email}` : ""}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {g.is_financial_responsible && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                              <DollarSign className="w-3.5 h-3.5" /> Financeiro Padrão
                            </span>
                          )}
                          {g.is_pedagogical_responsible && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 font-medium">
                              <BookOpen className="w-3.5 h-3.5" /> Pedagógico Padrão
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-[11px] text-slate-500">
                        {g.city ? `${g.city} / ${g.state || ""}` : "Endereço não cadastrado"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            g.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {g.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setGuardianToEdit(g);
                              setIsGuardianModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleGuardianStatus(g.id, g.is_active)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              g.is_active
                                ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={g.is_active ? "Inativar" : "Ativar"}
                          >
                            {g.is_active ? <UserX className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Nenhum responsável cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        studentToEdit={studentToEdit}
        onSaved={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
      />

      <GuardianModal
        isOpen={isGuardianModalOpen}
        onClose={() => setIsGuardianModalOpen(false)}
        guardianToEdit={guardianToEdit}
        onSaved={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
      />

      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Ficha Cadastral do Aluno</h3>
                <p className="text-xs text-slate-500">Documento interno da secretaria escolar</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingStudent(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Fechar Ficha"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-600">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 font-bold text-base flex items-center justify-center border-2 border-white shadow-xs shrink-0 overflow-hidden">
                  {viewingStudent.photo_url ? (
                    <img src={viewingStudent.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    `${viewingStudent.first_name[0] || ""}${viewingStudent.last_name[0] || ""}`
                  )}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">{viewingStudent.full_name}</h4>
                  <p className="text-slate-500">
                    CPF: {viewingStudent.cpf || "Não informado"} • RG: {viewingStudent.rg || "Não informado"}
                  </p>
                  <p className="text-slate-500">
                    Nascimento:{" "}
                    {viewingStudent.birth_date
                      ? new Date(viewingStudent.birth_date + "T00:00:00").toLocaleDateString("pt-BR")
                      : "Não informado"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Responsáveis Legais Vinculados
                </h5>
                {viewingStudent.guardians && viewingStudent.guardians.length > 0 ? (
                  <div className="space-y-2">
                    {viewingStudent.guardians.map((g) => (
                      <div key={g.id} className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900">{g.guardian?.name}</p>
                          <p className="text-[11px] text-slate-500">
                            Parentesco: {g.kinship.toUpperCase()} • CPF: {g.guardian?.cpf} • Tel: {g.guardian?.whatsapp || g.guardian?.phone || "N/A"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {g.is_financial && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              Financeiro
                            </span>
                          )}
                          {g.is_pedagogical && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                              Pedagógico
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Nenhum responsável vinculado.</p>
                )}
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Endereço Residencial
                </h5>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {viewingStudent.street
                    ? `${viewingStudent.street}, nº ${viewingStudent.number || "S/N"} ${
                        viewingStudent.complement ? `(${viewingStudent.complement})` : ""
                      } - ${viewingStudent.neighborhood || ""}, ${viewingStudent.city || ""} - ${
                        viewingStudent.state || ""
                      } (CEP: ${viewingStudent.postal_code || "N/A"})`
                    : "Endereço não informado."}
                </p>
              </div>

              {viewingStudent.medical_notes && (
                <div className="space-y-2">
                  <h5 className="font-bold text-rose-700 uppercase tracking-wider text-[11px]">
                    Observações de Saúde e Alergias
                  </h5>
                  <p className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl text-rose-800">
                    {viewingStudent.medical_notes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                type="button"
                onClick={() => printStudentCard(viewingStudent, tenantName)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Gerar PDF / Imprimir
              </button>
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}