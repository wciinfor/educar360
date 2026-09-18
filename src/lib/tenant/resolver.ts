import { createClient } from "@/lib/supabase/server";
import { AuthenticatedTenantSession } from "@/types/tenant";
import { Tenant, TenantUser, Profile, UserRole } from "@/types/database";
import { cookies } from "next/headers";

const TENANT_COOKIE_NAME = "educar360_active_tenant";

interface TenantUserWithTenant extends TenantUser {
  tenant: Tenant;
}

/**
 * Resolução de Tenant segura no lado do servidor.
 * Obtém a sessão do usuário autenticado e resolve o tenant selecionado,
 * garantindo validação de vínculo e papel na escola.
 */
export async function getTenantSession(): Promise<AuthenticatedTenantSession | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Busca perfil
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profileData) {
    return null;
  }

  const profile = profileData as unknown as Profile;

  // Busca todos os vínculos de tenant do usuário
  const { data: tenantUsersData } = await supabase
    .from("tenant_users")
    .select(`
      id,
      tenant_id,
      user_id,
      role,
      is_active,
      custom_permissions,
      created_at,
      updated_at,
      tenant:tenants (
        id,
        name,
        trade_name,
        slug,
        cnpj,
        email,
        phone,
        status,
        settings,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!tenantUsersData || tenantUsersData.length === 0) {
    return null;
  }

  const tenantUsers = tenantUsersData as unknown as TenantUserWithTenant[];

  // Lista formatada de tenants disponíveis para o usuário
  const allUserTenants = tenantUsers
    .filter((tu) => tu.tenant && tu.tenant.status === "active")
    .map((tu) => ({
      tenant: tu.tenant,
      role: tu.role as UserRole,
    }));

  if (allUserTenants.length === 0) {
    return null;
  }

  // Cookie de tenant ativo preferencial
  const cookieStore = await cookies();
  const preferredTenantId = cookieStore.get(TENANT_COOKIE_NAME)?.value;

  // Seleciona o tenant ativo (ou pelo cookie salvo, ou o primeiro disponível)
  let activeTenantUser = tenantUsers.find(
    (tu) => tu.tenant_id === preferredTenantId && tu.tenant && tu.tenant.status === "active"
  );

  if (!activeTenantUser) {
    activeTenantUser = tenantUsers.find(
      (tu) => tu.tenant && tu.tenant.status === "active"
    ) || tenantUsers[0];
  }

  if (!activeTenantUser || !activeTenantUser.tenant) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email || profile.email,
    },
    profile,
    tenant: activeTenantUser.tenant,
    tenantUser: {
      id: activeTenantUser.id,
      tenant_id: activeTenantUser.tenant_id,
      user_id: activeTenantUser.user_id,
      role: activeTenantUser.role as UserRole,
      is_active: activeTenantUser.is_active,
      custom_permissions: activeTenantUser.custom_permissions || [],
      created_at: activeTenantUser.created_at,
      updated_at: activeTenantUser.updated_at,
    },
    role: activeTenantUser.role as UserRole,
    allUserTenants,
  };
}

/**
 * Validador para garantir que operações no banco recebam o tenant_id ativo
 */
export function assertTenantContext(tenantId: string | undefined): asserts tenantId is string {
  if (!tenantId) {
    throw new Error("VIOLAÇÃO DE ISOLAMENTO MULTI-TENANT: Nenhuma instituição escolar identificada para esta operação.");
  }
}
