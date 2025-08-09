import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = [
    "/",
    "/auth/login",
    //"/cadastrar/clients",
    "/api/clients/public",
    "/jogos-publicos",
  ];

  // Ignorar rotas do sistema e públicas
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

  // Obter token JWT validado com secret
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Se não tem token, redirecionar para login
  if (!token) {
    console.log("Middleware - Sem token, redirecionando para login");
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Tratamento robusto do clientId para detectar super admin
  const clientId =
    !token.clientId ||
    token.clientId === "undefined" ||
    token.clientId === "null"
      ? null
      : token.clientId;

  // Verificação para rota /backup
  if (pathname === "/backup") {
    if (token.role === "admin") {
      console.log("Middleware - Super Admin permitido em backup");
      return NextResponse.next();
    }
    if (clientId) {
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

  // Verificação para rota /admin/gerar-jogos
  if (pathname === "/admin/gerar-jogos") {
    if (token.role === "admin") {
      console.log("Middleware - Super Admin permitido em gerar-jogos");
      return NextResponse.next();
    }
    try {
      const permissoes =
        typeof token.permissoes === "string"
          ? JSON.parse(token.permissoes)
          : token.permissoes || {};

      if (permissoes["gerar-jogos"]?.["criar"] === true) {
        console.log("Middleware - Usuário tem permissão para gerar-jogos");
        return NextResponse.next();
      }
    } catch (error) {
      console.log("Middleware - Erro ao verificar permissões:", error);
    }
    console.log("Middleware - Sem permissão para gerar-jogos");
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Para outras rotas administrativas, somente super admins
  if (pathname.startsWith("/admin")) {
    const isSuperAdmin = token.role === "admin" && clientId === null;

    if (!isSuperAdmin) {
      console.log("Middleware - Usuário não é Super Admin, redirecionando");
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Permitir acesso autorizado
  console.log("Middleware - Permitindo acesso autorizado");
  return NextResponse.next();
}

// Define as rotas onde o middleware será aplicado
export const config = {
  matcher: [
    /*
     * Aplica o middleware a todas as rotas, exceto as que:
     * - iniciam com /api
     * - são arquivos estáticos
     * - são imagens otimizadas pelo Next.js
     * - favicon
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
