import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database, Profile } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Identificação do Ambiente por Hostname ou por Prefixo de Rota (para desenvolvimento local)
  const isPlatformAdminHost = host.startsWith("admin.") || pathname.startsWith("/admin");
  const isTenantAppHost = host.startsWith("app.") || pathname.startsWith("/app");
  const isLandingHost = !isPlatformAdminHost && !isTenantAppHost;

  const isPublicStatic =
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico";

  if (isPublicStatic) {
    return supabaseResponse;
  }

  // 1. REGRAS DA LANDING PAGE (educar360.com.br)
  // Totalmente pública e livre de autenticação
  if (isLandingHost) {
    return supabaseResponse;
  }

  // Instanciação segura do cliente Supabase SSR
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. REGRAS DO ADMIN DA PLATAFORMA (admin.educar360.com.br / /admin)
  if (isPlatformAdminHost) {
    const isLoginRoute = pathname === "/admin/login" || pathname === "/login";

    // Não autenticado tentando acessar o Backoffice
    if (!user && !isLoginRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    // Se autenticado, verificar se tem permissão de super admin
    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_platform_admin")
        .eq("id", user.id)
        .single();

      const profile = profileData as unknown as Profile | null;

      // Usuário comum de escola tentando acessar o Backoffice da Plataforma
      if (!profile || !profile.is_platform_admin) {
        if (isLoginRoute) {
          return supabaseResponse;
        }
        // Redireciona usuário comum para sua aplicação escolar
        const url = request.nextUrl.clone();
        url.pathname = "/app/dashboard";
        return NextResponse.redirect(url);
      }

      // Já logado como super admin e tentando acessar a página de login
      if (isLoginRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/dashboard";
        return NextResponse.redirect(url);
      }
    }

    return supabaseResponse;
  }

  // 3. REGRAS DA APLICAÇÃO ESCOLAR (app.educar360.com.br / /app)
  if (isTenantAppHost) {
    const isPublicAppRoute =
      pathname === "/app/login" ||
      pathname === "/app/ativar" ||
      pathname === "/login" ||
      pathname === "/ativar";

    // Não autenticado tentando acessar área interna da escola
    if (!user && !isPublicAppRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/app/login";
      return NextResponse.redirect(url);
    }

    // Se autenticado e tentando acessar login (mas permite rota de ativação)
    if (user && (pathname === "/app/login" || pathname === "/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/app/dashboard";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  return supabaseResponse;
}
