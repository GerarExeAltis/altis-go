const BASE = process.env.FUNCTIONS_URL!;

export interface FnResponse<T> {
  ok: boolean;
  status: number;
  body: T;
}

export async function callFn<T = unknown>(
  name: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<FnResponse<T>> {
  const res = await fetch(`${BASE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { ok: res.ok, status: res.status, body: parsed as T };
}
