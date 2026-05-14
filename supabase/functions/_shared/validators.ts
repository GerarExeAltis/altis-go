import { z } from './deps.ts';
import { errBadRequest } from './errors.ts';

// DDDs validos no Brasil (lista oficial Anatel).
const DDDS_VALIDOS = new Set([
  '11','12','13','14','15','16','17','18','19',
  '21','22','24',
  '27','28',
  '31','32','33','34','35','37','38',
  '41','42','43','44','45','46',
  '47','48','49',
  '51','53','54','55',
  '61',
  '62','64',
  '63',
  '65','66',
  '67',
  '68',
  '69',
  '71','73','74','75','77',
  '79',
  '81','87',
  '82',
  '83',
  '84',
  '85','88',
  '86','89',
  '91','93','94',
  '92','97',
  '95',
  '96',
  '98','99',
]);

/**
 * Telefone brasileiro: 11 dígitos, começa com 9 após DDD, DDD válido.
 */
export const telefoneSchema = z
  .string()
  .regex(/^\d{11}$/, 'telefone precisa de 11 dígitos')
  .refine((v) => DDDS_VALIDOS.has(v.slice(0, 2)), { message: 'DDD inválido' })
  .refine((v) => v[2] === '9', { message: 'celular precisa começar com 9 após DDD' });

export const emailSchema = z.string().min(3).max(120).email('email inválido');

export const nomeSchema = z
  .string()
  .trim()
  .min(3, 'nome precisa de ao menos 3 letras')
  .max(80)
  .regex(/^[^\x00-\x1f<>]+$/, 'nome contém caracteres inválidos');

export const uuidSchema = z.string().uuid('uuid inválido');

export const fingerprintSchema = z
  .string()
  .regex(/^[a-f0-9]{16,128}$/i, 'fingerprint inválido (esperado hex 16-128)');

export const dadosJogadorSchema = z.object({
  nome: nomeSchema,
  telefone: telefoneSchema,
  email: emailSchema,
  empresa: z.string().trim().max(120).nullable().optional(),
});

export type DadosJogadorValidado = z.infer<typeof dadosJogadorSchema>;

/** Valida payload genérico ou lança errBadRequest com detalhes do zod. */
export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw errBadRequest('Payload inválido', {
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }
  return result.data;
}
