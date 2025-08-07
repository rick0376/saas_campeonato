import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
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
/*  FUNÇÕES AUXILIARES - CLOUDINARY ORGANIZADAS                              */
/* -------------------------------------------------------------------------- */

// ✅ Upload organizado para jogadores (igual equipes)
const uploadToCloudinary = async (
  file: File,
  clientId: string
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `lhpsystems/jogadores/${clientId}`,
        resource_type: "image",
        public_id: `foto_${Date.now()}`,
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

// ✅ Delete organizado (igual equipes - com pasta)
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
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return res.status(401).json({ error: "Token não encontrado" });
    }

    if (!token.role || (token.role !== "admin" && token.role !== "user")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { id } = req.query;
    const jogadorId = Number(id);

    switch (req.method) {
      case "GET":
        return getJogador(res, jogadorId, token);
      case "PUT":
      case "PATCH":
        return updateJogador(req, res, jogadorId, token);
      case "DELETE":
        return deleteJogador(res, jogadorId, token);
      default:
        return res.status(405).json({ error: "Método não permitido" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

/* ========================================================================== */
/*  GET - BUSCAR JOGADOR                                                      */
/* ========================================================================== */
async function getJogador(res: NextApiResponse, jogadorId: number, token: any) {
  try {
    // ✅ CORREÇÃO: Filtro direto por clientId (não via equipe)
    const jogador = await prisma.jogador.findFirst({
      where: {
        id: jogadorId,
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
      include: {
        equipe: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
          },
        },
      },
    });

    if (!jogador) {
      return res.status(404).json({ error: "Jogador não encontrado" });
    }

    return res.status(200).json(jogador);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar o jogador" });
  }
}

/* ========================================================================== */
/*  PUT/PATCH - ATUALIZAR JOGADOR                                            */
/* ========================================================================== */
async function updateJogador(
  req: NextApiRequest,
  res: NextApiResponse,
  jogadorId: number,
  token: any
) {
  try {
    const ct = req.headers["content-type"] ?? "";
    const isMultipart = ct.includes("multipart/form-data");

    // ✅ CORREÇÃO: Verificar se jogador existe por clientId direto
    const currentJogador = await prisma.jogador.findFirst({
      where: {
        id: jogadorId,
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
      select: { id: true, public_id: true, fotoUrl: true, clientId: true },
    });

    if (!currentJogador) {
      return res.status(404).json({ error: "Jogador não encontrado" });
    }

    let data: any = {};
    let fotoFile: File | null = null;
    let removeFoto = false;

    if (isMultipart) {
      const form = formidable({
        maxFileSize: 5 * 1024 * 1024,
        filter: ({ mimetype }) => mimetype?.startsWith("image/") || false,
      });

      const [fields, files] = await form.parse(req);

      const f = (k: string) =>
        Array.isArray(fields[k]) ? fields[k][0] : (fields[k] as string);

      data = {
        nome: f("nome")?.trim(),
        posicao: f("posicao")?.trim(),
        numeroCamisa: f("numeroCamisa") ? parseInt(f("numeroCamisa")) : null,
        idade: f("idade") ? parseInt(f("idade")) : null,
        altura: f("altura") ? parseFloat(f("altura")) : null,
        peso: f("peso") ? parseFloat(f("peso")) : null,
        equipeId: f("equipeId") ? parseInt(f("equipeId")) : null,
        ativo: f("ativo") !== "false",
      };

      if (files.foto?.[0] && files.foto[0].size > 0) {
        fotoFile = files.foto[0];
      }

      removeFoto = f("removeFoto") === "true";
    } else {
      try {
        const jsonBody = await parseJsonBody(req);

        const {
          nome,
          posicao,
          numeroCamisa,
          idade,
          altura,
          peso,
          equipeId,
          ativo,
          fotoUrl,
          public_id,
          oldPublicId,
          removeFoto: removeFotoJson,
        } = jsonBody;

        data = {
          nome: nome?.trim(),
          posicao: posicao?.trim(),
          numero: numeroCamisa ?? null,
          idade: idade ?? null,
          altura: altura ?? null,
          peso: peso ?? null,
          equipeId: equipeId ?? null,
          ativo: ativo !== false,
        };

        removeFoto = removeFotoJson === true;

        // Se há nova imagem e existe uma imagem antiga, delete a antiga
        if (public_id && oldPublicId && public_id !== oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId);
          } catch (error) {
            console.error("Erro ao deletar foto antiga:", error);
          }
        }

        if (fotoUrl !== undefined && !removeFoto) {
          data.fotoUrl = fotoUrl;
          data.public_id = public_id || null;
        }
      } catch (error) {
        return res.status(400).json({
          error: "Erro ao processar dados JSON",
        });
      }
    }

    if (!data.nome) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    // ✅ CORREÇÃO: Verificar equipe por clientId se fornecida
    if (data.equipeId) {
      const equipeExiste = await prisma.equipe.findFirst({
        where: {
          id: data.equipeId,
          ...(token.clientId &&
          token.clientId !== "undefined" &&
          token.clientId !== "null"
            ? { clientId: token.clientId as string }
            : {}),
        },
      });

      if (!equipeExiste) {
        return res.status(400).json({ error: "Equipe não encontrada" });
      }
    }

    // Caso 1: Remover foto existente
    if (removeFoto) {
      if (currentJogador.public_id) {
        await deleteFromCloudinary(currentJogador.public_id);
      }
      data.fotoUrl = null;
      data.public_id = null;
    }

    // Caso 2: Upload de nova foto
    if (fotoFile) {
      try {
        const uploadResult = await uploadToCloudinary(
          fotoFile,
          currentJogador.clientId
        );

        if (currentJogador.public_id) {
          await deleteFromCloudinary(currentJogador.public_id);
        }

        data.fotoUrl = uploadResult.secure_url;
        data.public_id = uploadResult.public_id;
      } catch (error) {
        return res.status(500).json({
          error: "Erro ao fazer upload da foto",
        });
      }
    }

    const updatedJogador = await prisma.jogador.update({
      where: { id: jogadorId },
      data,
      include: {
        equipe: {
          select: {
            id: true,
            nome: true,
            escudoUrl: true,
          },
        },
      },
    });

    return res.status(200).json(updatedJogador);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao atualizar o jogador",
    });
  }
}

/* ========================================================================== */
/*  DELETE - EXCLUIR JOGADOR                                                 */
/* ========================================================================== */
async function deleteJogador(
  res: NextApiResponse,
  jogadorId: number,
  token: any
) {
  try {
    // ✅ CORREÇÃO: Verificar por clientId direto
    const jogador = await prisma.jogador.findFirst({
      where: {
        id: jogadorId,
        ...(token.clientId &&
        token.clientId !== "undefined" &&
        token.clientId !== "null"
          ? { clientId: token.clientId as string }
          : {}),
      },
      select: {
        id: true,
        nome: true,
        public_id: true,
      },
    });

    if (!jogador) {
      return res.status(404).json({ error: "Jogador não encontrado" });
    }

    // Usar transação para garantir consistência (igual equipes)
    await prisma.$transaction(async (tx) => {
      // 1. Excluir eventos do jogador (se existirem)
      try {
        await tx.eventoJogo.deleteMany({
          where: { jogadorId: jogadorId },
        });
      } catch (e) {
        // Tabela pode não existir
      }

      // 2. Excluir jogador
      await tx.jogador.delete({
        where: { id: jogadorId },
      });
    });

    // 3. Excluir foto + pasta do Cloudinary (fora da transação)
    if (jogador.public_id) {
      await deleteFromCloudinary(jogador.public_id);
    }

    return res.status(200).json({
      message: "Jogador excluído com sucesso",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao excluir o jogador",
    });
  }
}
