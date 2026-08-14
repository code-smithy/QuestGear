import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";

const supabaseState = vi.hoisted(
  (): {
    session: unknown;
    profileRow: unknown;
    signInWithOAuth: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  } => ({
  session: null,
  profileRow: null,
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn()
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: supabaseState.session } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: supabaseState.unsubscribe } }
      })),
      signInWithOAuth: supabaseState.signInWithOAuth,
      signOut: supabaseState.signOut
    },
    from: vi.fn(() => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(() => Promise.resolve({ data: supabaseState.profileRow, error: null }))
      };

      return query;
    })
  }
}));

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = "";
    supabaseState.session = null;
    supabaseState.profileRow = null;
    supabaseState.signInWithOAuth.mockClear();
    supabaseState.signOut.mockClear();
    supabaseState.unsubscribe.mockClear();
  });

  it("shows the login page when no session is restored", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "QuestGear" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mit Discord fortfahren" })).toBeDisabled();
    expect(
      screen.getByText(/Supabase ist fuer diese Bereitstellung noch nicht konfiguriert/)
    ).toBeInTheDocument();
  });

  it("renders the protected app shell after restoring a profiled session", async () => {
    supabaseState.session = {
      access_token: "token",
      refresh_token: "refresh",
      expires_in: 3600,
      token_type: "bearer",
      user: { id: "user-1", user_metadata: {} }
    };
    supabaseState.profileRow = {
      id: "user-1",
      display_name: "Mara",
      avatar_url: null,
      bio: null,
      country_code: "CH",
      public_region: "Zurich",
      time_zone: "Europe/Zurich",
      reminder_lead_days: 2,
      browser_push_enabled: false,
      account_status: "active",
      preferred_locale: "de",
      created_at: "2026-08-14T00:00:00Z",
      updated_at: "2026-08-14T00:00:00Z"
    };

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Startseite" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Hauptnavigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Einstellungen" })).toBeInTheDocument();
  });
});
