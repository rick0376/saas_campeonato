import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // ✅ CORRIGIDO: Usar getToken em vez de getSession
    const token = await getToken({ req });

    if (!token) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    // ✅ CORRIGIDO: Permitir SUPER_ADMIN e usuários com clientId
    const isSuperAdmin = token.role === "admin";
    const hasClientId = token.clientId && token.clientId !== "null";

    if (!isSuperAdmin && !hasClientId) {
      return res.status(403).json({
        error: "Acesso negado. Você deve estar associado a um cliente.",
      });
    }

    switch (req.method) {
      case "GET":
        return await getUsuarios(req, res, token);
      case "POST": // ✅ NOVO: Adicionar método POST
        return await createUsuario(req, res, token);
      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({ error: "Método não permitido" });
    }
  } catch (error) {
    console.error("Erro na API de usuários:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// ✅ CORRIGIDO: GET - Listar usuários com filtro por cliente
async function getUsuarios(
  req: NextApiRequest,
  res: NextApiResponse,
  token: any
) {
  try {
    const { clientId } = req.query;

    let usuarios;

    // Super Admin pode ver todos ou filtrar por cliente específico
    if (token.role === "SUPER_ADMIN") {
      if (clientId) {
        usuarios = await prisma.user.findMany({
          where: { clientId: clientId as string },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            permissoes: true,
            clientId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
      } else {
        // Todos os usuários do sistema
        usuarios = await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            permissoes: true,
            clientId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
      }
    } else {
      // Usuário normal: apenas usuários do próprio cliente
      usuarios = await prisma.user.findMany({
        where: { clientId: token.clientId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissoes: true,
          clientId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Converter permissões de string para objeto (se necessário)
    const usuariosFormatados = usuarios.map((usuario) => {
      let permissoesObj;
      try {
        // Se permissoes for string, converter para objeto
        if (typeof usuario.permissoes === "string") {
          permissoesObj = JSON.parse(usuario.permissoes || "{}");
        } else {
          permissoesObj = usuario.permissoes || {};
        }
      } catch (e) {
        permissoesObj = {};
      }

      return {
        ...usuario,
        permissoes: permissoesObj,
      };
    });

    console.log(
      `✅ Retornando ${usuariosFormatados.length} usuários para cliente: ${token.clientId}`
    );
    return res.status(200).json(usuariosFormatados);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return res.status(500).json({ error: "Erro ao buscar usuários" });
  }
}

// ✅ NOVO: POST - Criar usuário
async function createUsuario(
  req: NextApiRequest,
  res: NextApiResponse,
  token: any
) {
  try {
    const { name, email, password, role, clientId: bodyClientId } = req.body;

    // Validações básicas
    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Campos obrigatórios: name, email, password",
      });
    }

    // Definir clientId correto baseado em quem está criando
    let clientId: string | null = null;

    if (token.role === "SUPER_ADMIN") {
      // Super Admin pode escolher clientId ou deixar null
      clientId = bodyClientId || null;
    } else {
      // Usuário normal: sempre usar seu próprio clientId
      if (!token.clientId || token.clientId === "null") {
        return res.status(403).json({ error: "Cliente não identificado" });
      }
      clientId = token.clientId;
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Este email já está em uso" });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar usuário
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role || "user",
        clientId,
        permissoes: "{}", // Permissões padrão vazias
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clientId: true,
        createdAt: true,
      },
    });

    console.log(
      `✅ Usuário criado: ${newUser.email} para cliente: ${clientId}`
    );
    return res.status(201).json(newUser);
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return res.status(500).json({ error: "Erro ao criar usuário" });
  }
}
