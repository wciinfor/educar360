"use client";

import React, { useState, useMemo } from "react";
import {
  TenantUserListItem,
  InviteTenantUserInput,
} from "@/types/configuracoes";
import {
  inviteTenantUserAction,
  updateTenantUserRoleAction,
  toggleTenantUserStatusAction,
} from "@/app/actions/configuracoes";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  DollarSign,
  FileText,
  TrendingUp,
  Headphones,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  MoreVertical,
  X,
  Edit2,
  Power,
  Lock,
} from "lucide-react";
import clsx from "clsx";

interface UsersManagementClientProps {
  initialUsers: TenantUserListItem[];
  currentUserId: string;
  currentUserRole: string;
}

const ROLES_INFO: Record<
  string,
  { label: string; icon: React.ElementType; color: string; badge: string }
> = {
  admin_escola: {
    label: "Administrador / Diretoria",
    icon: ShieldCheck,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  financeiro: {
    label: "Financeiro / Tesouraria",
    icon: DollarSign,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  secretaria: {
    label: "Secretaria Escolar",
    icon: FileText,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  comercial: {
    label: "Equipe Comercial",
    icon: TrendingUp,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  recepcao: {
    label: "Recepção / Atendimento",
    icon: Headphones,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

export function UsersManagementClient({
  initialUsers,
  currentUserId,
  currentUserRole,
}: UsersManagementClientProps) {
  const isAdmin = currentUserRole === "admin_escola";
  const [users, setUsers] = useState<TenantUserListItem[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal de Convite / Cadastro
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "admin_escola" | "financeiro" | "secretaria" | "comercial" | "recepcao"
  >("secretaria");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviting, setInviting] = useState(false);

  // Modal de Edição de Papel
  const [editingUser, setEditingUser] = useState<TenantUserListItem | null>(null);
  const [newRole, setNewRole] = useState<
    "admin_escola" | "financeiro" | "secretaria" | "comercial" | "recepcao"
  >("secretaria");
  const [savingRole, setSavingRole] = useState(false);

  // Feedback geral
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Filtros combinados
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.is_active) ||
        (statusFilter === "inactive" && !u.is_active);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Submeter Convite
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setInviting(true);
    setFeedback(null);

    const res = await inviteTenantUserAction({
      email: inviteEmail,
      fullName: inviteFullName,
      role: inviteRole,
      tempPassword: invitePassword || undefined,
    });

    if (res.success) {
      setFeedback({
        type: "success",
        text: res.message || "Colaborador adicionado com sucesso!",
      });
      // Atualiza lista local
      setUsers((prev) => [
        ...prev,
        {
          id: `tu-${Date.now()}`,
          user_id: `u-${Date.now()}`,
          email: inviteEmail.trim().toLowerCase(),
          full_name: inviteFullName.trim(),
          role: inviteRole,
          is_active: true,
          is_platform_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteFullName("");
      setInvitePassword("");
    } else {
      setFeedback({
        type: "error",
        text: res.error || "Erro ao adicionar usuário.",
      });
    }
    setInviting(false);
  };

  // Submeter Alteração de Perfil
  const handleSaveRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !isAdmin) return;
    setSavingRole(true);
    setFeedback(null);

    const res = await updateTenantUserRoleAction({
      tenantUserId: editingUser.id,
      targetRole: newRole,
    });

    if (res.success) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, role: newRole } : u
        )
      );
      setFeedback({
        type: "success",
        text: `Perfil de ${editingUser.full_name} atualizado para "${ROLES_INFO[newRole]?.label || newRole}".`,
      });
      setEditingUser(null);
    } else {
      setFeedback({
        type: "error",
        text: res.error || "Erro ao atualizar perfil.",
      });
    }
    setSavingRole(false);
  };

  // Alternar Ativação/Desativação
  const handleToggleStatus = async (user: TenantUserListItem) => {
    if (!isAdmin) return;
    const newStatus = !user.is_active;
    setFeedback(null);

    const res = await toggleTenantUserStatusAction({
      tenantUserId: user.id,
      isActive: newStatus,
    });

    if (res.success) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, is_active: newStatus } : u
        )
      );
      setFeedback({
        type: "success",
        text: `Usuário ${user.full_name} foi ${newStatus ? "reativado" : "desativado"} com sucesso.`,
      });
    } else {
      setFeedback({
        type: "error",
        text: res.error || "Erro ao alterar situação do usuário.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Gestão de Colaboradores & Perfis
            </h2>
            <span className="px-2.5 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {users.length} usuários
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre novos operadores e atribua papéis com permissões segmentadas.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar Novo Colaborador</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={clsx(
            "p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold",
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          )}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
          />
        </div>

        {/* Filtros por Papel e Status */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="all">Todos os Perfis</option>
            <option value="admin_escola">Administrador</option>
            <option value="financeiro">Financeiro</option>
            <option value="secretaria">Secretaria</option>
            <option value="comercial">Comercial</option>
            <option value="recepcao">Recepção</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="all">Todas as Situações</option>
            <option value="active">Apenas Ativos</option>
            <option value="inactive">Desativados</option>
          </select>
        </div>
      </div>

      {/* Tabela de Colaboradores */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Colaborador</th>
                <th className="py-3.5 px-4">Perfil / Papel</th>
                <th className="py-3.5 px-4">Situação</th>
                <th className="py-3.5 px-4">Data de Início</th>
                {isAdmin && <th className="py-3.5 px-4 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 5 : 4}
                    className="py-8 text-center text-slate-400"
                  >
                    Nenhum colaborador encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleConfig = ROLES_INFO[user.role] || {
                    label: user.role,
                    icon: Users,
                    badge: "bg-slate-100 text-slate-600 border-slate-200",
                  };
                  const Icon = roleConfig.icon;
                  const isSelf = user.user_id === currentUserId;

                  return (
                    <tr
                      key={user.id}
                      className={clsx(
                        "hover:bg-slate-50/50 transition-colors",
                        !user.is_active && "opacity-60 bg-slate-50/30"
                      )}
                    >
                      {/* Colaborador */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-slate-200">
                            {user.full_name ? user.full_name[0] : "U"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.full_name}</span>
                              {isSelf && (
                                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                  Você
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Perfil */}
                      <td className="py-3.5 px-4">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border",
                            roleConfig.badge
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{roleConfig.label}</span>
                        </span>
                      </td>

                      {/* Situação */}
                      <td className="py-3.5 px-4">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Desativado
                          </span>
                        )}
                      </td>

                      {/* Data de Início */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </td>

                      {/* Ações */}
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(user);
                                setNewRole(user.role as any);
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Alterar Perfil"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(user)}
                                className={clsx(
                                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                                  user.is_active
                                    ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                )}
                                title={
                                  user.is_active
                                    ? "Desativar Acesso"
                                    : "Reativar Acesso"
                                }
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADICIONAR / CONVIDAR COLABORADOR */}
      {/* ========================================================================= */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsInviteOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 z-10 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Adicionar Colaborador
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Cláudia Silva"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail Institucional *
                </label>
                <input
                  type="email"
                  required
                  placeholder="colaborador@escola.com.br"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Perfil de Acesso *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="secretaria">Secretaria Escolar</option>
                  <option value="financeiro">Financeiro / Tesouraria</option>
                  <option value="comercial">Equipe Comercial / Matrículas</option>
                  <option value="recepcao">Recepção / Atendimento</option>
                  <option value="admin_escola">Administrador da Escola</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Determina a quais módulos e telas o colaborador terá permissão de uso.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Senha Provisória (Opcional)
                </label>
                <input
                  type="password"
                  placeholder="Deixe em branco para gerar aleatória"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <span>Cadastrar Colaborador</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDITAR PERFIL DE ACESSO */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setEditingUser(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 z-10 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Alterar Perfil de Acesso
                  </h3>
                  <p className="text-[11px] text-slate-400">{editingUser.full_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Novo Perfil de Acesso *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="secretaria">Secretaria Escolar</option>
                  <option value="financeiro">Financeiro / Tesouraria</option>
                  <option value="comercial">Equipe Comercial / Matrículas</option>
                  <option value="recepcao">Recepção / Atendimento</option>
                  <option value="admin_escola">Administrador da Escola</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingRole ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Atualizar Perfil</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
