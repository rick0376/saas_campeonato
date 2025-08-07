import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth"; // ✅ MUDANÇA: getToken → getServerSession
import { authOptions } from "../auth/[...nextauth]"; // ✅ NOVO: Importar authOptions
import { hash } from "bcryptjs";
import { prisma } from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  /* ───────────────────  AUTENTICAÇÃO  ─────────────────── */
  // ✅ CORREÇÃO: Usar getServerSession para consistência
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autorizado" });
  if (session.user?.role !== "admin")
    return res.status(403).json({ error: "Acesso negado" });

  const { id } = req.query;

  /* ───────────────────────  GET  ──────────────────────── */
  if (req.method === "GET") {
    try {
      const user = await prisma.user.findUnique({
        where: { id: String(id) },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissoes: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // ✅ CORREÇÃO: Converter permissões de string para objeto na resposta
      let permissoesObj;
      try {
        permissoesObj = JSON.parse(user.permissoes || "{}");
      } catch (e) {
        permissoesObj = {};
      }

      const userResponse = {
        ...user,
        permissoes: permissoesObj, // Retornar como objeto
      };

      return res.status(200).json(userResponse);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  /* ─────────────────────── PATCH ──────────────────────── */
  if (req.method === "PATCH") {
    const { name, email, role, password, permissoes } = req.body;
    const { id } = req.query;

    if (!role) {
      return res
        .status(400)
        .json({ error: "Tipo de usuário (role) é obrigatório" });
    }

    const updateData: any = {};

    if (name) {
      if (name.trim().length < 2) {
        return res
          .status(400)
          .json({ error: "Nome deve ter pelo menos 2 caracteres" });
      }
      updateData.name = name.trim();
    }

    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "E-mail inválido" });
      }
      const emailNormalizado = email.trim().toLowerCase();
      const emailInUse = await prisma.user.findFirst({
        where: { email: emailNormalizado, NOT: { id: String(id) } },
      });
      if (emailInUse) {
        return res.status(409).json({ error: "E-mail já está em uso" });
      }
      updateData.email = emailNormalizado;
    }

    // Normaliza role para minúscula e valida
    const roleNormalized =
      typeof role === "string" ? role.trim().toLowerCase() : "";
    if (!["user", "admin"].includes(roleNormalized)) {
      return res.status(400).json({ error: "Tipo de usuário inválido" });
    }
    updateData.role = roleNormalized;

    if (password) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }
      updateData.password = await hash(password, 12);
    }

    // Define permissoes baseado no papel
    if (roleNormalized === "admin") {
      updateData.permissoes = null;
    } else {
      if (permissoes && typeof permissoes === "object") {
        updateData.permissoes = JSON.stringify(permissoes);
      } else {
        // Permissões padrão para usuário
        updateData.permissoes = JSON.stringify({
          equipes: {
            visualizar: true,
            criar: false,
            editar: false,
            excluir: false,
          },
          grupos: {
            visualizar: true,
            criar: false,
            editar: false,
            excluir: false,
          },
          jogos: {
            visualizar: true,
            criar: false,
            editar: false,
            excluir: false,
          },
          jogadores: {
            visualizar: true,
            criar: false,
            editar: false,
            excluir: false,
          },
          usuarios: {
            visualizar: false,
            criar: false,
            editar: false,
            excluir: false,
          },
          relatorios: { visualizar: true, exportar: false },
        });
      }
    }

    try {
      // Log para debug (pode remover depois)
      console.log("Atualizando usuário ID:", id, "com dados:", updateData);

      const updated = await prisma.user.update({
        where: { id: String(id) },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissoes: true,
          createdAt: true,
        },
      });

      // Converter permissoes string para objeto para retornar
      const permissoesObj = updated.permissoes
        ? JSON.parse(updated.permissoes)
        : {};

      return res.status(200).json({
        message: "Usuário atualizado com sucesso",
        user: { ...updated, permissoes: permissoesObj },
      });
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error.message || error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  /* ─────────────────────── DELETE ─────────────────────── */
  if (req.method === "DELETE") {
    // ✅ CORREÇÃO: Usar session.user.id em vez de token.id
    if (String(id) === session.user?.id) {
      return res
        .status(400)
        .json({ error: "Você não pode excluir sua própria conta" });
    }

    try {
      // Verifica se o usuário existe antes de tentar excluir (mantido igual)
      const user = await prisma.user.findUnique({
        where: { id: String(id) },
      });

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      await prisma.user.delete({ where: { id: String(id) } });
      return res.status(200).json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  /* ────────────────────  DEFAULT  ─────────────────────── */
  return res.status(405).json({ error: "Método não permitido" });
}
