import type {
  DamageSeverity,
  ItemCategory,
  ItemCondition,
  ItemState
} from "@/features/items/itemSchema";
import type { TranslationKey } from "@/lib/i18n/translations";

export const categoryLabelKeys: Record<ItemCategory, TranslationKey> = {
  miniatures: "item.category.miniatures",
  terrain: "item.category.terrain",
  maps: "item.category.maps",
  dungeon_tiles: "item.category.dungeonTiles",
  books: "item.category.books",
  board_games: "item.category.boardGames",
  rpg_accessories: "item.category.rpgAccessories",
  tokens: "item.category.tokens",
  hobby_tools: "item.category.hobbyTools",
  other: "item.category.other"
};

export const conditionLabelKeys: Record<ItemCondition, TranslationKey> = {
  new: "item.condition.new",
  very_good: "item.condition.veryGood",
  good: "item.condition.good",
  worn: "item.condition.worn",
  damaged: "item.condition.damaged"
};

export const stateLabelKeys: Record<ItemState, TranslationKey> = {
  draft: "item.state.draft",
  published: "item.state.published",
  unavailable: "item.state.unavailable",
  archived: "item.state.archived"
};

export const severityLabelKeys: Record<DamageSeverity, TranslationKey> = {
  cosmetic: "item.severity.cosmetic",
  minor: "item.severity.minor",
  major: "item.severity.major",
  unusable: "item.severity.unusable"
};
