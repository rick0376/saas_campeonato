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
    console.log("Erro ao obter token no middleware:", error);
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (!token) {
    console.log("Middleware - Sem token, redirecionando para login");
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (pathname === "/backup") {
    if (token.role === "admin") {
      console.log("Middleware - Super Admin permitido em backup");
      return NextResponse.next();
    }

    if (token.clientId && token.clientId !== null && token.clientId !== "") {
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

  if (pathname === "/admin/gerar-jogos") {
    if (token.role === "admin") {
      console.log("Middleware - Super Admin permitido em gerar-jogos");
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
        console.log("Middleware - Usuário tem permissão para gerar-jogos");
        return NextResponse.next();
      }
    } catch (error) {
      console.log("Middleware - Erro ao verificar permissões:", error);
    }

    console.log("Middleware - Sem permissão para gerar-jogos");
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin")) {
    const clientId =
      !token.clientId || token.clientId === "undefined" ? null : token.clientId;
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
