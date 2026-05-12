import { AppError } from './errors.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonOk<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export function jsonErr(err: unknown): Response {
  if (err instanceof AppError) {
    return new Response(
      JSON.stringify({ erro: err.message, codigo: err.code, ...(err.detalhes ?? {}) }),
      {
        status: err.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
  console.error('[unhandled]', err);
  const msg = err instanceof Error ? err.message : 'Erro desconhecido';
  return new Response(
    JSON.stringify({ erro: 'Erro interno', codigo: 'INTERNAL', detalhe: msg }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    }
  );
}

export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  return null;
}
