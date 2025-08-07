import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = [
    "/",
    "/auth/login",
    "/cadastrar/clients",
    "/api/clients/public",
    "/jogos-publicos",
  ];

  // Rotas de sistema que devem ser ignoradas
  if (
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/imagens/") ||
    pathname.startsWith("/public/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes("favicon.ico") ||
    publicRoutes.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // Verificar token para rotas protegidas
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    console.log("Middleware - Sem token, redirecionando para login");
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // ✅ NOVO: Verificação específica para backup
  if (pathname === "/backup") {
    // Super Admin sempre pode acessar
    if (token.role === "admin") {
      console.log("Middleware - Super Admin permitido em backup");
      return NextResponse.next();
    }

    // Usuários normais também podem fazer backup de seus próprios dados
    if (
      token.clientId &&
      token.clientId !== "undefined" &&
      token.clientId !== "null"
    ) {
      console.log(
        "Middleware - Cliente permitido em backup dos próprios dados"
      );
      return NextResponse.next();
    }

    console.log(
      "Middleware - Usuário sem cliente definido, negando acesso ao backup"
    );
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ✅ CORREÇÃO: Verificação específica para gerar-jogos
  if (pathname === "/admin/gerar-jogos") {
    // Se for super admin, permitir
    if (token.role === "admin") {
      console.log("Middleware - Super Admin permitido em gerar-jogos");
      return NextResponse.next();
    }

    // Se não for admin, verificar permissões específicas
    try {
      // Verificar se permissoes é string ou objeto
      let permissoes;
      if (typeof token.permissoes === "string") {
        permissoes = JSON.parse(token.permissoes);
      } else {
        permissoes = token.permissoes || {};
      }

      const temPermissao = permissoes["gerar-jogos"]?.["criar"] === true;

      if (temPermissao) {
        console.log("Middleware - Usuário tem permissão para gerar-jogos");
        return NextResponse.next();
      }
    } catch (error) {
      console.log("Middleware - Erro ao verificar permissões:", error);
    }

    console.log("Middleware - Sem permissão para gerar-jogos");
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Para outras rotas administrativas, verificar se é Super Admin
  if (pathname.startsWith("/admin")) {
    const clientId = token.clientId === "undefined" ? null : token.clientId;
    const isSuperAdmin =
      token.role === "admin" && (clientId === null || clientId === "undefined");

    if (!isSuperAdmin) {
      console.log("Middleware - Usuário não é Super Admin, redirecionando");
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  console.log("Middleware - Permitindo acesso autorizado");
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
