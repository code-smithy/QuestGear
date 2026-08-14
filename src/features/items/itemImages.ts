import type { ItemSummary } from "@/features/items/itemSchema";

type DescriptionPart = {
  type: "text" | "image";
  value: string;
};

const imageReferencePattern =
  /!?\[[^\]]*]\((https?:\/\/[^\s<>"')]+?\.(?:png|jpe?g)(?:[?#][^\s<>"')]+)?)\)|(https?:\/\/[^\s<>"')]+?\.(?:png|jpe?g)(?:[?#][^\s<>"')]+)?)/gi;

export function extractImageUrls(value: string): string[] {
  const urls: string[] = [];

  for (const match of value.matchAll(imageReferencePattern)) {
    const url = match[1] ?? match[2];
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
}

export function getItemCoverImageUrl(item: Pick<ItemSummary, "coverPhotoUrl" | "description">): string | null {
  return item.coverPhotoUrl ?? extractImageUrls(item.description)[0] ?? null;
}

export function getItemTextDescription(description: string): string {
  return splitDescriptionByImageUrls(description)
    .filter((part) => part.type === "text")
    .map((part) => part.value)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitDescriptionByImageUrls(description: string): DescriptionPart[] {
  const parts: DescriptionPart[] = [];
  let lastIndex = 0;

  for (const match of description.matchAll(imageReferencePattern)) {
    const matchStart = match.index ?? 0;
    const matchValue = match[0];
    const url = match[1] ?? match[2];

    if (matchStart > lastIndex) {
      parts.push({ type: "text", value: description.slice(lastIndex, matchStart) });
    }

    if (url) {
      parts.push({ type: "image", value: url });
    }

    lastIndex = matchStart + matchValue.length;
  }

  if (lastIndex < description.length) {
    parts.push({ type: "text", value: description.slice(lastIndex) });
  }

  return parts.filter((part) => part.value.trim().length > 0);
}
