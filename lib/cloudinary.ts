import { v2 as cloudinary } from "cloudinary";

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
}

// Upload de imagem
export const uploadToCloudinary = async (
  file: any,
  folder: string = "clients"
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
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

    uploadStream.end(file.buffer);
  });
};

// Excluir imagem
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Imagem excluída do Cloudinary: ${publicId}`);
  } catch (error) {
    console.error(
      `❌ Erro ao excluir imagem do Cloudinary: ${publicId}`,
      error
    );
  }
};

export default cloudinary;
