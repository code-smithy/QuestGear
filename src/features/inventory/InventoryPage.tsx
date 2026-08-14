import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { listOwnItems } from "@/features/items/itemApi";
import { ItemCard } from "@/features/items/ItemCard";
import { itemStates, type ItemState, type ItemSummary } from "@/features/items/itemSchema";
import { stateLabelKeys } from "@/features/items/itemLabels";
import { useI18n } from "@/lib/i18n/useI18n";

export function InventoryPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [selectedState, setSelectedState] = useState<ItemState | "all">("all");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      if (!user) {
        return;
      }

      try {
        const loadedItems = await listOwnItems(user.id);

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
    () => (selectedState === "all" ? items : items.filter((item) => item.state === selectedState)),
    [items, selectedState]
  );

  return (
    <section className="page-section" aria-labelledby="inventory-title">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">{t("inventory.eyebrow")}</p>
          <h1 id="inventory-title">{t("inventory.title")}</h1>
          <p className="page-intro">{t("inventory.intro")}</p>
        </div>
        <Link className="primary-button button-link" to="/items/new">
          {t("inventory.addItem")}
        </Link>
      </div>

      <div className="segmented-control" aria-label={t("inventory.filterLabel")}>
        <button
          type="button"
          className={selectedState === "all" ? "active" : ""}
          onClick={() => setSelectedState("all")}
        >
          {t("inventory.all")}
        </button>
        {itemStates.map((state) => (
          <button
            key={state}
            type="button"
            className={selectedState === state ? "active" : ""}
            onClick={() => setSelectedState(state)}
          >
            {t(stateLabelKeys[state])}
          </button>
        ))}
      </div>

      {status === "loading" ? <p role="status">{t("inventory.loading")}</p> : null}
      {status === "error" ? <p role="alert">{t("inventory.loadError")}</p> : null}
      {status === "ready" && filteredItems.length === 0 ? (
        <p role="status">{items.length === 0 ? t("inventory.empty") : t("inventory.noFilteredItems")}</p>
      ) : null}
      {filteredItems.length > 0 ? (
        <div className="item-grid">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
