// lib/withAuth.ts
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";

export interface AuthProps {
  session: any;
}

export type AuthType = "required" | "optional" | "guest-only";

export function withAuth<P extends Record<string, any> = {}>(
  getServerSidePropsFunc?: GetServerSideProps<P>,
  authType: AuthType = "required"
) {
  return async (ctx: GetServerSidePropsContext) => {
    const session = await getServerSession(ctx.req, ctx.res, authOptions);

    switch (authType) {
      case "required":
        if (!session) {
          return {
            redirect: {
              destination: "/auth/login",
              permanent: false,
            },
          };
        }
        break;

      case "guest-only":
        if (session) {
          return {
            redirect: {
              destination: "/jogos/",
              permanent: false,
            },
          };
        }
        break;

      case "optional":
        break;
    }

    if (getServerSidePropsFunc) {
      const result = await getServerSidePropsFunc(ctx);

      if ("redirect" in result || "notFound" in result) {
        return result;
      }

      return {
        ...result,
        props: {
          ...result.props,
          session,
        },
      };
    }

    return {
      props: {
        session,
      } as P & AuthProps,
    };
  };
}
