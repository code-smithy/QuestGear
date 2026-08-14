import { normalizeSupabaseUrl } from "@/lib/env";

describe("normalizeSupabaseUrl", () => {
  it("keeps the Supabase project root URL", () => {
    expect(normalizeSupabaseUrl("https://project-ref.supabase.co")).toBe(
      "https://project-ref.supabase.co"
    );
  });

  it("strips a copied REST endpoint suffix", () => {
    expect(normalizeSupabaseUrl("https://project-ref.supabase.co/rest/v1")).toBe(
      "https://project-ref.supabase.co"
    );
  });
});
