import { useI18n } from "@/lib/i18n/useI18n";

export function InventoryPage() {
  const { t } = useI18n();

  return (
    <section className="page-section" aria-labelledby="inventory-title">
      <p className="eyebrow">{t("inventory.eyebrow")}</p>
      <h1 id="inventory-title">{t("inventory.title")}</h1>
      <p className="page-intro">{t("inventory.intro")}</p>
    </section>
  );
}
