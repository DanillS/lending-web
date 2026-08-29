const SERVER = process.env.INTERNAL_API_URL || "http://localhost:8000";

type FetchOpts = RequestInit & { next?: { revalidate?: number | false }; cache?: RequestCache };

export type ApiError = Error & { status: number };

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") {
    return `${SERVER}${normalized}`;
  }
  return normalized;
}

export async function apiGet<T>(path: string, init?: FetchOpts): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res));
  }
  return res.json() as Promise<T>;
}

export async function apiSend<T>(path: string, method: string, body?: unknown): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: "include",
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  };
  if (!(body instanceof FormData)) {
    init.headers = { "Content-Type": "application/json" };
  }
  const res = await fetch(apiUrl(path), init);
  if (!res.ok) {
    const message = await errorMessage(res);
    const err = new Error(message) as ApiError;
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map((d: { msg?: string }) => d.msg).join(", ");
    if (data.detail?.message) return data.detail.message;
    return res.statusText;
  } catch {
    return res.statusText;
  }
}
