// Imports compartilhados — versionar aqui é mais fácil que em cada handler.
export { createClient } from 'npm:@supabase/supabase-js@2.45.0';
export type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.0';

export { SignJWT, jwtVerify, createRemoteJWKSet, errors as joseErrors } from 'npm:jose@5.9.0';
export type { JWTPayload } from 'npm:jose@5.9.0';

export { z } from 'npm:zod@3.23.0';
