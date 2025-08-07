// utils/cloudinary-upload.ts

interface UploadOptions {
  file: File;
  type: "clientes" | "equipes" | "jogadores";
  clientId?: string;
  itemId?: string;
  filename?: string;
}

interface UploadResult {
  url: string;
  publicId: string;
  folder: string;
}

interface UploadUpdateResult extends UploadResult {
  oldPublicId?: string;
}

export const uploadToCloudinary = async ({
  file,
  type,
  clientId = "sistema",
  itemId,
  filename,
}: UploadOptions): Promise<UploadResult> => {
  // ✅ CORREÇÃO: Construir pasta SEM o itemId
  let folderPath = `lhpsystems/${type}`;

  if (clientId && clientId !== "sistema") {
    folderPath += `/${clientId}`;
  }

  // ❌ REMOVER ESTAS LINHAS:
  // if (itemId) {
  //   folderPath += `/${itemId}`;
  // }

  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "upload_preset",
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
  );
  formData.append("folder", folderPath);

  // ✅ CORREÇÃO: Nome do arquivo simples
  if (filename) {
    const timestamp = Date.now();
    formData.append("public_id", `${filename}_${timestamp}`);
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Erro no upload da imagem");
  }

  const data = await response.json();

  return {
    url: data.secure_url,
    publicId: data.public_id,
    folder: folderPath,
  };
};

// ✅ FUNÇÃO CORRIGIDA: Com tipo correto
export const updateClienteLogo = async (
  file: File,
  clientId: string,
  oldPublicId?: string
): Promise<UploadUpdateResult> => {
  const uploadResult = await uploadToCloudinary({
    file,
    type: "clientes",
    clientId,
    filename: "logo",
  });

  return {
    ...uploadResult,
    oldPublicId,
  };
};

// ✅ FUNÇÕES ESPECÍFICAS CORRIGIDAS
export const uploadClienteLogo = (file: File, clientId: string) => {
  return uploadToCloudinary({
    file,
    type: "clientes",
    clientId,
    filename: "logo",
  });
};

export const uploadEquipeEscudo = (
  file: File,
  clientId: string
  //equipeId?: string
) => {
  return uploadToCloudinary({
    file,
    type: "equipes",
    clientId,
    //itemId: equipeId,
    filename: "escudo",
  });
};

export const uploadJogadorFoto = (
  file: File,
  clientId: string
  //jogadorId?: string
) => {
  return uploadToCloudinary({
    file,
    type: "jogadores",
    clientId,
    //itemId: jogadorId,
    filename: "foto",
  });
};
// ✅ FUNÇÃO PARA ATUALIZAÇÃO DE JOGADOR (que estava faltando)
export const updateJogadorFoto = async (
  file: File,
  clientId: string,
  oldPublicId?: string
): Promise<UploadUpdateResult> => {
  const uploadResult = await uploadToCloudinary({
    file,
    type: "jogadores",
    clientId,
    filename: "foto",
  });

  return {
    ...uploadResult,
    oldPublicId,
  };
};
