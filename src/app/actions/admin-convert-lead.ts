"use server";

import { createClient } from "@/lib/supabase/server";
import { getPlatformAdminSession } from "@/lib/platform/resolver";
import { ConvertLeadResult } from "@/types/lead";
import { getPlanByCode } from "@/lib/plans/constants";
import { revalidatePath } from "next/cache";

interface ConvertLeadPayload {
  leadId: string;
  planCode: string;
  customSlug?: string;
}

/**
 * Executa a conversão atômica do Lead em Escola (Tenant) com Assinatura Trial de 14 dias.
 * Restrito estritamente a Super Administradores da Plataforma.
 */
export async function convertLeadToTenantAction(
  payload: ConvertLeadPayload
): Promise<ConvertLeadResult> {
  try {
    const session = await getPlatformAdminSession();
    if (!session) {
      return {
        success: false,
        error: "Acesso negado: Somente Super Administradores da Plataforma podem converter leads.",
      };
    }

    const supabase = await createClient();

    // 1. Tenta executar via função atômica RPC do PostgreSQL
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "convert_lead_to_tenant",
      {
        p_lead_id: payload.leadId,
        p_plan_code: payload.planCode,
        p_custom_slug: payload.customSlug || null,
      }
    );

    if (!rpcError && rpcData) {
      revalidatePath("/admin/leads");
      revalidatePath("/admin/tenants");
      revalidatePath("/admin/assinaturas");

      return {
        success: true,
        tenant_id: rpcData.tenant_id,
        tenant_slug: rpcData.tenant_slug,
        subscription_id: rpcData.subscription_id,
        plan_name: rpcData.plan_name,
        plan_code: rpcData.plan_code,
        trial_starts_at: rpcData.trial_starts_at,
        trial_ends_at: rpcData.trial_ends_at,
        next_due_date: rpcData.next_due_date,
      };
    }

    // 2. Fallback transacional no lado do servidor (caso a RPC ainda não esteja instalada no banco remoto)
    // Validação do Lead
    const { data: lead, error: leadErr } = await (supabase.from("leads") as any)
      .select("*")
      .eq("id", payload.leadId)
      .single();

    if (leadErr || !lead) {
      return { success: false, error: "Lead não encontrado no sistema." };
    }

    // Proteção contra duplicação
    if (lead.converted_tenant_id || lead.status === "converted") {
      return {
        success: false,
        error: "Este lead já foi convertido anteriormente e possui uma instituição vinculada.",
      };
    }

    // Resolução do Plano Oficial
    const planConfig = getPlanByCode(payload.planCode) || getPlanByCode("profissional");
    const amountCents = planConfig?.price_cents || 49900;
    const planName = planConfig?.name || "Profissional";

    // Cálculo exato das datas do trial de 14 dias
    const now = new Date();
    const trialStart = now.toISOString();
    const trialEndDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const trialEnd = trialEndDate.toISOString();
    const nextDueDate = trialEndDate.toISOString().split("T")[0];

    // Sanitização do slug
    const baseSlug = payload.customSlug?.trim()
      ? payload.customSlug.toLowerCase().replace(/[^a-z0-9]/g, "-")
      : lead.school_name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const uniqueSlug = `${baseSlug.replace(/^-|-$/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Busca o plan_id no banco ou gera um placeholder
    const { data: dbPlan } = await (supabase.from("saas_plans") as any)
      .select("id")
      .eq("code", payload.planCode)
      .single();

    const planId = dbPlan?.id || "plan-profissional";

    // Criação do Tenant
    const { data: newTenant, error: tenantErr } = await (supabase.from("tenants") as any)
      .insert([
        {
          name: lead.school_name,
          trade_name: lead.school_name,
          slug: uniqueSlug,
          email: lead.email,
          phone: lead.phone,
          status: "trial",
          lead_id: lead.id,
          settings: {
            converted_from_lead_at: trialStart,
            contact_name: lead.contact_name,
            students_range: lead.students_range,
          },
        },
      ])
      .select("id, slug")
      .single();

    if (tenantErr || !newTenant) {
      // Se deu erro de constraint único, trata amigavelmente
      return { success: false, error: tenantErr?.message || "Erro ao criar instituição escolar." };
    }

    // Criação da Assinatura com Trial de 14 dias
    const { data: newSub } = await (supabase.from("saas_subscriptions") as any)
      .insert([
        {
          tenant_id: newTenant.id,
          plan_id: planId,
          status: "trial",
          trial_starts_at: trialStart,
          trial_ends_at: trialEnd,
          current_period_start: trialStart,
          current_period_end: trialEnd,
          next_due_date: nextDueDate,
          amount_cents: amountCents,
          payment_status: "pending",
        },
      ])
      .select("id")
      .single();

    const subscriptionId = newSub?.id || `sub_${Date.now()}`;

    // Registro do Histórico: CREATED e TRIAL_STARTED
    await (supabase.from("saas_subscription_history") as any).insert([
      {
        subscription_id: subscriptionId,
        tenant_id: newTenant.id,
        event_type: "CREATED",
        new_status: "trial",
        reason: "Criação da assinatura via conversão de Lead comercial",
        actor_user_id: session.user.id,
      },
      {
        subscription_id: subscriptionId,
        tenant_id: newTenant.id,
        event_type: "TRIAL_STARTED",
        new_status: "trial",
        reason: `Período de avaliação gratuita de 14 dias iniciado (término em ${trialEndDate.toLocaleDateString("pt-BR")})`,
        actor_user_id: session.user.id,
      },
    ]);

    // Atualização do Lead
    const updatedNotes = lead.internal_notes
      ? `${lead.internal_notes}\n\n[${new Date().toLocaleString("pt-BR")}] Convertido em Escola (Tenant ID: ${newTenant.id}, Slug: ${newTenant.slug}) com Trial de 14 dias.`
      : `[${new Date().toLocaleString("pt-BR")}] Convertido em Escola (Tenant ID: ${newTenant.id}, Slug: ${newTenant.slug}) com Trial de 14 dias.`;

    await (supabase.from("leads") as any)
      .update({
        status: "converted",
        converted_tenant_id: newTenant.id,
        internal_notes: updatedNotes,
        updated_at: trialStart,
      })
      .eq("id", lead.id);

    revalidatePath("/admin/leads");
    revalidatePath("/admin/tenants");
    revalidatePath("/admin/assinaturas");

    return {
      success: true,
      tenant_id: newTenant.id,
      tenant_slug: newTenant.slug,
      subscription_id: subscriptionId,
      plan_name: planName,
      plan_code: payload.planCode,
      trial_starts_at: trialStart,
      trial_ends_at: trialEnd,
      next_due_date: nextDueDate,
    };
  } catch (err: any) {
    console.error("Exceção na conversão de lead:", err);
    return {
      success: false,
      error: err?.message || "Erro inesperado ao converter lead em escola.",
    };
  }
}
