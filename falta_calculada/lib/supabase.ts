/** Cliente Supabase (browser) — singleton.
 *
 * Credenciais PUBLIC (anon key + URL): seguras para embutir no bundle —
 * todo acesso é filtrado por RLS no banco; sem service_role aqui.
 *
 * Ordem de resolução:
 * 1. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (env)
 * 2. Fallback embutido abaixo — garante que o app nunca "perca" o sync
 *    por servidor iniciado sem env vars (variação de máquina/CI).
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://ezczzqiibkltmvjypjgq.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6Y3p6cWlpYmtsdG12anlwamdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjI0NjYsImV4cCI6MjEwODE5ODQ2Nn0.pvA03ZUk1gmAG0n7o1cO7VA_w48SEV6vX8hwzT5lM_c";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}
