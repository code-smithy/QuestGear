import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

const env = getPublicEnv();

export const supabase = createClient(
  env.supabaseUrl ?? "https://example.supabase.co",
  env.supabasePublishableKey ?? "phase-0-placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
