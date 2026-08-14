import { Link } from "react-router-dom";
import type { ReliabilityScore } from "@/features/reliability/reliabilitySchema";
import { useI18n } from "@/lib/i18n/useI18n";

type ReliabilitySummaryProps = {
  score: ReliabilityScore | null;
};

export function ReliabilitySummary({ score }: ReliabilitySummaryProps) {
  const { t } = useI18n();

  if (!score) {
    return (
      <section className="reliability-panel" aria-labelledby="reliability-title">
        <div className="item-card-title-row">
          <h2 id="reliability-title">{t("reliability.title")}</h2>
          <Link to="/help/reliability">{t("reliability.helpLink")}</Link>
        </div>
        <p>{t("reliability.noScore")}</p>
      </section>
    );
  }

  const completedLoans = score.completedAsBorrower + score.completedAsLender;
  const displayScore = completedLoans < 3 ? t("reliability.confidence.new") : String(score.combinedScore);

  return (
    <section className="reliability-panel" aria-labelledby="reliability-title">
      <div className="item-card-title-row">
        <h2 id="reliability-title">{t("reliability.title")}</h2>
        <Link to="/help/reliability">{t("reliability.helpLink")}</Link>
      </div>
      <div className="score-display">
        <strong>{displayScore}</strong>
        <span>{t(confidenceLabelKeys[score.confidence])}</span>
      </div>
      <dl className="detail-facts">
        <div>
          <dt>{t("reliability.completedLoans")}</dt>
          <dd>{completedLoans}</dd>
        </div>
        <div>
          <dt>{t("reliability.borrowerScore")}</dt>
          <dd>{score.borrowerScore}</dd>
        </div>
        <div>
          <dt>{t("reliability.lenderScore")}</dt>
          <dd>{score.lenderScore}</dd>
        </div>
        <div>
          <dt>{t("reliability.borrowerAverage")}</dt>
          <dd>{formatAverage(score.borrowerReviewAverage)}</dd>
        </div>
        <div>
          <dt>{t("reliability.lenderAverage")}</dt>
          <dd>{formatAverage(score.lenderReviewAverage)}</dd>
        </div>
      </dl>
      {score.recentPenaltySummary.length > 0 ? (
        <ul className="tag-list" aria-label={t("reliability.penalties")}>
          {score.recentPenaltySummary.map((penalty) => (
            <li key={`${penalty.role}-${penalty.eventType}`}>
              {t(penalty.role === "borrower" ? "reliability.borrowerRole" : "reliability.lenderRole")}: {penalty.points}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

const confidenceLabelKeys = {
  new: "reliability.confidence.new",
  low: "reliability.confidence.low",
  medium: "reliability.confidence.medium",
  high: "reliability.confidence.high"
} as const;

function formatAverage(value: number | null): string {
  return value === null ? "-" : value.toFixed(2);
}
