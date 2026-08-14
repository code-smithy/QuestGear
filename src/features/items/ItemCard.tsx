import { Link } from "react-router-dom";
import { categoryLabelKeys, conditionLabelKeys, stateLabelKeys } from "@/features/items/itemLabels";
import type { ItemSummary } from "@/features/items/itemSchema";
import { useI18n } from "@/lib/i18n/useI18n";

type ItemCardProps = {
  item: ItemSummary;
  showOwner?: boolean;
};

export function ItemCard({ item, showOwner = false }: ItemCardProps) {
  const { t } = useI18n();

  return (
    <article className="item-card">
      <div className="item-card-media" aria-hidden="true">
        {item.coverPhotoUrl ? <img src={item.coverPhotoUrl} alt="" /> : <span>{item.title.slice(0, 2)}</span>}
      </div>
      <div className="item-card-body">
        <div className="item-card-title-row">
          <h2>
            <Link to={`/items/${item.id}`}>{item.title}</Link>
          </h2>
          <span className={`status-pill status-${item.state}`}>{t(stateLabelKeys[item.state])}</span>
        </div>
        <p>{item.description}</p>
        <dl className="compact-facts">
          <div>
            <dt>{t("item.category")}</dt>
            <dd>{t(categoryLabelKeys[item.category])}</dd>
          </div>
          <div>
            <dt>{t("item.condition")}</dt>
            <dd>{t(conditionLabelKeys[item.condition])}</dd>
          </div>
          <div>
            <dt>{t("item.publicRegion")}</dt>
            <dd>{item.publicRegion}</dd>
          </div>
          {showOwner ? (
            <div>
              <dt>{t("item.owner")}</dt>
              <dd>{item.ownerDisplayName ?? t("item.ownerUnknown")}</dd>
            </div>
          ) : null}
        </dl>
        {item.tags.length > 0 ? (
          <ul className="tag-list" aria-label={t("item.tags")}>
            {item.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
