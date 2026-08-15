import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { BrowsePage } from "@/features/browse/BrowsePage";
import { useAuth } from "@/features/auth/useAuth";
import { listPublishedItems } from "@/features/items/itemApi";
import type { ItemSummary } from "@/features/items/itemSchema";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: vi.fn()
}));

vi.mock("@/features/items/itemApi", () => ({
  listPublishedItems: vi.fn()
}));

const mockUseAuth = vi.mocked(useAuth);
const mockListPublishedItems = vi.mocked(listPublishedItems);

describe("BrowsePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("questgear.locale", "en");
    mockListPublishedItems.mockReset();
    mockUseAuth.mockReturnValue({
      session: null,
      user: { id: "user-1" } as never,
      profile: null,
      isLoading: false,
      profileError: null,
      refreshProfile: vi.fn(),
      signOut: vi.fn()
    });
  });

  it("can hide items owned by the current user", async () => {
    mockListPublishedItems.mockResolvedValue([
      makeItem({ id: "item-1", ownerId: "user-1", title: "My Painted Army" }),
      makeItem({ id: "item-2", ownerId: "user-2", title: "Lena's Terrain Kit" })
    ]);

    render(
      <I18nProvider>
        <MemoryRouter>
          <BrowsePage />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(await screen.findByRole("link", { name: "My Painted Army" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lena's Terrain Kit" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Hide my items" }));

    expect(screen.queryByRole("link", { name: "My Painted Army" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lena's Terrain Kit" })).toBeInTheDocument();
  });
});

function makeItem(overrides: Partial<ItemSummary>): ItemSummary {
  return {
    id: "item-1",
    ownerId: "user-1",
    title: "Painted Skirmish Set",
    description: "Twelve painted skirmish miniatures with a foam tray.",
    category: "miniatures",
    condition: "very_good",
    publicRegion: "Zurich",
    state: "published",
    gameSystem: "Frostgrave",
    manufacturer: "North Star",
    language: null,
    tags: ["skirmish"],
    fragile: false,
    minimumNoticeDays: 1,
    maximumLoanDays: 10,
    replacementValue: null,
    replacementValueCurrency: null,
    coverPhotoUrl: null,
    ownerDisplayName: "Mara",
    createdAt: "2026-08-14T00:00:00Z",
    updatedAt: "2026-08-14T00:00:00Z",
    ...overrides
  };
}
