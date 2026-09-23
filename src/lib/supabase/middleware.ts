import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database, Profile } from "@/types/database";

export async function updateSession(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const rawPathname = request.nextUrl.pathname;

  // 0. Filtro para arquivos estáticos e internos do Next.js
  const isPublicStatic =
    rawPathname.startsWith("/_next") ||
    rawPathname.includes(".") ||
    rawPathname === "/favicon.ico";

  if (isPublicStatic) {
    return NextResponse.next();
  }

  // Identificação do Subdomínio / Host
  const isPlatformAdminSubdomain = host.startsWith("admin.");
  const isTenantAppSubdomain = host.startsWith("app.");

  // Identificação de compatibilidade para desenvolvimento local ou caminhos diretos
  const isDirectTenantAuthRoute = rawPathname === "/ativar" || rawPathname === "/login";
  const isPlatformAdminHost = isPlatformAdminSubdomain || rawPathname.startsWith("/admin");
  const isTenantAppHost = isTenantAppSubdomain || rawPathname.startsWith("/app") || isDirectTenantAuthRoute;
  const isLandingHost = !isPlatformAdminHost && !isTenantAppHost;

  // 1. REGRAS DA LANDING PAGE (www.educar360.com.br / educar360.com.br / localhost padrão)
  if (isLandingHost) {
    return NextResponse.next();
  }

  // Rewrite transparente para subdomínios ou rotas de autenticação sem prefixo (mantém URL limpa)
  let effectivePathname = rawPathname;
  let shouldRewrite = false;

  if ((isTenantAppSubdomain || isDirectTenantAuthRoute) && !rawPathname.startsWith("/app")) {
    effectivePathname = rawPathname === "/" ? "/app/dashboard" : `/app${rawPathname}`;
    shouldRewrite = true;
  } else if (isPlatformAdminSubdomain && !rawPathname.startsWith("/admin")) {
    effectivePathname = rawPathname === "/" ? "/admin/dashboard" : `/admin${rawPathname}`;
    shouldRewrite = true;
  }

  // Instanciação segura do cliente Supabase SSR para validação de sessão e cookies
  let response = NextResponse.next();

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. REGRAS DO ADMIN DA PLATAFORMA (admin.educar360.com.br ou /admin no localhost)
  if (isPlatformAdminHost) {
    const isLoginRoute =
      effectivePathname === "/admin/login" ||
      effectivePathname === "/login" ||
      rawPathname === "/login" ||
      rawPathname === "/admin/login";

    // 2.1 Não autenticado tentando acessar o painel administrativo
    if (!user && !isLoginRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = isPlatformAdminSubdomain ? "/login" : "/admin/login";
      return NextResponse.redirect(redirectUrl);
    }

    // 2.2 Usuário autenticado
    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_platform_admin")
        .eq("id", user.id)
        .single();

      const profile = profileData as unknown as Profile | null;

      // Usuário sem permissão de super admin tentando acessar o admin da plataforma
      if (!profile || !profile.is_platform_admin) {
        if (isLoginRoute) {
          return response;
        }
        // Redireciona usuário escolar para o subdomínio ou caminho da escola
        if (isPlatformAdminSubdomain) {
          const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "app.educar360.com.br";
          return NextResponse.redirect(new URL(`https://${appDomain}/dashboard`));
        }
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/app/dashboard";
        return NextResponse.redirect(redirectUrl);
      }

      // Usuário autenticado como Super Admin tentando acessar a tela de login
      if (isLoginRoute) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = isPlatformAdminSubdomain ? "/dashboard" : "/admin/dashboard";
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Aplica o rewrite transparente se estiver no subdomínio admin
    if (shouldRewrite) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = effectivePathname;
      const rewriteResponse = NextResponse.rewrite(rewriteUrl);
      // Preserva cookies da resposta
      response.cookies.getAll().forEach((c) => {
        rewriteResponse.cookies.set(c.name, c.value);
      });
      return rewriteResponse;
    }

    return response;
  }

  // 3. REGRAS DA APLICAÇÃO ESCOLAR (app.educar360.com.br ou /app no localhost)
  if (isTenantAppHost) {
    const isPublicAppRoute =
      effectivePathname === "/app/login" ||
      effectivePathname === "/app/ativar" ||
      rawPathname === "/login" ||
      rawPathname === "/ativar";

    // 3.1 Usuário não autenticado tentando acessar módulo escolar
    if (!user && !isPublicAppRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = isTenantAppSubdomain ? "/login" : "/app/login";
      return NextResponse.redirect(redirectUrl);
    }

    // Aplica o rewrite transparente se estiver no subdomínio app
    if (shouldRewrite) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = effectivePathname;
      const rewriteResponse = NextResponse.rewrite(rewriteUrl);
      response.cookies.getAll().forEach((c) => {
        rewriteResponse.cookies.set(c.name, c.value);
      });
      return rewriteResponse;
    }

    return response;
  }

  return response;
}
