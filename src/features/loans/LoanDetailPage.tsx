import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { approveLoan, cancelLoan, getLoanDetail, rejectLoan } from "@/features/loans/loanApi";
import { loanEventLabelKeys, loanStatusLabelKeys } from "@/features/loans/loanLabels";
import { formatLoanDateTime, type LoanDetail } from "@/features/loans/loanSchema";
import { useI18n } from "@/lib/i18n/useI18n";

export function LoanDetailPage() {
  const { locale, t } = useI18n();
  const { loanId } = useParams();
  const { user } = useAuth();
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [actionError, setActionError] = useState<string | null>(null);

  const loadLoan = useCallback(async () => {
    if (!loanId) {
      setStatus("missing");
      return;
    }

    try {
      const loadedLoan = await getLoanDetail(loanId);
      setLoan(loadedLoan);
      setStatus(loadedLoan ? "ready" : "missing");
    } catch {
      setStatus("error");
    }
  }, [loanId]);

  useEffect(() => {
    void loadLoan();
  }, [loadLoan]);

  async function runAction(action: () => Promise<void>) {
    setActionError(null);

    try {
      await action();
      await loadLoan();
    } catch {
      setActionError(t("loan.actionError"));
    }
  }

  if (status === "loading") {
    return <p role="status">{t("loan.loading")}</p>;
  }

  if (status === "error") {
    return <p role="alert">{t("loan.loadError")}</p>;
  }

  if (!loan || !user) {
    return <p role="status">{t("loan.notFound")}</p>;
  }

  const canOwnerRespond = loan.ownerId === user.id && ["requested", "countered"].includes(loan.status);
  const canCancel =
    [loan.ownerId, loan.borrowerId].includes(user.id) &&
    ["requested", "countered", "approved"].includes(loan.status);

  return (
    <section className="page-section" aria-labelledby="loan-title">
      <div>
        <p className="eyebrow">{t(loanStatusLabelKeys[loan.status])}</p>
        <h1 id="loan-title">{loan.itemTitles.join(", ")}</h1>
        <p className="page-intro">{t("loan.detailIntro")}</p>
      </div>

      {actionError ? <p className="alert" role="alert">{actionError}</p> : null}
      <div className="action-row">
        {canOwnerRespond ? (
          <>
            <button type="button" className="primary-button" onClick={() => void runAction(() => approveLoan(loan.id))}>
              {t("loan.approve")}
            </button>
            <button type="button" className="secondary-button" onClick={() => void runAction(() => rejectLoan(loan.id))}>
              {t("loan.reject")}
            </button>
          </>
        ) : null}
        {canCancel ? (
          <button type="button" className="secondary-button" onClick={() => void runAction(() => cancelLoan(loan.id))}>
            {t("loan.cancel")}
          </button>
        ) : null}
      </div>

      <dl className="detail-facts">
        <div>
          <dt>{t("loan.startsAt")}</dt>
          <dd>{formatLoanDateTime(loan.startsAt, locale)}</dd>
        </div>
        <div>
          <dt>{t("loan.dueAt")}</dt>
          <dd>{formatLoanDateTime(loan.dueAt, locale)}</dd>
        </div>
        <div>
          <dt>{t("loan.owner")}</dt>
          <dd>{loan.ownerDisplayName ?? t("loan.unknownUser")}</dd>
        </div>
        <div>
          <dt>{t("loan.borrower")}</dt>
          <dd>{loan.borrowerDisplayName ?? t("loan.unknownUser")}</dd>
        </div>
      </dl>

      {loan.note ? (
        <section aria-labelledby="loan-note-title">
          <h2 id="loan-note-title">{t("loan.note")}</h2>
          <p>{loan.note}</p>
        </section>
      ) : null}

      <section aria-labelledby="loan-items-title">
        <h2 id="loan-items-title">{t("loan.items")}</h2>
        <ul className="data-list">
          {loan.items.map((item) => (
            <li key={item.id}>
              <strong>
                <Link to={`/items/${item.itemId}`}>{item.itemTitle}</Link>
              </strong>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="loan-events-title">
        <h2 id="loan-events-title">{t("loan.timeline")}</h2>
        <ol className="data-list">
          {loan.events.map((event) => (
            <li key={event.id}>
              <strong>{t(loanEventLabelKeys[event.eventType])}</strong>
              <span>{formatLoanDateTime(event.createdAt, locale)}</span>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
