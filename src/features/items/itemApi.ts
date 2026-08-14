import { supabase } from "@/lib/supabase";
import type { SupportedCurrency } from "@/lib/currency";
import {
  itemTagsFromText,
  type DamageSeverity,
  type ItemCategory,
  type ItemCondition,
  type ItemDetail,
  type ItemFormValues,
  type ItemState,
  type ItemSummary
} from "@/features/items/itemSchema";

type ItemRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: ItemCategory;
  overall_condition: ItemCondition;
  public_region: string;
  state: ItemState;
  game_system: string | null;
  manufacturer: string | null;
  language: string | null;
  tags: string[] | null;
  fragile: boolean;
  minimum_notice_days: number;
  maximum_loan_days: number;
  replacement_value: number | null;
  replacement_value_currency: SupportedCurrency | null;
  cover_photo_url: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string } | null;
  item_contents?: ContentRow[];
  item_damage?: DamageRow[];
};

type ContentRow = {
  id: string;
  name: string;
  quantity: number;
  condition: ItemCondition;
  note: string | null;
  sort_order: number;
};

type DamageRow = {
  id: string;
  damage_type: string;
  severity: DamageSeverity;
  description: string;
};

const itemColumns = [
  "id",
  "owner_id",
  "title",
  "description",
  "category",
  "overall_condition",
  "public_region",
  "state",
  "game_system",
  "manufacturer",
  "language",
  "tags",
  "fragile",
  "minimum_notice_days",
  "maximum_loan_days",
  "replacement_value",
  "replacement_value_currency",
  "cover_photo_url",
  "created_at",
  "updated_at"
].join(",");

export async function listOwnItems(ownerId: string): Promise<ItemSummary[]> {
  const { data, error } = await supabase
    .from("items")
    .select(itemColumns)
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Could not load inventory.");
  }

  return ((data ?? []) as unknown as ItemRow[]).map(mapItemSummary);
}

export async function listPublishedItems(userId: string): Promise<ItemSummary[]> {
  const { data, error } = await supabase
    .from("items")
    .select(`${itemColumns},profiles!items_owner_id_fkey(display_name)`)
    .eq("state", "published")
    .neq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Could not load published items.");
  }

  return ((data ?? []) as unknown as ItemRow[]).map(mapItemSummary);
}

export async function getItemDetail(itemId: string): Promise<ItemDetail | null> {
  const { data, error } = await supabase
    .from("items")
    .select(`${itemColumns},profiles!items_owner_id_fkey(display_name),item_contents(*),item_damage(*)`)
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load item.");
  }

  return data ? mapItemDetail(data as unknown as ItemRow) : null;
}

export async function saveItem(ownerId: string, values: ItemFormValues, itemId?: string): Promise<string> {
  const parsedValue = values.replacementValue === "" ? null : Number(values.replacementValue);
  const payload = {
    id: itemId,
    owner_id: ownerId,
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category,
    overall_condition: values.condition,
    public_region: values.publicRegion.trim(),
    state: values.state,
    game_system: normalizeOptional(values.gameSystem),
    manufacturer: normalizeOptional(values.manufacturer),
    language: normalizeOptional(values.language),
    tags: itemTagsFromText(values.tagsText),
    fragile: values.fragile,
    minimum_notice_days: values.minimumNoticeDays,
    maximum_loan_days: values.maximumLoanDays,
    replacement_value: parsedValue,
    replacement_value_currency: values.replacementValueCurrency
  };

  const { data, error } = await supabase.from("items").upsert(payload).select("id").single();

  if (error) {
    throw new Error("Could not save item.");
  }

  const savedItemId = getSavedItemId(data);
  await replaceItemContents(savedItemId, values.contents);
  await replaceItemDamage(savedItemId, values.damage);

  return savedItemId;
}

async function replaceItemContents(itemId: string, contents: ItemFormValues["contents"]) {
  const deleteResult = await supabase.from("item_contents").delete().eq("item_id", itemId);

  if (deleteResult.error) {
    throw new Error("Could not replace contents.");
  }

  const rows = contents.map((entry, index) => ({
    item_id: itemId,
    name: entry.name.trim(),
    quantity: entry.quantity,
    condition: entry.condition,
    note: normalizeOptional(entry.note),
    sort_order: index
  }));

  const { error } = await supabase.from("item_contents").insert(rows);

  if (error) {
    throw new Error("Could not save contents.");
  }
}

async function replaceItemDamage(itemId: string, damage: ItemFormValues["damage"]) {
  const deleteResult = await supabase.from("item_damage").delete().eq("item_id", itemId);

  if (deleteResult.error) {
    throw new Error("Could not replace damage records.");
  }

  if (damage.length === 0) {
    return;
  }

  const rows = damage.map((entry) => ({
    item_id: itemId,
    damage_type: entry.damageType.trim(),
    severity: entry.severity,
    description: entry.description.trim()
  }));

  const { error } = await supabase.from("item_damage").insert(rows);

  if (error) {
    throw new Error("Could not save damage records.");
  }
}

function normalizeOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getSavedItemId(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  ) {
    return value.id;
  }

  throw new Error("Saved item did not return an id.");
}

function mapItemSummary(row: ItemRow): ItemSummary {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.overall_condition,
    publicRegion: row.public_region,
    state: row.state,
    gameSystem: row.game_system,
    manufacturer: row.manufacturer,
    language: row.language,
    tags: row.tags ?? [],
    fragile: row.fragile,
    minimumNoticeDays: row.minimum_notice_days,
    maximumLoanDays: row.maximum_loan_days,
    replacementValue: row.replacement_value,
    replacementValueCurrency: row.replacement_value_currency,
    coverPhotoUrl: row.cover_photo_url,
    ownerDisplayName: row.profiles?.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapItemDetail(row: ItemRow): ItemDetail {
  return {
    ...mapItemSummary(row),
    contents: (row.item_contents ?? [])
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        quantity: entry.quantity,
        condition: entry.condition,
        note: entry.note ?? "",
        sortOrder: entry.sort_order
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder),
    damage: (row.item_damage ?? []).map((entry) => ({
      id: entry.id,
      damageType: entry.damage_type,
      severity: entry.severity,
      description: entry.description
    }))
  };
}
