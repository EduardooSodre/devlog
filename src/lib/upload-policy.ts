/**
 * Regra de upload: bloqueia conteúdo ativo e limita tamanho.
 * Os links do Cloudinary são públicos, então não deixamos virar hospedagem de phishing/malware.
 */
const BLOCKED_EXTENSIONS = new Set([
  "html", "htm", "xhtml", "shtml", "mht", "mhtml", "svg", "svgz", "xml", "xsl",
  "js", "mjs", "cjs", "php", "phtml", "asp", "aspx", "jsp",
  "exe", "msi", "msix", "dll", "com", "scr", "pif", "cpl", "bat", "cmd", "ps1",
  "psm1", "vbs", "vbe", "wsf", "wsh", "hta", "jar", "sh", "bash", "app", "dmg",
  "apk", "lnk", "reg", "swf",
]);
const BLOCKED_MIME = /^(text\/html|application\/xhtml|image\/svg|text\/javascript|application\/(x-)?javascript|application\/x-(msdownload|msdos-program|sh)|application\/x-ms-installer)/i;

const MAX_BYTES = 10 * 1024 * 1024;        // limite do Cloudinary free para imagem/raw
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

/** Retorna a mensagem de erro se o arquivo não pode ser enviado, ou null. */
export function checkUpload(name: string, mime: string, size: number): string | null {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (BLOCKED_EXTENSIONS.has(ext) || BLOCKED_MIME.test(mime)) {
    return `Arquivos .${ext || "desconhecido"} não são permitidos por segurança`;
  }
  const isMedia = mime.startsWith("video/") || mime.startsWith("audio/");
  const max = isMedia ? MAX_VIDEO_BYTES : MAX_BYTES;
  if (size > max) {
    return `Arquivo muito grande (máximo ${max / 1024 / 1024} MB)`;
  }
  return null;
}
