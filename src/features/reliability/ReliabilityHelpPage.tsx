import { useI18n } from "@/lib/i18n/useI18n";

export function ReliabilityHelpPage() {
  const { t } = useI18n();

  return (
    <section className="page-section" aria-labelledby="reliability-help-title">
      <div>
        <p className="eyebrow">{t("reliability.eyebrow")}</p>
        <h1 id="reliability-help-title">{t("reliability.helpTitle")}</h1>
        <p className="page-intro">{t("reliability.helpIntro")}</p>
      </div>

      <div className="summary-grid">
        <article>
          <h2>{t("reliability.helpReviewsTitle")}</h2>
          <p>{t("reliability.helpReviews")}</p>
        </article>
        <article>
          <h2>{t("reliability.helpPenaltiesTitle")}</h2>
          <p>{t("reliability.helpPenalties")}</p>
        </article>
        <article>
          <h2>{t("reliability.helpConfidenceTitle")}</h2>
          <p>{t("reliability.helpConfidence")}</p>
        </article>
      </div>
    </section>
  );
}
