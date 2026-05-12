// Erros tipados que viram HTTP responses na borda.

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly detalhes?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errBadRequest = (msg: string, det?: Record<string, unknown>) =>
  new AppError(400, 'BAD_REQUEST', msg, det);

export const errUnauthorized = (msg = 'Não autorizado') =>
  new AppError(401, 'UNAUTHORIZED', msg);

export const errForbidden = (msg = 'Acesso negado') =>
  new AppError(403, 'FORBIDDEN', msg);

export const errNotFound = (msg = 'Não encontrado') =>
  new AppError(404, 'NOT_FOUND', msg);

export const errConflict = (msg: string, det?: Record<string, unknown>) =>
  new AppError(409, 'CONFLICT', msg, det);

export const errTooManyRequests = (msg = 'Muitas tentativas') =>
  new AppError(429, 'TOO_MANY_REQUESTS', msg);

export const errInternal = (msg = 'Erro interno') =>
  new AppError(500, 'INTERNAL', msg);
