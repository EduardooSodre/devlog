/**
 * POST /api/upload
 * Recebe um arquivo via FormData, faz upload para o Cloudinary
 * usando as credenciais do servidor (sem precisar de preset público).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey    = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary não configurado" }, { status: 500 });
    }

    // Lê o arquivo enviado pelo frontend
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    // Monta o FormData para o Cloudinary com autenticação via API key + timestamp
    const timestamp = Math.round(Date.now() / 1000).toString();
    const folder = "devlog";

    // A string a assinar deve conter TODOS os parâmetros em ordem alfabética,
    // seguidos do API Secret (sem separador).
    // Parâmetros: folder, timestamp (em ordem alfabética: f < t)
    const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = await sha1(strToSign);

    const cloudFormData = new FormData();
    cloudFormData.append("file", file);
    cloudFormData.append("api_key", apiKey);
    cloudFormData.append("timestamp", timestamp);
    cloudFormData.append("signature", signature);
    cloudFormData.append("folder", folder);

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: cloudFormData }
    );

    const data = await cloudRes.json();

    if (!cloudRes.ok) {
      console.error("[POST /api/upload] Cloudinary error:", data);
      return NextResponse.json(
        { error: data.error?.message ?? "Erro no Cloudinary" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
      originalFilename: data.original_filename,
    });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/** SHA-1 usando Web Crypto API (disponível no Node.js 18+) */
async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
