import { useI18n } from "@/lib/i18n/useI18n";

export function HomePage() {
  const { t } = useI18n();

  return (
    <section className="page-section" aria-labelledby="home-title">
      <div>
        <p className="eyebrow">{t("home.eyebrow")}</p>
        <h1 id="home-title">{t("home.title")}</h1>
        <p className="page-intro">{t("home.intro")}</p>
      </div>
      <div className="summary-grid" aria-label={t("home.sections")}>
        <article>
          <h2>{t("home.requests.title")}</h2>
          <p>{t("home.requests.empty")}</p>
        </article>
        <article>
          <h2>{t("home.borrowing.title")}</h2>
          <p>{t("home.borrowing.empty")}</p>
        </article>
        <article>
          <h2>{t("home.lending.title")}</h2>
          <p>{t("home.lending.empty")}</p>
        </article>
      </div>
    </section>
  );
}
