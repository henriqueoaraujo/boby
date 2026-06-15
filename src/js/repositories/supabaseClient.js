/* =========================================================
   SUPABASE CLIENT
   ---------------------------------------------------------
   Importação dinâmica para não quebrar o Boby em modo local.
   ========================================================= */

import { IS_SUPABASE_CONFIGURED, SUPABASE_ANON_KEY, SUPABASE_URL } from "../config/supabaseConfig.js";
import { authStorage } from "../core/authStorage.js";

let cachedClient = null;
let loadAttempted = false;

export async function getSupabaseClient() {
  if (!IS_SUPABASE_CONFIGURED) return null;
  if (cachedClient) return cachedClient;
  if (loadAttempted && !cachedClient) return null;

  loadAttempted = true;

  try {
    const { createClient } = await import("@supabase/supabase-js");

    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: authStorage
      }
    });

    return cachedClient;
  } catch (error) {
    console.warn("Supabase configurado, mas o pacote não foi carregado. Rode npm install e npm run dev.", error);
    return null;
  }
}

export async function isSupabaseAvailable() {
  return Boolean(await getSupabaseClient());
}
