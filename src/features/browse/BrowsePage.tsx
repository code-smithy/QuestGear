import { useI18n } from "@/lib/i18n/useI18n";

export function BrowsePage() {
  const { t } = useI18n();

  return (
    <section className="page-section" aria-labelledby="browse-title">
      <p className="eyebrow">{t("browse.eyebrow")}</p>
      <h1 id="browse-title">{t("browse.title")}</h1>
      <p className="page-intro">{t("browse.intro")}</p>
    </section>
  );
}
