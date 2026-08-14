import { z } from "zod";

const publicEnvSchema = z.object({
  supabaseUrl: z.string().url().optional(),
  supabasePublishableKey: z.string().min(1).optional(),
  siteUrl: z.string().url(),
  basePath: z.string().startsWith("/")
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function hasSupabaseConfig(env: PublicEnv): env is PublicEnv & {
  supabaseUrl: string;
  supabasePublishableKey: string;
} {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

function optionalEnv(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    supabaseUrl: optionalEnv(import.meta.env.VITE_SUPABASE_URL),
    supabasePublishableKey:
      optionalEnv(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ??
      optionalEnv(import.meta.env.VITE_SUPABASE_ANON_KEY),
    siteUrl: optionalEnv(import.meta.env.VITE_SITE_URL) ?? window.location.origin + "/",
    basePath: optionalEnv(import.meta.env.VITE_BASE_PATH) ?? "/"
  });
}
