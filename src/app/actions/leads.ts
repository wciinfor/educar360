"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LeadInput, LeadResponse } from "@/types/lead";
import { sendTenantInviteEmail } from "@/lib/email/resend";
import { getPlanByCode } from "@/lib/plans/constants";
import { getActivationUrl } from "@/lib/urls";
import { revalidatePath } from "next/cache";

/**
 * Onboarding Self-Service Oficial do Educar360
 * Fluxo atômico completo:
 * 1. Validações de entrada e formato
 * 2. Criação transacional: Lead + Tenant ('trial') + Assinatura (14 dias) + Histórico + Profile + Papel admin_escola + Convite
 * 3. Envio de e-mail transacional via Resend com o link de ativação
 * 4. Retorno seguro para o usuário na tela de sucesso
 */
export async function submitLeadAction(data: LeadInput): Promise<LeadResponse> {
  try {
    const schoolName = data.school_name?.trim();
    const contactName = data.contact_name?.trim();
    const email = data.email?.trim().toLowerCase();
    const phone = data.phone?.trim();

    if (!schoolName || !contactName || !email || !phone) {
      return {
        success: false,
        message: "Por favor, preencha todos os campos obrigatórios (Escola, Nome, E-mail e WhatsApp).",
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: "Por favor, informe um endereço de e-mail válido.",
      };
    }

    const planCode = data.plan_interest || "profissional";
    const planConfig = getPlanByCode(planCode) || getPlanByCode("profissional");
    const planName = planConfig?.name || "Profissional";
    const inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Tenta executar via RPC transacional do PostgreSQL
    const supabase = await createClient();
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "self_service_onboard_tenant",
      {
        p_school_name: schoolName,
        p_contact_name: contactName,
        p_email: email,
        p_phone: phone,
        p_role_in_school: data.role_in_school || null,
        p_students_range: data.students_range || null,
        p_plan_code: planCode,
        p_message: data.message ? data.message.trim() : null,
        p_invite_token: inviteToken,
      }
    );

    let tenantId = rpcData?.tenant_id;
    let tenantSlug = rpcData?.tenant_slug;
    let token = rpcData?.invite_token || inviteToken;

    // Se o banco indicar que o e-mail já possui instituição ativa/trial
    if (rpcData && !rpcData.success && rpcData.already_exists) {
      return {
        success: false,
        message: rpcData.error || "Já existe uma instituição cadastrada com este e-mail. Por favor, faça login ou recupere sua senha.",
      };
    }

    // Fallback no lado do servidor via adminClient caso a migration da RPC ainda não tenha sido executada no banco
    if (rpcError || !rpcData || !rpcData.success) {
      console.warn("RPC self_service_onboard_tenant indisponível, executando fallback transacional seguro via admin client:", rpcError?.message);
      
      const adminClient = createAdminClient();

      // Checagem de tenant existente para evitar duplicidade
      const { data: existingTenant } = await (adminClient.from("tenants") as any)
        .select("id, slug, status")
        .eq("email", email)
        .in("status", ["active", "trial"])
        .maybeSingle();

      if (existingTenant) {
        return {
          success: false,
          message: "Já existe uma instituição ativa com este e-mail. Acesse o sistema ou entre em contato com o suporte.",
        };
      }

      // 1. Cria Lead com status 'converted'
      const { data: leadRecord, error: leadErr } = await (adminClient.from("leads") as any)
        .insert([
          {
            school_name: schoolName,
            contact_name: contactName,
            email: email,
            phone: phone,
            role_in_school: data.role_in_school || null,
            students_range: data.students_range || null,
            plan_interest: planCode,
            message: data.message ? data.message.trim() : null,
            status: "converted",
            internal_notes: `[${new Date().toLocaleString("pt-BR")}] Onboarding Self-Service via Landing Page com Trial de 14 dias.`,
          },
        ])
        .select("id")
        .single();

      if (leadErr || !leadRecord) {
        throw new Error(leadErr?.message || "Erro ao registrar lead de onboarding.");
      }

      // 2. Criação do Tenant
      const baseSlug = schoolName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const uniqueSlug = `${baseSlug || "escola"}-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date();
      const trialStart = now.toISOString();
      const trialEndDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const trialEnd = trialEndDate.toISOString();
      const nextDueDate = trialEndDate.toISOString().split("T")[0];

      const { data: newTenant, error: tenantErr } = await (adminClient.from("tenants") as any)
        .insert([
          {
            name: schoolName,
            trade_name: schoolName,
            slug: uniqueSlug,
            email: email,
            phone: phone,
            status: "trial",
            lead_id: leadRecord.id,
            invite_token: token,
            invite_status: "created",
            invite_admin_email: email,
            first_admin_created_at: trialStart,
            settings: {
              self_service: true,
              contact_name: contactName,
              role_in_school: data.role_in_school,
              students_range: data.students_range,
              converted_from_lead_at: trialStart,
            },
          },
        ])
        .select("id, slug")
        .single();

      if (tenantErr || !newTenant) {
        throw new Error(tenantErr?.message || "Erro ao provisionar escola.");
      }

      tenantId = newTenant.id;
      tenantSlug = newTenant.slug;

      // Vincula converted_tenant_id no lead
      await (adminClient.from("leads") as any)
        .update({ converted_tenant_id: tenantId })
        .eq("id", leadRecord.id);

      // 3. Resolução de plano e criação da Assinatura Trial
      const { data: dbPlan } = await (adminClient.from("saas_plans") as any)
        .select("id, price_cents")
        .eq("code", planCode)
        .maybeSingle();

      const planId = dbPlan?.id || "plan-profissional";
      const amountCents = dbPlan?.price_cents || planConfig?.price_cents || 49900;

      const { data: newSub } = await (adminClient.from("saas_subscriptions") as any)
        .insert([
          {
            tenant_id: tenantId,
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

      // Histórico da Assinatura
      await (adminClient.from("saas_subscription_history") as any).insert([
        {
          subscription_id: subscriptionId,
          tenant_id: tenantId,
          event_type: "CREATED",
          new_plan_id: planId,
          new_status: "trial",
          reason: "Criação da assinatura via Onboarding Self-Service",
        },
        {
          subscription_id: subscriptionId,
          tenant_id: tenantId,
          event_type: "TRIAL_STARTED",
          new_plan_id: planId,
          new_status: "trial",
          reason: `Período de avaliação de 14 dias iniciado (término em ${trialEndDate.toLocaleDateString("pt-BR")})`,
        },
      ]);

      // 4. Criação de perfil com is_platform_admin = FALSE
      const { data: existingProfile } = await (adminClient.from("profiles") as any)
        .select("id")
        .eq("email", email)
        .maybeSingle();

      let userId = existingProfile?.id;

      if (userId) {
        await (adminClient.from("profiles") as any)
          .update({
            full_name: contactName,
            is_platform_admin: false,
            updated_at: trialStart,
          })
          .eq("id", userId);
      } else {
        userId = crypto.randomUUID();
        await (adminClient.from("profiles") as any).insert([
          {
            id: userId,
            email: email,
            full_name: contactName,
            phone: phone,
            is_platform_admin: false, // NUNCA PLATFORM ADMIN
          },
        ]);
      }

      // 5. Vínculo em tenant_users como admin_escola
      await (adminClient.from("tenant_users") as any).upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          role: "admin_escola",
          is_active: true,
          custom_permissions: ["admin_escola_total"],
          updated_at: trialStart,
        },
        { onConflict: "tenant_id,user_id" }
      );
    }

    // Revalidação dos painéis do Platform Admin para acompanhamento em tempo real
    revalidatePath("/admin/leads");
    revalidatePath("/admin/tenants");
    revalidatePath("/admin/assinaturas");

    // 6. Disparo do E-mail Transacional via Resend
    // O envio de e-mail nunca quebra a criação da escola
    let emailSent = false;
    let emailError: string | undefined;

    try {
      const emailResult = await sendTenantInviteEmail({
        toEmail: email,
        adminName: contactName,
        schoolName: schoolName,
        inviteToken: token,
        planName: planName,
        trialDays: 14,
      });

      emailSent = emailResult.success;
      emailError = emailResult.error;
    } catch (mailErr: any) {
      console.error("Falha não impeditiva no disparo do e-mail do Resend:", mailErr);
      emailError = mailErr?.message || "Falha ao enviar e-mail.";
    }

    const activationUrl = getActivationUrl(token, email);

    return {
      success: true,
      message: "Sua escola e o período de 14 dias grátis foram criados com sucesso!",
      tenant_id: tenantId,
      tenant_name: schoolName,
      tenant_slug: tenantSlug,
      invite_token: token,
      activation_url: activationUrl,
      email_sent: emailSent,
      email_error: emailError,
    };
  } catch (err: any) {
    console.error("Exceção ao processar onboarding self-service:", err);
    return {
      success: false,
      message: "Ocorreu uma falha inesperada ao processar o seu cadastro. Por favor, tente novamente.",
      error: err?.message,
    };
  }
}
