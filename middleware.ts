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

  // Permite acesso liberado para rotas públicas e assets estáticos
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

  let token;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch (error) {
    console.error("Erro ao obter token no middleware:", error);
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (!token) {
    console.log("Middleware - Sem token, redirecionando para login");
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (pathname === "/backup") {
    if (token.role === "admin") {
      return NextResponse.next();
    }

    if (token.clientId && token.clientId !== null && token.clientId !== "") {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/admin/gerar-jogos") {
    if (token.role === "admin") {
      return NextResponse.next();
    }

    try {
      let permissoes;
      if (typeof token.permissoes === "string") {
        permissoes = JSON.parse(token.permissoes);
      } else {
        permissoes = token.permissoes || {};
      }

      const temPermissao = permissoes["gerar-jogos"]?.["criar"] === true;

      if (temPermissao) {
        return NextResponse.next();
      }
    } catch {
      // Se erro na permissão, bloqueia acesso
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin")) {
    const clientId =
      !token.clientId || token.clientId === "undefined" ? null : token.clientId;
    const isSuperAdmin =
      token.role === "admin" && (clientId === null || clientId === "undefined");

    if (!isSuperAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
