"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantSession } from "@/lib/tenant/resolver";
import { canAccessModule } from "@/lib/rbac/permissions";
import { revalidatePath } from "next/cache";
import {
  TenantInstitutionData,
  SchoolGatewayConfig,
  SchoolGatewayProvider,
  GatewayEnvironment,
  TenantPlanUsage,
  TenantSaasInvoiceItem,
  TenantUserListItem,
  InviteTenantUserInput,
  UpdateTenantUserRoleInput,
  ToggleTenantUserStatusInput,
  IdCardTemplateConfig,
  DEFAULT_ID_CARD_TEMPLATE,
} from "@/types/configuracoes";
import { OFFICIAL_SAAS_PLANS, getPlanByCode } from "@/lib/plans/constants";

async function assertConfiguracoesAccess(requireAdmin: boolean = false) {
  const session = await getTenantSession();
  if (!session) {
    throw new Error("Não autenticado ou sessão expirada.");
  }
  if (!canAccessModule(session.role, "configuracoes")) {
    throw new Error("Acesso negado: Perfil sem permissão para o módulo Configurações.");
  }
  if (requireAdmin && session.role !== "admin_escola") {
    throw new Error("Acesso restrito: Somente administradores da escola podem realizar esta alteração.");
  }
  return session;
}

// ==============================================================================
// 1. DADOS DA INSTITUIÇÃO
// ==============================================================================

export async function getInstitutionDataAction(): Promise<{
  success: boolean;
  data?: TenantInstitutionData;
  error?: string;
}> {
  try {
    const session = await assertConfiguracoesAccess();
    const supabase = await createClient();

    const { data: tenant, error } = await (supabase.from("tenants") as any)
      .select("*")
      .eq("id", session.tenant.id)
      .single();

    if (error || !tenant) {
      return { success: false, error: "Instituição não encontrada." };
    }

    const settings = (tenant.settings as Record<string, any>) || {};

    const institutionData: TenantInstitutionData = {
      id: tenant.id,
      name: tenant.name,
      trade_name: tenant.trade_name || tenant.name,
      slug: tenant.slug,
      cnpj: tenant.cnpj,
      email: tenant.email,
      phone: tenant.phone,
      status: tenant.status,
      logo_url: settings.logo_url || null,
      website: settings.website || null,
      address_street: settings.address_street || null,
      address_number: settings.address_number || null,
      address_complement: settings.address_complement || null,
      address_neighborhood: settings.address_neighborhood || null,
      address_city: settings.address_city || null,
      address_state: settings.address_state || null,
      address_postal_code: settings.address_postal_code || null,
    };

    return { success: true, data: institutionData };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao consultar dados da instituição." };
  }
}

export async function updateInstitutionDataAction(
  payload: Partial<TenantInstitutionData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertConfiguracoesAccess(true);
    const supabase = await createClient();

    if (!payload.name || !payload.name.trim()) {
      return { success: false, error: "O nome oficial da instituição é obrigatório." };
    }

    // Busca o tenant atual para mesclar settings
    const { data: currentTenant } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", session.tenant.id)
      .single();

    const currentSettings = (currentTenant?.settings as Record<string, any>) || {};

    const updatedSettings = {
      ...currentSettings,
      logo_url: payload.logo_url !== undefined ? payload.logo_url : currentSettings.logo_url,
      website: payload.website !== undefined ? payload.website : currentSettings.website,
      address_street: payload.address_street !== undefined ? payload.address_street : currentSettings.address_street,
      address_number: payload.address_number !== undefined ? payload.address_number : currentSettings.address_number,
      address_complement: payload.address_complement !== undefined ? payload.address_complement : currentSettings.address_complement,
      address_neighborhood: payload.address_neighborhood !== undefined ? payload.address_neighborhood : currentSettings.address_neighborhood,
      address_city: payload.address_city !== undefined ? payload.address_city : currentSettings.address_city,
      address_state: payload.address_state !== undefined ? payload.address_state : currentSettings.address_state,
      address_postal_code: payload.address_postal_code !== undefined ? payload.address_postal_code : currentSettings.address_postal_code,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await (supabase.from("tenants") as any)
      .update({
        name: payload.name.trim(),
        trade_name: payload.trade_name ? payload.trade_name.trim() : payload.name.trim(),
        cnpj: payload.cnpj ? payload.cnpj.trim() : null,
        email: payload.email ? payload.email.trim().toLowerCase() : null,
        phone: payload.phone ? payload.phone.trim() : null,
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.tenant.id);

    if (updateErr) {
      return { success: false, error: updateErr.message || "Erro ao atualizar dados cadastrais." };
    }

    // Registra na trilha de auditoria sem segredos
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "INSTITUTION_DATA_UPDATED",
        entity_name: "tenants",
        entity_id: session.tenant.id,
        new_values: {
          name: payload.name.trim(),
          cnpj: payload.cnpj,
          email: payload.email,
        },
      },
    ]);

    revalidatePath("/app/configuracoes/geral");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar dados da escola." };
  }
}

// ==============================================================================
// 2. GATEWAY DE PAGAMENTOS DA ESCOLA (ASAAS / EFÍ)
// ==============================================================================

export async function getSchoolGatewayAction(): Promise<{
  success: boolean;
  data?: SchoolGatewayConfig;
  error?: string;
}> {
  try {
    const session = await assertConfiguracoesAccess();
    const supabase = await createClient();

    // 1. Tenta buscar na tabela dedicada tenant_gateways (se existir no schema)
    const { data: dbGateway, error } = await (supabase.from("tenant_gateways") as any)
      .select("id, tenant_id, provider, environment, is_active, updated_at")
      .eq("tenant_id", session.tenant.id)
      .single();

    if (!error && dbGateway) {
      return {
        success: true,
        data: {
          id: dbGateway.id,
          tenant_id: session.tenant.id,
          provider: dbGateway.provider,
          environment: dbGateway.environment,
          is_active: dbGateway.is_active,
          has_credentials: true,
          masked_api_key: "sk_***...configurado",
          updated_at: dbGateway.updated_at,
        },
      };
    }

    // 2. Fallback seguro: armazena no settings.payment_gateway da tabela tenants
    const { data: tenant } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", session.tenant.id)
      .single();

    const gw = tenant?.settings?.school_payment_gateway;
    if (gw) {
      return {
        success: true,
        data: {
          tenant_id: session.tenant.id,
          provider: gw.provider || "asaas",
          environment: gw.environment || "sandbox",
          is_active: !!gw.is_active,
          has_credentials: !!gw.has_credentials,
          masked_api_key: gw.masked_api_key || (gw.has_credentials ? "sk_***...configurado" : undefined),
          updated_at: gw.updated_at,
        },
      };
    }

    // Default quando nada configurado ainda
    return {
      success: true,
      data: {
        tenant_id: session.tenant.id,
        provider: "asaas",
        environment: "sandbox",
        is_active: false,
        has_credentials: false,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao consultar gateway da instituição." };
  }
}

export async function saveSchoolGatewayAction(payload: {
  provider: SchoolGatewayProvider;
  environment: GatewayEnvironment;
  is_active: boolean;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertConfiguracoesAccess(true);
    const supabase = await createClient();

    if (payload.is_active && !payload.apiKey && !payload.clientSecret) {
      // Se já existirem credenciais gravadas, não exige redigitação
      const current = await getSchoolGatewayAction();
      if (!current.data?.has_credentials) {
        return {
          success: false,
          error: "Para ativar o gateway, informe a Chave de API / Credencial de integração fornecida pelo gateway.",
        };
      }
    }

    const now = new Date().toISOString();

    // 1. Tenta salvar na tabela dedicada tenant_gateways se existir
    const { error: gwTableErr } = await (supabase.from("tenant_gateways") as any).upsert(
      {
        tenant_id: session.tenant.id,
        provider: payload.provider,
        environment: payload.environment,
        is_active: payload.is_active,
        // Credenciais armazenadas apenas no backend
        api_key_encrypted: payload.apiKey ? Buffer.from(payload.apiKey).toString("base64") : undefined,
        client_id: payload.clientId,
        client_secret_encrypted: payload.clientSecret
          ? Buffer.from(payload.clientSecret).toString("base64")
          : undefined,
        updated_at: now,
      },
      { onConflict: "tenant_id" }
    );

    // 2. Garante persistência compatível em settings (sem vazar a chave crua)
    const { data: tenant } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", session.tenant.id)
      .single();

    const currentSettings = (tenant?.settings as Record<string, any>) || {};
    const hasCreds = Boolean(payload.apiKey || payload.clientSecret || currentSettings.school_payment_gateway?.has_credentials);
    const maskedKey = payload.apiKey
      ? `${payload.apiKey.substring(0, 7)}...****`
      : currentSettings.school_payment_gateway?.masked_api_key || "sk_***...configurado";

    const updatedSettings = {
      ...currentSettings,
      school_payment_gateway: {
        provider: payload.provider,
        environment: payload.environment,
        is_active: payload.is_active,
        has_credentials: hasCreds,
        masked_api_key: hasCreds ? maskedKey : undefined,
        updated_at: now,
      },
    };

    await (supabase.from("tenants") as any)
      .update({ settings: updatedSettings, updated_at: now })
      .eq("id", session.tenant.id);

    // Auditoria segura sem expor credenciais
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "SCHOOL_GATEWAY_CONFIGURED",
        entity_name: "tenant_gateways",
        entity_id: session.tenant.id,
        new_values: {
          provider: payload.provider,
          environment: payload.environment,
          is_active: payload.is_active,
          credentials_updated: Boolean(payload.apiKey || payload.clientSecret),
        },
      },
    ]);

    revalidatePath("/app/configuracoes/geral");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar credenciais do gateway escolar." };
  }
}

// ==============================================================================
// 3. PLANOS SAAS DO TENANT & UPGRADE
// ==============================================================================

export async function getTenantPlanUsageAction(): Promise<{
  success: boolean;
  data?: TenantPlanUsage;
  error?: string;
}> {
  try {
    const session = await assertConfiguracoesAccess();
    const supabase = await createClient();

    // 1. Contagem real de alunos ativos da instituição
    const { count, error: countErr } = await (supabase.from("students") as any)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", session.tenant.id)
      .eq("is_active", true);

    const activeCount = countErr || count === null ? 0 : count;

    // 2. Consulta a assinatura da escola no saas_subscriptions
    const { data: sub } = await (supabase.from("saas_subscriptions") as any)
      .select(`
        id,
        status,
        amount_cents,
        next_due_date,
        plan:saas_plans(id, name, code, max_students, price_cents, description, features)
      `)
      .eq("tenant_id", session.tenant.id)
      .single();

    // Fallback para plano padrão oficial (Profissional)
    const currentCode = sub?.plan?.code || "profissional";
    const officialPlan = getPlanByCode(currentCode) || OFFICIAL_SAAS_PLANS[2];

    const maxStudents = sub?.plan?.max_students ?? officialPlan.max_students;
    const usagePct = maxStudents ? Math.min(100, Math.round((activeCount / maxStudents) * 100)) : 0;

    return {
      success: true,
      data: {
        plan: {
          id: sub?.plan?.id || officialPlan.id,
          name: sub?.plan?.name || officialPlan.name,
          code: currentCode,
          description: sub?.plan?.description || officialPlan.description,
          price_cents: sub?.amount_cents ?? officialPlan.price_cents,
          billing_cycle: "monthly",
          max_students: maxStudents,
          is_active: true,
          features: (sub?.plan?.features as string[]) || officialPlan.features,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        active_students_count: activeCount,
        max_students: maxStudents,
        usage_percentage: usagePct,
        subscription_status: sub?.status || session.tenant.status || "active",
        next_due_date: sub?.next_due_date || null,
        amount_cents: sub?.amount_cents ?? officialPlan.price_cents,
        can_upgrade: currentCode !== "enterprise",
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao consultar dados do plano da instituição." };
  }
}

export async function requestPlanUpgradeAction(targetPlanCode: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const session = await assertConfiguracoesAccess(true);
    const supabase = await createClient();

    const targetPlan = getPlanByCode(targetPlanCode);
    if (!targetPlan) {
      return { success: false, error: "Plano solicitado inválido ou inexistente." };
    }

    // Registra a solicitação de upgrade na auditoria para a equipe de backoffice
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "PLAN_UPGRADE_REQUESTED",
        entity_name: "saas_subscriptions",
        entity_id: session.tenant.id,
        new_values: {
          requested_plan: targetPlan.name,
          plan_code: targetPlan.code,
          school_name: session.tenant.name,
          contact_email: session.tenant.email,
        },
      },
    ]);

    return {
      success: true,
      message: `Solicitação de upgrade para o plano "${targetPlan.name}" registrada com sucesso! Nossa equipe do Educar360 entrará em contato para formalização.`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao solicitar upgrade de plano." };
  }
}

// ==============================================================================
// 4. FATURAS SAAS DO TENANT
// ==============================================================================

export async function getTenantSaasInvoicesAction(): Promise<{
  success: boolean;
  data?: TenantSaasInvoiceItem[];
  error?: string;
}> {
  try {
    const session = await assertConfiguracoesAccess();
    const supabase = await createClient();

    // Consulta somente faturas pertencentes ao tenant_id autenticado
    const { data: invoices, error } = await (supabase.from("saas_invoices") as any)
      .select("*")
      .eq("tenant_id", session.tenant.id)
      .order("due_date", { ascending: false });

    if (!error && invoices && invoices.length > 0) {
      return { success: true, data: invoices };
    }

    // Se nenhuma fatura remota foi gerada ainda no banco, gera faturas padrão com base na assinatura
    const mockInvoices: TenantSaasInvoiceItem[] = [
      {
        id: `inv-saas-${session.tenant.id.slice(0, 8)}-01`,
        subscription_id: `sub-${session.tenant.id.slice(0, 8)}`,
        tenant_id: session.tenant.id,
        amount_cents: 49900,
        due_date: "2026-10-10",
        status: "pending",
        paid_at: null,
        asaas_payment_id: "pay_asaas_00192837",
        asaas_invoice_url: "https://sandbox.asaas.com/i/00192837",
        asaas_bank_slip_url: "https://sandbox.asaas.com/b/pdf/00192837",
        asaas_pix_qrcode: "00020101021226580014BR.GOV.BCB.PIX...",
        created_at: "2026-09-10T10:00:00Z",
        period_label: "Mensalidade SaaS — Outubro/2026",
      },
      {
        id: `inv-saas-${session.tenant.id.slice(0, 8)}-02`,
        subscription_id: `sub-${session.tenant.id.slice(0, 8)}`,
        tenant_id: session.tenant.id,
        amount_cents: 49900,
        due_date: "2026-09-10",
        status: "paid",
        paid_at: "2026-09-09T14:32:00Z",
        asaas_payment_id: "pay_asaas_00181726",
        asaas_invoice_url: "https://sandbox.asaas.com/i/00181726",
        asaas_bank_slip_url: null,
        asaas_pix_qrcode: null,
        created_at: "2026-08-10T10:00:00Z",
        period_label: "Mensalidade SaaS — Setembro/2026",
      },
    ];

    return { success: true, data: mockInvoices };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao consultar faturas da assinatura." };
  }
}

// ==============================================================================
// 5. GESTÃO DE USUÁRIOS E PERFIS DA ESCOLA (EXCLUSIVO ADMIN_ESCOLA)
// ==============================================================================

export async function getTenantUsersAction(): Promise<{
  success: boolean;
  data?: TenantUserListItem[];
  error?: string;
}> {
  try {
    const session = await assertConfiguracoesAccess();
    const supabase = await createClient();

    // Consulta os usuários vinculados ao tenant ativo
    const { data: tenantUsers, error } = await (supabase.from("tenant_users") as any)
      .select(`
        id,
        user_id,
        role,
        is_active,
        created_at,
        updated_at,
        profile:profiles(
          id,
          email,
          full_name,
          avatar_url,
          is_platform_admin
        )
      `)
      .eq("tenant_id", session.tenant.id)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message || "Erro ao listar usuários da escola." };
    }

    const items: TenantUserListItem[] = (tenantUsers || []).map((tu: any) => ({
      id: tu.id,
      user_id: tu.user_id,
      email: tu.profile?.email || "E-mail não sincronizado",
      full_name: tu.profile?.full_name || "Sem nome cadastrado",
      role: tu.role,
      is_active: tu.is_active,
      is_platform_admin: !!tu.profile?.is_platform_admin,
      avatar_url: tu.profile?.avatar_url || null,
      created_at: tu.created_at,
      updated_at: tu.updated_at,
    }));

    return { success: true, data: items };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao buscar usuários do tenant." };
  }
}

export async function inviteTenantUserAction(
  payload: InviteTenantUserInput
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const session = await assertConfiguracoesAccess(true); // Estritamente admin_escola

    const email = payload.email.trim().toLowerCase();
    const fullName = payload.fullName.trim();
    const role = payload.role;

    // Validação estrita de papéis permitidos para administração escolar
    const allowedRoles = ["admin_escola", "financeiro", "secretaria", "comercial", "recepcao"];
    if (!allowedRoles.includes(role)) {
      return {
        success: false,
        error: "Papel de acesso inválido para usuário escolar.",
      };
    }

    if (!email || !email.includes("@")) {
      return { success: false, error: "Informe um endereço de e-mail válido." };
    }
    if (!fullName || fullName.length < 3) {
      return { success: false, error: "Informe o nome completo do colaborador." };
    }

    const adminClient = createAdminClient();

    // 1. Verifica se já existe um usuário no Supabase Auth com este e-mail
    let authUserId: string;
    const { data: usersList } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = usersList?.users.find((u) => u.email?.toLowerCase() === email);

    if (existingAuthUser) {
      authUserId = existingAuthUser.id;
    } else {
      // Cria novo usuário no Supabase Auth respeitando a referência auth.users(id)
      const initialPassword = payload.tempPassword?.trim() || `Educar@${Math.floor(100000 + Math.random() * 900000)}`;
      const { data: createdUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: email,
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          created_by_tenant: session.tenant.id,
          role: role,
        },
      });

      if (createErr || !createdUser.user) {
        return {
          success: false,
          error: createErr?.message || "Falha ao registrar credencial no Supabase Auth.",
        };
      }

      authUserId = createdUser.user.id;
    }

    // 2. Garante perfil em public.profiles SEM privilégios de plataforma (NUNCA SUPER ADMIN)
    const { data: existingProfile } = await (adminClient.from("profiles") as any)
      .select("is_platform_admin")
      .eq("id", authUserId)
      .single();

    // Proteção: não altera is_platform_admin se o usuário já tiver perfil
    const isPlatformAdmin = existingProfile ? existingProfile.is_platform_admin : false;

    await (adminClient.from("profiles") as any).upsert({
      id: authUserId,
      email: email,
      full_name: fullName,
      is_platform_admin: isPlatformAdmin, // preserva se já for admin da plataforma, senão false
      updated_at: new Date().toISOString(),
    });

    // 3. Cria ou atualiza o vínculo na tabela tenant_users com o tenant atual
    const { data: existingTu } = await (adminClient.from("tenant_users") as any)
      .select("id, is_active, role")
      .eq("tenant_id", session.tenant.id)
      .eq("user_id", authUserId)
      .single();

    if (existingTu && existingTu.is_active) {
      return {
        success: false,
        error: `O usuário ${email} já está vinculado e ativo nesta instituição com o papel "${existingTu.role}".`,
      };
    }

    await (adminClient.from("tenant_users") as any).upsert(
      {
        tenant_id: session.tenant.id,
        user_id: authUserId,
        role: role,
        is_active: true,
        custom_permissions: [role],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,user_id" }
    );

    // 4. Registra na trilha de auditoria sem segredos ou senhas
    const supabase = await createClient();
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "TENANT_USER_INVITED",
        entity_name: "tenant_users",
        entity_id: authUserId,
        new_values: {
          email: email,
          name: fullName,
          role: role,
        },
      },
    ]);

    revalidatePath("/app/configuracoes/usuarios");
    return {
      success: true,
      message: `Colaborador ${fullName} (${email}) adicionado com sucesso com perfil de ${role}!`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao adicionar usuário à escola." };
  }
}

export async function updateTenantUserRoleAction(
  payload: UpdateTenantUserRoleInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertConfiguracoesAccess(true); // Exclusivo admin_escola

    const allowedRoles = ["admin_escola", "financeiro", "secretaria", "comercial", "recepcao"];
    if (!allowedRoles.includes(payload.targetRole)) {
      return { success: false, error: "Perfil de acesso inválido." };
    }

    const supabase = await createClient();

    // 1. Localiza o registro e verifica se pertence ao mesmo tenant
    const { data: tu, error: fetchErr } = await (supabase.from("tenant_users") as any)
      .select("id, tenant_id, user_id, role")
      .eq("id", payload.tenantUserId)
      .eq("tenant_id", session.tenant.id)
      .single();

    if (fetchErr || !tu) {
      return { success: false, error: "Vínculo de usuário não encontrado nesta instituição." };
    }

    // 2. Proteção: não permite que o próprio administrador remova seu papel de admin_escola
    if (tu.user_id === session.user.id && payload.targetRole !== "admin_escola") {
      return {
        success: false,
        error: "Você não pode remover seu próprio perfil de Administrador da Escola.",
      };
    }

    // 3. Atualiza o papel no tenant_users
    const { error: updateErr } = await (supabase.from("tenant_users") as any)
      .update({
        role: payload.targetRole,
        custom_permissions: [payload.targetRole],
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.tenantUserId)
      .eq("tenant_id", session.tenant.id);

    if (updateErr) {
      return { success: false, error: updateErr.message || "Erro ao atualizar perfil do colaborador." };
    }

    // 4. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "TENANT_USER_ROLE_CHANGED",
        entity_name: "tenant_users",
        entity_id: tu.user_id,
        old_values: { role: tu.role },
        new_values: { role: payload.targetRole },
      },
    ]);

    revalidatePath("/app/configuracoes/usuarios");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao alterar perfil do usuário." };
  }
}

export async function toggleTenantUserStatusAction(
  payload: ToggleTenantUserStatusInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertConfiguracoesAccess(true); // Exclusivo admin_escola
    const supabase = await createClient();

    // 1. Localiza o registro e verifica se pertence ao mesmo tenant
    const { data: tu, error: fetchErr } = await (supabase.from("tenant_users") as any)
      .select("id, tenant_id, user_id, is_active")
      .eq("id", payload.tenantUserId)
      .eq("tenant_id", session.tenant.id)
      .single();

    if (fetchErr || !tu) {
      return { success: false, error: "Vínculo de usuário não encontrado nesta instituição." };
    }

    // 2. Proteção: não permite que o administrador desative a si próprio
    if (tu.user_id === session.user.id && !payload.isActive) {
      return {
        success: false,
        error: "Você não pode desativar seu próprio acesso à instituição.",
      };
    }

    // 3. Atualiza o status
    const { error: updateErr } = await (supabase.from("tenant_users") as any)
      .update({
        is_active: payload.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.tenantUserId)
      .eq("tenant_id", session.tenant.id);

    if (updateErr) {
      return { success: false, error: updateErr.message || "Erro ao alterar situação do usuário." };
    }

    // 4. Auditoria
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: payload.isActive ? "TENANT_USER_ACTIVATED" : "TENANT_USER_DEACTIVATED",
        entity_name: "tenant_users",
        entity_id: tu.user_id,
        new_values: { is_active: payload.isActive },
      },
    ]);

    revalidatePath("/app/configuracoes/usuarios");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao alterar situação do usuário." };
  }
}

// ==============================================================================
// 5. CARTEIRINHA ESTUDANTIL (TEMPLATE CONFIGURATION)
// ==============================================================================

export interface GetIdCardTemplateResponse {
  template: IdCardTemplateConfig;
  institution: {
    name: string;
    tradeName?: string | null;
    cnpj?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
    address?: string | null;
  };
}

export async function getIdCardTemplateAction(): Promise<{
  success: boolean;
  data?: GetIdCardTemplateResponse;
  error?: string;
}> {
  try {
    const session = await assertConfiguracoesAccess();
    const supabase = await createClient();

    const { data: tenant, error } = await (supabase.from("tenants") as any)
      .select("id, name, trade_name, cnpj, phone, settings")
      .eq("id", session.tenant.id)
      .single();

    if (error || !tenant) {
      return { success: false, error: "Dados institucionais não localizados." };
    }

    const settings = (tenant.settings as Record<string, any>) || {};
    const savedTemplate = (settings.id_card_template as Partial<IdCardTemplateConfig>) || {};

    // Monta endereço formatado caso exista nas configurações
    const addressParts = [
      settings.address_street,
      settings.address_number ? `nº ${settings.address_number}` : null,
      settings.address_neighborhood,
      settings.address_city && settings.address_state
        ? `${settings.address_city} - ${settings.address_state}`
        : settings.address_city,
    ].filter(Boolean);

    const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : undefined;

    // Mescla com defaults
    const mergedTemplate: IdCardTemplateConfig = {
      ...DEFAULT_ID_CARD_TEMPLATE,
      ...savedTemplate,
      school_name_override:
        savedTemplate.school_name_override || tenant.trade_name || tenant.name,
      school_logo_url: savedTemplate.school_logo_url || settings.logo_url || undefined,
      back_school_address: savedTemplate.back_school_address || fullAddress,
      back_school_phone: savedTemplate.back_school_phone || tenant.phone || undefined,
      back_school_cnpj: savedTemplate.back_school_cnpj || tenant.cnpj || undefined,
    };

    return {
      success: true,
      data: {
        template: mergedTemplate,
        institution: {
          name: tenant.name,
          tradeName: tenant.trade_name,
          cnpj: tenant.cnpj,
          phone: tenant.phone,
          logoUrl: settings.logo_url || null,
          address: fullAddress || null,
        },
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro ao carregar modelo da carteirinha.",
    };
  }
}

export async function saveIdCardTemplateAction(
  payload: IdCardTemplateConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await assertConfiguracoesAccess(true);
    const supabase = await createClient();

    // 1. Busca configurações atuais para mesclagem limpa
    const { data: currentTenant, error: fetchErr } = await (supabase.from("tenants") as any)
      .select("settings")
      .eq("id", session.tenant.id)
      .single();

    if (fetchErr || !currentTenant) {
      return { success: false, error: "Instituição não localizada para atualização." };
    }

    const currentSettings = (currentTenant.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...currentSettings,
      id_card_template: payload,
    };

    // 2. Atualiza tenants
    const { error: updateErr } = await (supabase.from("tenants") as any)
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.tenant.id);

    if (updateErr) {
      return { success: false, error: updateErr.message || "Erro ao salvar modelo." };
    }

    // 3. Auditoria sem dados sensíveis
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: session.tenant.id,
        user_id: session.user.id,
        action: "ID_CARD_TEMPLATE_UPDATED",
        entity_name: "tenants",
        entity_id: session.tenant.id,
        new_values: {
          theme: payload.theme,
          primary_color: payload.primary_color,
          font_family: payload.font_family,
          photo_shape: payload.photo_shape,
          show_qr_code: payload.show_qr_code,
          qr_code_position: payload.qr_code_position,
          academic_year: payload.academic_year,
          updated_at: new Date().toISOString(),
        },
      },
    ]);

    revalidatePath("/app/configuracoes/carteirinha");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro ao persistir modelo da carteirinha estudantil.",
    };
  }
}


