/**
 * Faz upload de um arquivo para o Cloudinary via nossa API backend.
 * Usa autenticação server-side — sem preset público necessário.
 */
export async function uploadToCloudinary(file: File): Promise<{
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  originalFilename?: string;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? "Erro no upload");
  }

  return data;
}
