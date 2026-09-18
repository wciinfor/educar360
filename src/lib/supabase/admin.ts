import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

/**
 * Cliente Supabase com Service Role Key para operações administrativas seguras no servidor
 * (ex: ativação e criação de credenciais em auth.admin).
 * NUNCA utilize no navegador/lado cliente.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Operação administrativa abortada: SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente do servidor."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
