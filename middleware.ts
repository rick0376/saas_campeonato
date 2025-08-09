import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = [
    "/",
    "/auth/login",
    "/api/clients/public",
    "/jogos-publicos",
  ];

  // Ignora rotas públicas e do sistema
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

  // Recupera token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    console.log("Middleware - Sem token, redirecionando para login");
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const clientId =
    !token.clientId ||
    token.clientId === "undefined" ||
    token.clientId === "null"
      ? null
      : token.clientId;

  // /backup
  if (pathname === "/backup") {
    if (token.role === "admin") return NextResponse.next();
    if (clientId) return NextResponse.next();
    return NextResponse.redirect(new URL("/", request.url));
  }

  // /admin/gerar-jogos
  if (pathname === "/admin/gerar-jogos") {
    if (token.role === "admin") return NextResponse.next();
    try {
      const permissoes =
        typeof token.permissoes === "string"
          ? JSON.parse(token.permissoes)
          : token.permissoes || {};

      if (permissoes["gerar-jogos"]?.["criar"] === true) {
        return NextResponse.next();
      }
    } catch (error) {
      console.log("Middleware - Erro ao verificar permissões:", error);
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // /admin/dashboard
  if (pathname === "/admin/dashboard") {
    const isSuperAdmin = token.role === "admin" && clientId === null;
    if (isSuperAdmin) return NextResponse.next();

    const permissoes =
      typeof token.permissoes === "string"
        ? JSON.parse(token.permissoes)
        : token.permissoes || {};

    if (permissoes.dashboard?.visualizar === true) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  // Outras rotas protegidas seguem a lógica padrão
  console.log("Middleware - Permitindo acesso autorizado");
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
