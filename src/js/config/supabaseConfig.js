/* =========================================================
   SUPABASE CONFIG
   ---------------------------------------------------------
   O Boby só ativa Supabase quando as chaves existirem.

   Com Vite:
   - use .env baseado no .env.example.

   Sem configuração:
   - o app continua em modo local.
   ========================================================= */

const env = import.meta.env || {};
const runtimeConfig = globalThis.__BOBY_CONFIG__ || {};

export const SUPABASE_URL =
  env.VITE_SUPABASE_URL
  || runtimeConfig.supabaseUrl
  || "";
export const SUPABASE_ANON_KEY =
  env.VITE_SUPABASE_ANON_KEY
  || runtimeConfig.supabaseAnonKey
  || "";

export const IS_SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
