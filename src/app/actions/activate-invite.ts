"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InviteDetails, ActivateAccountResult } from "@/types/invite";

/**
 * Validação segura do token de convite da escola
 */
export async function validateInviteTokenAction(token: string): Promise<InviteDetails> {
  try {
    if (!token || !token.trim()) {
      return { valid: false, message: "Token de convite não informado." };
    }

    const supabase = await createClient();

    // Consulta via RPC
    const { data, error } = await (supabase as any).rpc("get_invite_details", {
      p_token: token.trim(),
    });

    if (!error && data) {
      return data as InviteDetails;
    }

    // Fallback: consulta direta nas tabelas com validação de expiração e status
    const { data: tenant, error: tErr } = await (supabase.from("tenants") as any)
      .select("id, name, slug, status, email, invite_status, invite_admin_email, invite_expires_at")
      .eq("invite_token", token.trim())
      .single();

    if (tErr || !tenant) {
      return { valid: false, message: "Convite não encontrado ou inválido." };
    }

    // Validação temporal de expiração (72h)
    if (tenant.invite_expires_at && new Date(tenant.invite_expires_at) < new Date()) {
      return {
        valid: false,
        expired: true,
        message: "Este convite expirou. Solicite um novo link de ativação.",
      };
    }

    if (tenant.invite_status === "accepted") {
      return {
        valid: false,
        already_accepted: true,
        message: "Este convite já foi utilizado para ativar a conta do administrador.",
      };
    }

    // Busca o vínculo de admin_escola
    const { data: tu } = await (supabase.from("tenant_users") as any)
      .select("user_id, role, profile:profiles(full_name, email)")
      .eq("tenant_id", tenant.id)
      .eq("role", "admin_escola")
      .single();

    return {
      valid: true,
      tenant_id: tenant.id,
      school_name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      admin_name: tu?.profile?.full_name || "Gestor(a) Escolar",
      admin_email: tu?.profile?.email || tenant.email,
      role: "admin_escola",
    };
  } catch (err: any) {
    console.error("Exceção validateInviteTokenAction:", err);
    return { valid: false, message: "Erro ao validar convite." };
  }
}

/**
 * Ativação real: criação de senha no Supabase Auth, aceite do convite e auditoria
 */
export async function activateTenantAdminAction(
  token: string,
  password: string
): Promise<ActivateAccountResult> {
  try {
    if (!token || !password) {
      return { success: false, error: "Dados incompletos para ativação." };
    }

    if (password.length < 6) {
      return { success: false, error: "A senha deve conter no mínimo 6 caracteres." };
    }

    // 1. Valida o convite
    const invite = await validateInviteTokenAction(token);
    if (!invite.valid || !invite.admin_email || !invite.tenant_id) {
      return { success: false, error: invite.message || "Convite inválido para ativação." };
    }

    const adminClient = createAdminClient();
    const email = invite.admin_email.trim().toLowerCase();

    // 2. Cria ou atualiza usuário no Supabase Auth via Admin Client
    let authUserId: string;

    // Tenta criar usuário no Auth
    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: invite.admin_name,
        role: "admin_escola",
      },
    });

    if (createError) {
      // Se usuário já existir no Auth, atualiza sua senha
      const { data: listData } = await adminClient.auth.admin.listUsers();
      const existingAuthUser = listData?.users.find((u) => u.email?.toLowerCase() === email);

      if (existingAuthUser) {
        authUserId = existingAuthUser.id;
        await adminClient.auth.admin.updateUserById(authUserId, {
          password: password,
          email_confirm: true,
        });
      } else {
        return {
          success: false,
          error: `Falha ao criar credencial de acesso: ${createError.message}`,
        };
      }
    } else {
      authUserId = createdUser.user.id;
    }

    // 3. Garante sincronização em profiles (com is_platform_admin = FALSE)
    await (adminClient.from("profiles") as any).upsert({
      id: authUserId,
      email: email,
      full_name: invite.admin_name || "Gestor Escolar",
      is_platform_admin: false, // NUNCA SUPER ADMIN
      updated_at: new Date().toISOString(),
    });

    // 4. Garante sincronização em tenant_users
    await (adminClient.from("tenant_users") as any).upsert(
      {
        tenant_id: invite.tenant_id,
        user_id: authUserId,
        role: "admin_escola",
        is_active: true,
        custom_permissions: ["admin_escola_total"],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,user_id" }
    );

    // 5. Marca convite como accepted e grava em audit_logs
    await (adminClient as any).rpc("complete_tenant_activation", {
      p_token: token.trim(),
      p_user_id: authUserId,
    });

    // Fallback de atualização caso RPC falhe
    await (adminClient.from("tenants") as any)
      .update({
        invite_status: "accepted",
        invite_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invite.tenant_id);

    return {
      success: true,
      email: email,
      message: "Conta ativada com sucesso! Entrando na aplicação escolar...",
    };
  } catch (err: any) {
    console.error("Exceção activateTenantAdminAction:", err);
    return {
      success: false,
      error: err?.message || "Erro inesperado ao ativar conta.",
    };
  }
}
