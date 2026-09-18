import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/types/database";

export interface PlatformAdminSession {
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
}

/**
 * Resolução de sessão exclusiva do Backoffice da Plataforma (admin.educar360.com.br).
 * Valida estritamente se o usuário tem a flag `is_platform_admin = true`.
 * Super Admins NÃO são atrelados a um tenant de escola.
 */
export async function getPlatformAdminSession(): Promise<PlatformAdminSession | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profileData) {
    return null;
  }

  const profile = profileData as unknown as Profile;

  if (!profile.is_platform_admin) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email || profile.email,
    },
    profile,
  };
}
