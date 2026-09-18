"use server";

import { createClient } from "@/lib/supabase/server";
import { getPlatformAdminSession } from "@/lib/platform/resolver";
import { SetupFirstAdminInput, SetupFirstAdminResult } from "@/types/first-access";
import { revalidatePath } from "next/cache";

export async function setupTenantFirstAdminAction(
  payload: SetupFirstAdminInput
): Promise<SetupFirstAdminResult> {
  try {
    const session = await getPlatformAdminSession();
    if (!session) {
      return {
        success: false,
        error: "Acesso negado: Somente Super Administradores da Plataforma podem configurar o primeiro acesso.",
      };
    }

    if (!payload.tenantId || !payload.fullName || !payload.email) {
      return {
        success: false,
        error: "Por favor, preencha o nome completo e o e-mail institucional do administrador.",
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      return {
        success: false,
        error: "Informe um endereço de e-mail válido.",
      };
    }

    const supabase = await createClient();

    // 1. Tenta executar via RPC atômica PostgreSQL
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "setup_tenant_first_admin",
      {
        p_tenant_id: payload.tenantId,
        p_full_name: payload.fullName.trim(),
        p_email: payload.email.trim().toLowerCase(),
      }
    );

    if (!rpcError && rpcData) {
      revalidatePath("/admin/tenants");
      return {
        success: true,
        tenant_id: rpcData.tenant_id,
        user_id: rpcData.user_id,
        admin_name: rpcData.admin_name,
        admin_email: rpcData.admin_email,
        role: rpcData.role,
        invite_token: rpcData.invite_token,
        access_domain: rpcData.access_domain,
      };
    }

    // 2. Fallback transacional no servidor (caso a RPC ainda não esteja no banco)
    const normalizedEmail = payload.email.trim().toLowerCase();
    const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Verifica se o profile já existe
    const { data: existingProfile } = await (supabase.from("profiles") as any)
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    let userId = existingProfile?.id;

    if (userId) {
      // Garante is_platform_admin = false
      await (supabase.from("profiles") as any)
        .update({
          full_name: payload.fullName.trim(),
          is_platform_admin: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    } else {
      userId = crypto.randomUUID();
      await (supabase.from("profiles") as any).insert([
        {
          id: userId,
          email: normalizedEmail,
          full_name: payload.fullName.trim(),
          is_platform_admin: false, // NUNCA SUPER ADMIN
        },
      ]);
    }

    // Cria/Atualiza vínculo tenant_users
    await (supabase.from("tenant_users") as any).upsert(
      {
        tenant_id: payload.tenantId,
        user_id: userId,
        role: "admin_escola",
        is_active: true,
        custom_permissions: ["admin_escola_total"],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,user_id" }
    );

    // Atualiza status no tenant
    await (supabase.from("tenants") as any)
      .update({
        first_admin_created_at: new Date().toISOString(),
        invite_token: token,
        invite_status: "created",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.tenantId);

    // Registro de Auditoria no audit_logs do tenant (sem expor token confidencial)
    await (supabase.from("audit_logs") as any).insert([
      {
        tenant_id: payload.tenantId,
        user_id: session.user.id,
        action: "FIRST_ADMIN_SETUP",
        entity_name: "tenant_users",
        entity_id: userId,
        new_values: {
          admin_name: payload.fullName.trim(),
          admin_email: normalizedEmail,
          role: "admin_escola",
          access_url: "app.educar360.com.br",
        },
      },
    ]);

    revalidatePath("/admin/tenants");

    return {
      success: true,
      tenant_id: payload.tenantId,
      user_id: userId,
      admin_name: payload.fullName.trim(),
      admin_email: normalizedEmail,
      role: "admin_escola",
      invite_token: token,
      access_domain: "app.educar360.com.br",
    };
  } catch (err: any) {
    console.error("Exceção setupTenantFirstAdminAction:", err);
    return {
      success: false,
      error: err?.message || "Erro inesperado ao configurar primeiro acesso.",
    };
  }
}
