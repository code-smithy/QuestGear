import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { getItemDetail } from "@/features/items/itemApi";
import { categoryLabelKeys, conditionLabelKeys, severityLabelKeys, stateLabelKeys } from "@/features/items/itemLabels";
import type { ItemDetail } from "@/features/items/itemSchema";
import { useI18n } from "@/lib/i18n/useI18n";

export function ItemDetailPage() {
  const { t } = useI18n();
  const { itemId } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let isMounted = true;

    async function loadItem() {
      if (!itemId) {
        setStatus("missing");
        return;
      }

      try {
        const loadedItem = await getItemDetail(itemId);

        if (!isMounted) {
          return;
        }

        if (!loadedItem) {
          setStatus("missing");
          return;
        }

        setItem(loadedItem);
        setStatus("ready");
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    void loadItem();

    return () => {
      isMounted = false;
    };
  }, [itemId]);

  if (status === "loading") {
    return <p role="status">{t("item.loading")}</p>;
  }

  if (status === "error") {
    return <p role="alert">{t("item.loadError")}</p>;
  }

  if (!item) {
    return <p role="status">{t("item.notFound")}</p>;
  }

  const isOwner = item.ownerId === user?.id;

  return (
    <section className="page-section" aria-labelledby="item-title">
      <div className="item-detail-hero">
        <div className="item-detail-media" aria-hidden="true">
          {item.coverPhotoUrl ? <img src={item.coverPhotoUrl} alt="" /> : <span>{item.title.slice(0, 2)}</span>}
        </div>
        <div>
          <p className="eyebrow">{t(categoryLabelKeys[item.category])}</p>
          <h1 id="item-title">{item.title}</h1>
          <p className="page-intro">{item.description}</p>
          <div className="action-row">
            {isOwner ? (
              <Link className="secondary-button button-link" to={`/items/${item.id}/edit`}>
                {t("item.edit")}
              </Link>
            ) : (
              <button type="button" className="primary-button" disabled>
                {t("item.requestComingSoon")}
              </button>
            )}
          </div>
        </div>
      </div>

      <dl className="detail-facts">
        <div>
          <dt>{t("item.state")}</dt>
          <dd>{t(stateLabelKeys[item.state])}</dd>
        </div>
        <div>
          <dt>{t("item.condition")}</dt>
          <dd>{t(conditionLabelKeys[item.condition])}</dd>
        </div>
        <div>
          <dt>{t("item.publicRegion")}</dt>
          <dd>{item.publicRegion}</dd>
        </div>
        <div>
          <dt>{t("item.maximumLoanDays")}</dt>
          <dd>{item.maximumLoanDays}</dd>
        </div>
        <div>
          <dt>{t("item.owner")}</dt>
          <dd>{item.ownerDisplayName ?? t("item.ownerUnknown")}</dd>
        </div>
      </dl>

      <section aria-labelledby="item-contents-title">
        <h2 id="item-contents-title">{t("item.sectionContents")}</h2>
        <ul className="data-list">
          {item.contents.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.quantity}x {entry.name}</strong>
              <span>{t(conditionLabelKeys[entry.condition])}</span>
              {entry.note ? <p>{entry.note}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="item-damage-title">
        <h2 id="item-damage-title">{t("item.sectionDamage")}</h2>
        {item.damage.length === 0 ? (
          <p>{t("item.noDamage")}</p>
        ) : (
          <ul className="data-list">
            {item.damage.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.damageType}</strong>
                <span>{t(severityLabelKeys[entry.severity])}</span>
                <p>{entry.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
