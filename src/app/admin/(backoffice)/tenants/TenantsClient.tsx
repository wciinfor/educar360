"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SetupFirstAccessModal } from "@/components/platform/SetupFirstAccessModal";
import {
  Building2,
  CheckCircle2,
  Clock,
  Ban,
  XCircle,
  Search,
  School,
  Plus,
  KeyRound,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

interface TenantItem {
  id: string;
  name: string;
  trade_name: string;
  slug: string;
  cnpj: string;
  email: string;
  phone: string;
  status: string;
  plan_name: string;
  plan_code: string;
  amount_cents: number;
  trial_ends_at: string | null;
  next_due_date: string | null;
  payment_status: string;
  students_count: number;
  first_admin_created?: boolean;
  settings?: Record<string, any>;
}

interface TenantsClientProps {
  initialTenants: TenantItem[];
}

export function TenantsClient({ initialTenants }: TenantsClientProps) {
  const [tenants, setTenants] = useState<TenantItem[]>(initialTenants);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTenantForAccess, setSelectedTenantForAccess] = useState<TenantItem | null>(null);

  const filteredTenants = tenants.filter((tenant) => {
    const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      tenant.name.toLowerCase().includes(term) ||
      tenant.slug.toLowerCase().includes(term) ||
      (tenant.cnpj && tenant.cnpj.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ativo
          </span>
        );
      case "trial":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" />
            Trial
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Ban className="w-3.5 h-3.5" />
            Suspenso
          </span>
        );
      case "canceled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  const handleFirstAccessSuccess = () => {
    if (selectedTenantForAccess) {
      setTenants((prev) =>
        prev.map((t) =>
          t.id === selectedTenantForAccess.id
            ? { ...t, first_admin_created: true }
            : t
        )
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">
              Gestão de Tenants & Escolas
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-zinc-200 text-zinc-700 rounded-full">
              {tenants.length} instituições
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Visualização global das escolas. Todas acessam centralmente por <strong className="text-zinc-700">app.educar360.com.br</strong>.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Provisionar Nova Escola</span>
        </button>
      </div>

      {/* Tabela de Tenants */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, slug ou CNPJ..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-zinc-500 font-medium">Filtrar:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-zinc-300 rounded-lg text-xs text-zinc-700 py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativas</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspensas</option>
              <option value="canceled">Canceladas</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Escola / Identificador (Slug)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Plano Atual</th>
                <th className="py-3.5 px-4">Primeiro Acesso</th>
                <th className="py-3.5 px-4">Vencimento / Trial</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-xs text-zinc-700">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 font-bold shrink-0">
                        <School className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900">{tenant.name}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          slug: <strong className="text-zinc-600 font-semibold">{tenant.slug}</strong> &bull; CNPJ: {tenant.cnpj || "Não cadastrado"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">{getStatusBadge(tenant.status)}</td>
                  <td className="py-4 px-4">
                    <span className="font-semibold text-zinc-800">{tenant.plan_name}</span>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {tenant.amount_cents > 0
                        ? (tenant.amount_cents / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "Sob Consulta"}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {tenant.first_admin_created ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <UserCheck className="w-3.5 h-3.5" /> Gestor Ativo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedTenantForAccess(tenant)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Configurar 1º Acesso</span>
                      </button>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {tenant.status === "trial" && tenant.trial_ends_at ? (
                      <div>
                        <span className="text-blue-700 font-medium">
                          Expira em {new Date(tenant.trial_ends_at).toLocaleDateString("pt-BR")}
                        </span>
                        <div className="text-[10px] text-zinc-400">Trial de 14 dias</div>
                      </div>
                    ) : tenant.next_due_date ? (
                      <div>
                        <span className="text-zinc-800 font-medium">
                          {new Date(tenant.next_due_date).toLocaleDateString("pt-BR")}
                        </span>
                        <div className="text-[10px] text-zinc-400">Próxima fatura</div>
                      </div>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/admin/assinaturas?tenantId=${tenant.id}`}
                        className="px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                      >
                        Assinatura
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Configuração de Primeiro Acesso */}
      {selectedTenantForAccess && (
        <SetupFirstAccessModal
          tenant={selectedTenantForAccess}
          isOpen={!!selectedTenantForAccess}
          onClose={() => setSelectedTenantForAccess(null)}
          onSuccess={handleFirstAccessSuccess}
        />
      )}
    </div>
  );
}
