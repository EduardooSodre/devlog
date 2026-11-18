/**
 * Chamada às rotas /api do lado do cliente. As rotas devolvem `{ error: "..." }` quando
 * falham — antes cada componente fazia `if (!res.ok) throw new Error()` e mostrava um
 * toast genérico, jogando fora a mensagem útil ("Limite do plano atingido" etc.).
 *
 *   const { data } = await api<{ data: Card }>("/api/kanban/cards", { method: "POST", json: body });
 *   ...catch (err) { toast.error(errorMessage(err, "Erro ao criar card")); }
 */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type ApiInit = Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit };

export async function api<T = unknown>(url: string, init: ApiInit = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
    body: json !== undefined ? JSON.stringify(json) : init.body,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof payload?.error === "string" ? payload.error : "";
    throw new ApiError(msg, res.status);
  }
  return payload as T;
}

/** Mensagem pro toast: a do servidor se houver, senão o fallback. Erro de rede vira aviso claro. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof TypeError) return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
  return fallback;
}
