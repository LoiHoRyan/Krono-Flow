export async function safeJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    const data = (await req.json()) as T;
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}
