import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "../../../lib/prisma";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
    secret: process.env.NEXTAUTH_SECRET,
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Senha", type: "password" },
        clientId: { label: "Client ID", type: "text" },
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          console.log("Credenciais inválidas: email ou senha em branco");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            select: {
              id: true,
              name: true,
              email: true,
              password: true,
              role: true,
              permissoes: true,
              clientId: true,
            },
          });

          if (!user) {
            console.log("Usuário não encontrado:", credentials.email);
            return null;
          }

          const isValid = await compare(credentials.password, user.password);
          if (!isValid) {
            console.log("Senha incorreta para:", credentials.email);
            return null;
          }

          const requestedClientId = credentials.clientId;

          // ✅ CORREÇÃO CRÍTICA: Permitir login sem clientId para qualquer admin
          if (user.role === "admin") {
            console.log("Admin fazendo login:", user.email);

            let permissoesObj;
            try {
              permissoesObj = user.permissoes
                ? JSON.parse(user.permissoes)
                : {};
            } catch (e) {
              permissoesObj = {};
            }

            // ✅ Se tem clientId próprio e não especificou outro, usar o próprio
            const finalClientId = requestedClientId || user.clientId;

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              permissoes: permissoesObj,
              clientId: finalClientId,
            };
          }

          // Para usuários normais, validar cliente
          if (user.clientId) {
            if (requestedClientId && requestedClientId !== user.clientId) {
              console.log(
                `CLIENT_MISMATCH: Usuário ${user.email} tentou acessar cliente ${requestedClientId}, mas pertence ao cliente ${user.clientId}`
              );
              return null;
            }

            let permissoesObj;
            try {
              permissoesObj = user.permissoes
                ? JSON.parse(user.permissoes)
                : {};
            } catch (e) {
              permissoesObj = {};
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              permissoes: permissoesObj,
              clientId: user.clientId,
            };
          }

          return null;
        } catch (error) {
          console.error("Erro na autenticação:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
        token.permissoes = user.permissoes;
        token.clientId = user.clientId;
      }

      if (trigger === "update" && session?.clientId !== undefined) {
        console.log("Atualizando clientId na sessão:", session.clientId);
        token.clientId = session.clientId;
      }

      return token;
    },

    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.permissoes = token.permissoes;
        session.user.clientId = token.clientId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

export default NextAuth(authOptions);
