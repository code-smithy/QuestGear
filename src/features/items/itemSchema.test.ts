import {
  getDefaultItemFormValues,
  itemFormSchema,
  itemMatchesSearch,
  itemTagsFromText,
  type ItemSummary
} from "@/features/items/itemSchema";

describe("itemFormSchema", () => {
  it("accepts a publishable inventory item", () => {
    const result = itemFormSchema.safeParse({
      ...getDefaultItemFormValues("Zurich"),
      title: "Skeleton Warband",
      description: "A complete boxed skeleton warband with tray.",
      contents: [{ name: "Skeleton miniature", quantity: 12, condition: "good", note: "" }],
      state: "published"
    });

    expect(result.success).toBe(true);
  });

  it("rejects too-short required item data", () => {
    const result = itemFormSchema.safeParse({
      ...getDefaultItemFormValues(),
      title: "AB",
      description: "short",
      publicRegion: "",
      contents: []
    });

    expect(result.success).toBe(false);
  });
});

describe("itemTagsFromText", () => {
  it("normalizes duplicate comma-separated tags", () => {
    expect(itemTagsFromText("DnD, terrain, dnd,  Maps ")).toEqual(["dnd", "terrain", "maps"]);
  });
});

describe("itemMatchesSearch", () => {
  const item: ItemSummary = {
    id: "item-1",
    ownerId: "user-1",
    title: "Dungeon Tiles",
    description: "Stone corridors and rooms.",
    category: "dungeon_tiles",
    condition: "good",
    publicRegion: "Basel",
    state: "published",
    gameSystem: "Dungeons & Dragons",
    manufacturer: null,
    language: null,
    tags: ["stone", "maps"],
    fragile: false,
    minimumNoticeDays: 1,
    maximumLoanDays: 14,
    replacementValue: null,
    replacementValueCurrency: null,
    coverPhotoUrl: null,
    createdAt: "2026-08-14T00:00:00Z",
    updatedAt: "2026-08-14T00:00:00Z"
  };

  it("matches title, tags, and system text", () => {
    expect(itemMatchesSearch(item, "tiles")).toBe(true);
    expect(itemMatchesSearch(item, "stone")).toBe(true);
    expect(itemMatchesSearch(item, "dragons")).toBe(true);
    expect(itemMatchesSearch(item, "miniature")).toBe(false);
  });
});
