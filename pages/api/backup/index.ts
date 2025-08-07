import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { prisma } from "../../../lib/prisma";
import JSZip from "jszip";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const token = await getToken({ req });

    console.log("🔍 Token recebido na API backup:", {
      exists: !!token,
      role: token?.role,
      clientId: token?.clientId,
      email: token?.email,
    });

    if (!token) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    // ✅ CORREÇÃO: Usar a mesma lógica que funcionou nos clientes
    const isSuperAdmin =
      token.role === "admin" &&
      (token.clientId === null ||
        token.clientId === undefined ||
        token.clientId === "null" ||
        token.clientId === "undefined" || // ✅ Incluir "undefined" como string
        !token.clientId);

    console.log("🔍 Verificação Super Admin no backup:", {
      role: token.role,
      clientId: token.clientId,
      clientIdType: typeof token.clientId,
      isSuperAdmin: isSuperAdmin,
    });

    const { tipoBackup, clienteId } = req.body;

    let dadosBackup: any = {};
    let nomeArquivo = "";

    // ✅ CORRIGIDO: Backup por cliente (Usuários normais)
    if (!isSuperAdmin) {
      if (
        !token.clientId ||
        token.clientId === "undefined" ||
        token.clientId === "null"
      ) {
        return res.status(403).json({ error: "Cliente não identificado" });
      }

      // USAR O clientId do TOKEN, não do body
      dadosBackup = await gerarBackupCliente(token.clientId as string);
      nomeArquivo = `backup-cliente-${
        new Date().toISOString().split("T")[0]
      }.json`;
    }
    // ✅ Backup administrativo (Super Admin)
    else {
      console.log(
        "✅ Super Admin verificado - processando backup:",
        tipoBackup
      );

      switch (tipoBackup) {
        case "cliente_especifico":
          if (!clienteId) {
            return res
              .status(400)
              .json({ error: "ID do cliente é obrigatório" });
          }
          dadosBackup = await gerarBackupCliente(clienteId);
          nomeArquivo = `backup-cliente-${clienteId}-${
            new Date().toISOString().split("T")[0]
          }.json`;
          break;

        case "banco_completo":
          dadosBackup = await gerarBackupCompleto();
          nomeArquivo = `backup-completo-${
            new Date().toISOString().split("T")[0]
          }.json`;
          break;

        default:
          return res.status(400).json({ error: "Tipo de backup inválido" });
      }
    }

    console.log("📦 Criando ZIP do backup...");

    // Criar ZIP com os dados
    const zip = new JSZip();
    zip.file(nomeArquivo, JSON.stringify(dadosBackup, null, 2));

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="backup-${Date.now()}.zip"`
    );

    console.log("✅ Backup gerado com sucesso!");
    return res.send(zipBuffer);
  } catch (error) {
    console.error("❌ Erro na API de backup:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// FUNÇÃO CORRIGIDA: Backup de cliente específico
async function gerarBackupCliente(clientId: string) {
  const [client, usuarios, grupos, equipes, jogos] = await Promise.all([
    // Dados do cliente
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        createdAt: true,
      },
    }),

    // Usuários do cliente - APENAS usuários que realmente pertencem ao cliente
    prisma.user.findMany({
      where: {
        AND: [
          { clientId: clientId },
          { clientId: { not: null } },
          { role: { not: "admin", in: ["user"] } }, // ✅ CORRIGIDO: Excluir admins, incluir apenas users
          {
            email: {
              not: {
                in: ["admin@lhp.com", "root@admin.com"],
              },
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    }),

    // Grupos do cliente
    prisma.grupo.findMany({
      where: {
        clientId: clientId,
      },
      select: {
        id: true,
        nome: true,
      },
    }),

    // Equipes do cliente
    prisma.equipe.findMany({
      where: {
        clientId: clientId,
      },
      include: {
        grupo: {
          select: { nome: true },
        },
      },
    }),

    // Jogos do cliente
    prisma.jogo.findMany({
      where: {
        OR: [
          { equipeA: { clientId: clientId } },
          { equipeB: { clientId: clientId } },
        ],
      },
      include: {
        grupo: { select: { nome: true } },
        equipeA: { select: { nome: true } },
        equipeB: { select: { nome: true } },
      },
    }),
  ]);

  return {
    metadados: {
      tipoBackup: "cliente_especifico",
      clienteId: clientId,
      nomeCliente: client?.name || "Cliente não encontrado",
      dataBackup: new Date().toISOString(),
      versao: "1.0",
    },
    dados: {
      cliente: client,
      usuarios: usuarios,
      grupos: grupos,
      equipes: equipes,
      jogos: jogos,
    },
    estatisticas: {
      totalUsuarios: usuarios.length,
      totalGrupos: grupos.length,
      totalEquipes: equipes.length,
      totalJogos: jogos.length,
    },
  };
}

// FUNÇÃO: Backup completo do banco
async function gerarBackupCompleto() {
  const [clients, usuarios, grupos, equipes, jogos] = await Promise.all([
    // Todos os clientes
    prisma.client.findMany(),

    // Todos os usuários
    prisma.user.findMany({
      include: {
        client: { select: { name: true } },
      },
    }),

    // Todos os grupos
    prisma.grupo.findMany({
      include: {
        client: { select: { name: true } },
      },
    }),

    // Todas as equipes
    prisma.equipe.findMany({
      include: {
        client: { select: { name: true } },
        grupo: { select: { nome: true } },
      },
    }),

    // Todos os jogos
    prisma.jogo.findMany({
      include: {
        grupo: {
          select: {
            nome: true,
            client: { select: { name: true } },
          },
        },
        equipeA: { select: { nome: true } },
        equipeB: { select: { nome: true } },
      },
    }),
  ]);

  return {
    metadados: {
      tipoBackup: "banco_completo",
      dataBackup: new Date().toISOString(),
      versao: "1.0",
    },
    dados: {
      clientes: clients,
      usuarios: usuarios,
      grupos: grupos,
      equipes: equipes,
      jogos: jogos,
    },
    estatisticas: {
      totalClientes: clients.length,
      totalUsuarios: usuarios.length,
      totalGrupos: grupos.length,
      totalEquipes: equipes.length,
      totalJogos: jogos.length,
    },
  };
}
