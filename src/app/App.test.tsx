import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";

const supabaseState = vi.hoisted(
  (): {
    session: unknown;
    profileRow: unknown;
    publicProfileRow: unknown;
    signInWithOAuth: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  } => ({
  session: null,
  profileRow: null,
  publicProfileRow: null,
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
    from: vi.fn((table: string) => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        maybeSingle: vi.fn(() =>
          Promise.resolve({ data: table === "profiles" ? supabaseState.profileRow : null, error: null })
        )
      };

      return query;
    }),
    rpc: vi.fn(() => ({
      maybeSingle: vi.fn(() => Promise.resolve({ data: supabaseState.publicProfileRow, error: null }))
    }))
  }
}));

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = "";
    supabaseState.session = null;
    supabaseState.profileRow = null;
    supabaseState.publicProfileRow = null;
    supabaseState.signInWithOAuth.mockClear();
    supabaseState.signOut.mockClear();
    supabaseState.unsubscribe.mockClear();
  });

  it("shows the login page when no session is restored", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "QuestGear" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mit Discord fortfahren" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Sprache" })).toBeInTheDocument();
    expect(
      screen.getByText(/Supabase ist für diese Bereitstellung noch nicht konfiguriert/)
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
      preferred_currency: "EUR",
      created_at: "2026-08-14T00:00:00Z",
      updated_at: "2026-08-14T00:00:00Z"
    };

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Startseite" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Hauptnavigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Einstellungen" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Sprache" })).not.toBeInTheDocument();
  });

  it("renders public profiles without a restored session", async () => {
    window.location.hash = "#/users/user-2";
    supabaseState.publicProfileRow = {
      id: "user-2",
      display_name: "Lena",
      avatar_url: null,
      bio: "Miniatures painter",
      public_region: "Basel",
      account_status: "active",
      created_at: "2026-08-14T00:00:00Z",
      locations: [
        {
          id: "location-1",
          public_region: "Basel",
          region_center_lat: 47.5596,
          region_center_lng: 7.5886,
          is_default: true,
          sort_order: 0
        }
      ]
    };

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Lena" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Anmelden" })).toHaveAttribute("href", "#/login");
    expect(screen.getByRole("combobox", { name: "Sprache" })).toBeInTheDocument();
    expect(screen.getAllByText("Basel").length).toBeGreaterThan(0);
  });

  it("hides the public language switcher when a session is restored", async () => {
    window.location.hash = "#/users/user-2";
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
      preferred_currency: "EUR",
      created_at: "2026-08-14T00:00:00Z",
      updated_at: "2026-08-14T00:00:00Z"
    };
    supabaseState.publicProfileRow = {
      id: "user-2",
      display_name: "Lena",
      avatar_url: null,
      bio: "Miniatures painter",
      public_region: "Basel",
      account_status: "active",
      created_at: "2026-08-14T00:00:00Z",
      locations: []
    };

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Lena" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abmelden" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Sprache" })).not.toBeInTheDocument();
  });
});
