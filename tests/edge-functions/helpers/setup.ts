import { config } from 'dotenv';
config({ path: '.env.test' });

if (!process.env.SUPABASE_URL) {
  throw new Error(
    'tests/edge-functions/helpers/setup.ts: SUPABASE_URL não definido. ' +
      'Copie .env.test do template ou rode `supabase status` para pegar valores.'
  );
}
