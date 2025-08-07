import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/router";

export function useSessionValidator() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading" || !session) return;

    const validateSession = async () => {
      try {
        const response = await fetch("/api/auth/validate-session");

        if (!response.ok) {
          const data = await response.json();

          if (data.reason === "permissions-updated") {
            console.log(
              "🔄 Permissões atualizadas - fazendo logout automático"
            );

            // Fazer logout silencioso
            await signOut({
              redirect: false,
              callbackUrl: "/auth/login?reason=permissions-updated",
            });

            // Redirecionar com mensagem
            router.push("/auth/login?reason=permissions-updated");
          }
        }
      } catch (error) {
        console.error("Erro ao validar sessão:", error);
      }
    };

    // Validar imediatamente e depois a cada 30 segundos
    validateSession();
    const interval = setInterval(validateSession, 30000);

    return () => clearInterval(interval);
  }, [session, status, router]);
}
