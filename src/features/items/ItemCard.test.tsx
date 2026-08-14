import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ItemCard } from "@/features/items/ItemCard";
import type { ItemSummary } from "@/features/items/itemSchema";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

describe("ItemCard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders item facts and owner when requested", () => {
    const item: ItemSummary = {
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
      updatedAt: "2026-08-14T00:00:00Z"
    };

    render(
      <I18nProvider>
        <MemoryRouter>
          <ItemCard item={item} showOwner />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByRole("link", { name: "Painted Skirmish Set" })).toHaveAttribute(
      "href",
      "/items/item-1"
    );
    expect(screen.getByText("Miniaturen")).toBeInTheDocument();
    expect(screen.getByText("Mara")).toBeInTheDocument();
  });

  it("marks items owned by the current user", () => {
    const item: ItemSummary = {
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
      updatedAt: "2026-08-14T00:00:00Z"
    };

    render(
      <I18nProvider>
        <MemoryRouter>
          <ItemCard item={item} showOwner currentUserId="user-1" />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByText("Dein Gegenstand")).toBeInTheDocument();
  });
});
