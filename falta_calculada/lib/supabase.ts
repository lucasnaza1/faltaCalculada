/** Cliente Supabase (browser) — singleton.
 * A segurança é 100% via RLS; aqui só usamos a anon key.
 * Se as env vars não estiverem configuradas, retorna null e o app
 * segue funcionando 100% local (sem sync). */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    client = createBrowserClient(url, key);
  }
  return client;
}
