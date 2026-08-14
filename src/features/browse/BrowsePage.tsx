import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { listPublishedItems } from "@/features/items/itemApi";
import { ItemCard } from "@/features/items/ItemCard";
import { categoryLabelKeys } from "@/features/items/itemLabels";
import {
  itemCategories,
  itemMatchesSearch,
  type ItemCategory,
  type ItemSummary
} from "@/features/items/itemSchema";
import { useI18n } from "@/lib/i18n/useI18n";

export function BrowsePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ItemCategory | "all">("all");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      if (!user) {
        return;
      }

      try {
        const loadedItems = await listPublishedItems(user.id);

        if (isMounted) {
          setItems(loadedItems);
          setStatus("ready");
        }
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    void loadItems();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesCategory = category === "all" || item.category === category;
        const matchesRegion = !region.trim() || item.publicRegion.toLowerCase().includes(region.toLowerCase());
        return matchesCategory && matchesRegion && itemMatchesSearch(item, search);
      }),
    [category, items, region, search]
  );

  return (
    <section className="page-section" aria-labelledby="browse-title">
      <div>
        <p className="eyebrow">{t("browse.eyebrow")}</p>
        <h1 id="browse-title">{t("browse.title")}</h1>
        <p className="page-intro">{t("browse.intro")}</p>
      </div>

      <div className="filter-bar" aria-label={t("browse.filters")}>
        <label>
          <span>{t("browse.search")}</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label>
          <span>{t("item.category")}</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as ItemCategory | "all")}>
            <option value="all">{t("browse.allCategories")}</option>
            {itemCategories.map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>
                {t(categoryLabelKeys[itemCategory])}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("item.publicRegion")}</span>
          <input value={region} onChange={(event) => setRegion(event.target.value)} />
        </label>
      </div>

      {status === "loading" ? <p role="status">{t("browse.loading")}</p> : null}
      {status === "error" ? <p role="alert">{t("browse.loadError")}</p> : null}
      {status === "ready" && filteredItems.length === 0 ? <p role="status">{t("browse.empty")}</p> : null}
      {filteredItems.length > 0 ? (
        <div className="item-grid">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} showOwner />
          ))}
        </div>
      ) : null}
    </section>
  );
}
