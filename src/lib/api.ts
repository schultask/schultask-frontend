const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "message" in body) {
      const message = (body as { message: unknown }).message;
      if (Array.isArray(message)) return message.join(", ");
      if (typeof message === "string") return message;
    }
  } catch {
    // response wasn't JSON — fall through to statusText
  }
  return res.statusText || "Request failed";
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
  return res.json() as Promise<T>;
}

// Multipart upload — apiRequest always JSON-encodes its body, which can't
// carry a File. No Content-Type header here on purpose: the browser sets
// the multipart boundary itself when the body is a FormData.
export async function apiUpload<T>(path: string, file: File, token?: string | null): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
  return res.json() as Promise<T>;
}

// Fetches a protected binary response (an uploaded lesson image/video) as a
// Blob so it can be handed to URL.createObjectURL — the endpoint requires a
// bearer token, which a plain <img>/<video> src can't attach on its own.
export async function apiFetchBlob(path: string, token?: string | null): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
  return res.blob();
}
