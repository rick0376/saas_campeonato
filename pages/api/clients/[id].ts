import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
import formidable, { File } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import fs from "fs";

/* -------------------------------------------------------------------------- */
/*  CONFIGURAÇÃO CLOUDINARY                                                   */
/* -------------------------------------------------------------------------- */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* -------------------------------------------------------------------------- */
/*  TIPOS AUXILIARES                                                          */
/* -------------------------------------------------------------------------- */

interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
  permissoes?: any;
  clientId?: string | null;
}

interface ExtendedSession {
  user: ExtendedUser;
  expires: string;
}

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/* -------------------------------------------------------------------------- */
/*  FUNÇÃO PARA LER JSON QUANDO BODYPARSER ESTÁ DESABILITADO                 */
/* -------------------------------------------------------------------------- */

const parseJsonBody = async (req: NextApiRequest): Promise<any> => {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
};

/* -------------------------------------------------------------------------- */
/*  FUNÇÕES AUXILIARES - CLOUDINARY CORRIGIDAS                               */
/* -------------------------------------------------------------------------- */

const uploadToCloudinary = async (
  file: File,
  clientSlug: string
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `lhpsystems/clientes/${clientSlug}`,
        resource_type: "image",
        public_id: `logo_${Date.now()}`,
        transformation: [
          { width: 400, height: 400, crop: "limit" },
          { quality: "auto" },
          { format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result as CloudinaryUploadResult);
        }
      }
    );

    try {
      if (file.filepath) {
        const stream = fs.createReadStream(file.filepath);
        stream.pipe(uploadStream);
      } else {
        const buffer = fs.readFileSync(file.filepath || "");
        const bufferStream = new Readable();
        bufferStream.push(buffer);
        bufferStream.push(null);
        bufferStream.pipe(uploadStream);
      }
    } catch (error) {
      reject(error);
    }
  });
};

const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  if (!publicId) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok" || result.result === "not found") {
      const folderPath = publicId.split("/").slice(0, -1).join("/");

      if (folderPath) {
        try {
          await cloudinary.api.delete_folder(folderPath);
        } catch (folderError) {
          // Pasta não vazia ou não existe
        }
      }

      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

/* -------------------------------------------------------------------------- */
/*  CONFIGURAÇÃO DO END-POINT                                                 */
/* -------------------------------------------------------------------------- */

export const config = {
  api: { bodyParser: false },
};

/* -------------------------------------------------------------------------- */
/*  HANDLER PRINCIPAL                                                         */
/* -------------------------------------------------------------------------- */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (await getServerSession(
    req,
    res,
    authOptions
  )) as ExtendedSession | null;

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "ID do cliente é obrigatório" });
  }

  /* ------------------------------- PÚBLICO -------------------------------- */
  if (req.method === "GET" && req.query.public === "true") {
    return getClientPublic(res, id);
  }

  /* --------------------------- AUTENTICAÇÃO -------------------------------- */
  if (!session) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  /* --------------------------- AUTORIZAÇÃO --------------------------------- */
  const isSuperAdmin =
    session.user.role === "admin" &&
    (session.user.clientId === null ||
      session.user.clientId === undefined ||
      session.user.clientId === "undefined" ||
      session.user.clientId === "null");

  if (!isSuperAdmin) {
    return res.status(401).json({
      message: "Acesso negado. Apenas Super Admin pode gerenciar clientes.",
    });
  }

  /* --------------------------- ROTAS PRIVADAS ----------------------------- */
  switch (req.method) {
    case "GET":
      return getClient(res, id);
    case "PUT":
      return updateClient(req, res, id);
    case "DELETE":
      return deleteClient(req, res, id);
    default:
      return res.status(405).json({ message: "Method not allowed" });
  }
}

/* ========================================================================== */
/*  GET (PÚBLICO)                                                             */
/* ========================================================================== */
async function getClientPublic(res: NextApiResponse, id: string) {
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        description: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!client)
      return res.status(404).json({ message: "Cliente não encontrado" });

    const expired = client.expiresAt ? new Date() > client.expiresAt : false;

    if (client.status !== "ACTIVE")
      return res.status(403).json({ message: "Cliente inativo" });

    if (expired) return res.status(403).json({ message: "Cliente expirado" });

    return res.status(200).json(client);
  } catch (err) {
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}

/* ========================================================================== */
/*  GET (PRIVADO)                                                             */
/* ========================================================================== */
async function getClient(res: NextApiResponse, id: string) {
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: "admin" },
          select: { id: true, role: true },
          take: 1,
        },
        _count: {
          select: {
            users: true,
            grupos: true,
            equipes: true,
            jogos: true,
            jogadores: true,
          },
        },
      },
    });

    if (!client)
      return res.status(404).json({ message: "Cliente não encontrado" });

    const adminUser = client.users.length > 0 ? client.users[0] : null;

    const role = adminUser ? adminUser.role : "user";
    const adminUserId = adminUser ? adminUser.id : null;

    const isExpired = client.expiresAt ? new Date() > client.expiresAt : false;
    const daysUntilExpiration = client.expiresAt
      ? Math.ceil((client.expiresAt.getTime() - Date.now()) / 86400000)
      : null;

    return res.status(200).json({
      ...client,
      role,
      adminUserId,
      isExpired,
      daysUntilExpiration,
      features: client.features ? JSON.parse(client.features) : {},
      usage: {
        users: client._count.users,
        grupos: client._count.grupos,
        equipes: client._count.equipes,
        jogos: client._count.jogos,
        jogadores: client._count.jogadores,
        usersPercentage: client.maxUsers
          ? (client._count.users / client.maxUsers) * 100
          : 0,
        teamsPercentage: client.maxTeams
          ? (client._count.equipes / client.maxTeams) * 100
          : 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}

/* ========================================================================== */
/*  PUT – UPDATE                                                              */
/* ========================================================================== */
async function updateClient(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    const ct = req.headers["content-type"] ?? "";
    const isMultipart = ct.includes("multipart/form-data");

    const currentClient = await prisma.client.findUnique({
      where: { id },
      select: { id: true, logoPublicId: true, logo: true, slug: true },
    });

    if (!currentClient)
      return res.status(404).json({ message: "Cliente não encontrado" });

    let data: any = {};
    let logoFile: File | null = null;
    let removeLogo = false;

    if (isMultipart) {
      const form = formidable({
        maxFileSize: 5 * 1024 * 1024,
        filter: ({ mimetype }) => mimetype?.startsWith("image/") || false,
      });

      const [fields, files] = await form.parse(req);

      const f = (k: string) =>
        Array.isArray(fields[k]) ? fields[k][0] : (fields[k] as string);

      data = {
        name: f("name")?.trim(),
        slug: f("slug")?.toLowerCase().trim(),
        description: f("description")?.trim() || null,
        domain: f("domain")?.trim() || null,
        status: f("status"),
        maxUsers: f("maxUsers") ? parseInt(f("maxUsers")) : null,
        maxTeams: f("maxTeams") ? parseInt(f("maxTeams")) : null,
      };

      if (files.logo?.[0] && files.logo[0].size > 0) {
        logoFile = files.logo[0];
      }

      removeLogo = f("removeLogo") === "true";

      const validDays = f("validDays");
      if (validDays !== undefined) {
        const days = Number(validDays);
        data.validDays = days;
        data.expiresAt =
          days > 0 ? new Date(Date.now() + days * 86_400_000) : null;
      }
    } else {
      try {
        const jsonBody = await parseJsonBody(req);

        const {
          name,
          slug,
          logo,
          logoPublicId,
          description,
          domain,
          status,
          validDays,
          maxUsers,
          maxTeams,
          features,
          extendDays,
          removeLogo: removeLogoJson,
        } = jsonBody;

        data = {
          name: name?.trim(),
          slug: slug?.toLowerCase().trim(),
          description: description?.trim() || null,
          domain: domain?.trim() || null,
          status,
          maxUsers: maxUsers ?? null,
          maxTeams: maxTeams ?? null,
          features: features ? JSON.stringify(features) : null,
        };

        removeLogo = removeLogoJson === true;

        if (logo !== undefined && !removeLogo) {
          data.logo = logo;
          data.logoPublicId = logoPublicId || null;
        }

        if (validDays !== undefined) {
          data.validDays = validDays;
          data.expiresAt =
            validDays && validDays > 0
              ? new Date(Date.now() + validDays * 86_400_000)
              : null;
        }

        if (extendDays && extendDays > 0) {
          const existingClient = await prisma.client.findUnique({
            where: { id },
            select: { expiresAt: true },
          });

          const baseDate = existingClient?.expiresAt || new Date();
          const newExpiresAt = new Date(
            baseDate.getTime() + extendDays * 86_400_000
          );
          data.expiresAt = newExpiresAt;
          data.validDays = Math.ceil(
            (newExpiresAt.getTime() - Date.now()) / 86_400_000
          );
        }
      } catch (error) {
        return res.status(400).json({
          message: "Erro ao processar dados JSON",
        });
      }
    }

    if (!data.name || !data.slug) {
      return res.status(400).json({ message: "Nome e slug são obrigatórios" });
    }

    const slugInUse = await prisma.client.findFirst({
      where: { slug: data.slug, id: { not: id } },
      select: { id: true },
    });
    if (slugInUse)
      return res.status(400).json({ message: "Slug já está em uso" });

    if (removeLogo) {
      if (currentClient.logoPublicId) {
        await deleteFromCloudinary(currentClient.logoPublicId);
      }
      data.logo = null;
      data.logoPublicId = null;
    }

    if (logoFile) {
      try {
        const uploadResult = await uploadToCloudinary(
          logoFile,
          currentClient.slug
        );

        if (currentClient.logoPublicId) {
          await deleteFromCloudinary(currentClient.logoPublicId);
        }

        data.logo = uploadResult.secure_url;
        data.logoPublicId = uploadResult.public_id;
      } catch (error) {
        return res.status(500).json({
          message: "Erro ao fazer upload da imagem",
        });
      }
    }

    const updated = await prisma.client.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            users: true,
            grupos: true,
            equipes: true,
            jogos: true,
            jogadores: true,
          },
        },
      },
    });

    const isExpired = updated.expiresAt
      ? new Date() > updated.expiresAt
      : false;
    const daysUntilExpiration = updated.expiresAt
      ? Math.ceil((updated.expiresAt.getTime() - Date.now()) / 86_400_000)
      : null;

    return res.status(200).json({
      ...updated,
      isExpired,
      daysUntilExpiration,
      features: updated.features ? JSON.parse(updated.features) : {},
      usage: {
        users: updated._count.users,
        grupos: updated._count.grupos,
        equipes: updated._count.equipes,
        jogos: updated._count.jogos,
        jogadores: updated._count.jogadores,
        usersPercentage: updated.maxUsers
          ? (updated._count.users / updated.maxUsers) * 100
          : 0,
        teamsPercentage: updated.maxTeams
          ? (updated._count.equipes / updated.maxTeams) * 100
          : 0,
      },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(400).json({ message: "Slug ou domínio já existe." });
    }
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}

/* ========================================================================== */
/*  DELETE                                                                    */
/* ========================================================================== */
async function deleteClient(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    const requestBody = await parseJsonBody(req);

    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        logoPublicId: true,
        name: true,
        _count: {
          select: {
            users: true,
            grupos: true,
            equipes: true,
            jogos: true,
            jogadores: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }

    const related =
      client._count.grupos +
      client._count.equipes +
      client._count.jogos +
      client._count.jogadores;

    const hasMultipleUsers = client._count.users > 1;

    if (related > 0 || hasMultipleUsers) {
      const { forceDelete } = requestBody;

      if (!forceDelete) {
        return res.status(400).json({
          message: "Cliente possui dados relacionados e não pode ser excluído.",
          data: {
            users: hasMultipleUsers ? client._count.users : 0,
            grupos: client._count.grupos,
            equipes: client._count.equipes,
            jogos: client._count.jogos,
            jogadores: client._count.jogadores,
          },
          requiresConfirmation: true,
        });
      }
    }

    if (client.logoPublicId) {
      await deleteFromCloudinary(client.logoPublicId);
    }

    await prisma.client.delete({ where: { id } });

    return res.status(200).json({
      message: "Cliente excluído com sucesso",
      clientName: client.name,
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}
