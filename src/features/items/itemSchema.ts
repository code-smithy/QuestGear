import { z } from "zod";
import { defaultCurrency, supportedCurrencies, type SupportedCurrency } from "@/lib/currency";

export const itemStates = ["draft", "published", "unavailable", "archived"] as const;
export const itemCategories = [
  "miniatures",
  "terrain",
  "maps",
  "dungeon_tiles",
  "books",
  "board_games",
  "rpg_accessories",
  "tokens",
  "hobby_tools",
  "other"
] as const;
export const itemConditions = ["new", "very_good", "good", "worn", "damaged"] as const;
export const damageSeverities = ["cosmetic", "minor", "major", "unusable"] as const;

export type ItemState = (typeof itemStates)[number];
export type ItemCategory = (typeof itemCategories)[number];
export type ItemCondition = (typeof itemConditions)[number];
export type DamageSeverity = (typeof damageSeverities)[number];

export const itemContentSchema = z.object({
  name: z.string().trim().min(1, "item.validation.contentName").max(120),
  quantity: z.coerce.number().int().min(1).max(999),
  condition: z.enum(itemConditions),
  note: z.string().trim().max(500).optional()
});

export const itemDamageSchema = z.object({
  damageType: z.string().trim().min(1, "item.validation.damageType").max(80),
  severity: z.enum(damageSeverities),
  description: z.string().trim().min(1, "item.validation.damageDescription").max(1000)
});

export const itemFormSchema = z.object({
  title: z.string().trim().min(3, "item.validation.titleMin").max(120, "item.validation.titleMax"),
  description: z
    .string()
    .trim()
    .min(10, "item.validation.descriptionMin")
    .max(5000, "item.validation.descriptionMax"),
  category: z.enum(itemCategories),
  condition: z.enum(itemConditions),
  publicRegion: z.string().trim().min(1, "item.validation.publicRegionRequired").max(100),
  gameSystem: z.string().trim().max(120).optional(),
  manufacturer: z.string().trim().max(120).optional(),
  language: z.string().trim().max(40).optional(),
  tagsText: z.string().trim().max(500).optional(),
  fragile: z.boolean(),
  minimumNoticeDays: z.coerce.number().int().min(0).max(90),
  maximumLoanDays: z.coerce.number().int().min(1).max(365),
  replacementValue: z.preprocess(
    (value) => (value === "" || value === undefined ? "" : Number(value)),
    z.number().min(0).max(100000).or(z.literal(""))
  ),
  replacementValueCurrency: z.enum(supportedCurrencies),
  contents: z.array(itemContentSchema).min(1, "item.validation.contentsRequired"),
  damage: z.array(itemDamageSchema),
  state: z.enum(itemStates)
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;
export type ItemContentFormValues = z.infer<typeof itemContentSchema>;
export type ItemDamageFormValues = z.infer<typeof itemDamageSchema>;

export type ItemSummary = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: ItemCategory;
  condition: ItemCondition;
  publicRegion: string;
  state: ItemState;
  gameSystem: string | null;
  manufacturer: string | null;
  language: string | null;
  tags: string[];
  fragile: boolean;
  minimumNoticeDays: number;
  maximumLoanDays: number;
  replacementValue: number | null;
  replacementValueCurrency: SupportedCurrency | null;
  coverPhotoUrl: string | null;
  ownerDisplayName?: string;
  createdAt: string;
  updatedAt: string;
};

export type ItemDetail = ItemSummary & {
  contents: Array<ItemContentFormValues & { id: string; sortOrder: number }>;
  damage: Array<ItemDamageFormValues & { id: string }>;
};

export function getDefaultItemFormValues(region = "", currency = defaultCurrency): ItemFormValues {
  return {
    title: "",
    description: "",
    category: "miniatures",
    condition: "good",
    publicRegion: region,
    gameSystem: "",
    manufacturer: "",
    language: "",
    tagsText: "",
    fragile: false,
    minimumNoticeDays: 1,
    maximumLoanDays: 14,
    replacementValue: "",
    replacementValueCurrency: currency,
    contents: [{ name: "", quantity: 1, condition: "good", note: "" }],
    damage: [],
    state: "draft"
  };
}

export function itemTagsFromText(value: string | undefined): string[] {
  return Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 20);
}

export function itemMatchesSearch(item: ItemSummary, search: string): boolean {
  const needle = search.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  return [
    item.title,
    item.description,
    item.gameSystem,
    item.manufacturer,
    item.publicRegion,
    item.language,
    item.tags.join(" ")
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(needle));
}
