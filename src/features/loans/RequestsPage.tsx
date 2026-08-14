import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { listLoansForUser } from "@/features/loans/loanApi";
import { loanStatusLabelKeys } from "@/features/loans/loanLabels";
import { formatLoanDateTime, type LoanSummary } from "@/features/loans/loanSchema";
import { useI18n } from "@/lib/i18n/useI18n";

export function RequestsPage() {
  const { locale, t } = useI18n();
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<"incoming" | "sent" | "closed">("incoming");

  useEffect(() => {
    let isMounted = true;

    async function loadLoans() {
      try {
        const loadedLoans = await listLoansForUser();

        if (isMounted) {
          setLoans(loadedLoans);
          setStatus("ready");
        }
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    void loadLoans();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredLoans = useMemo(() => {
    if (!user) {
      return [];
    }

    return loans.filter((loan) => {
      const isClosed = ["rejected", "cancelled", "completed", "disputed"].includes(loan.status);
      if (tab === "incoming") {
        return loan.ownerId === user.id && !isClosed;
      }
      if (tab === "sent") {
        return loan.borrowerId === user.id && !isClosed;
      }
      return isClosed;
    });
  }, [loans, tab, user]);

  return (
    <section className="page-section" aria-labelledby="requests-title">
      <div>
        <p className="eyebrow">{t("requests.eyebrow")}</p>
        <h1 id="requests-title">{t("requests.title")}</h1>
        <p className="page-intro">{t("requests.intro")}</p>
      </div>

      <div className="segmented-control" aria-label={t("requests.tabs")}>
        <button type="button" className={tab === "incoming" ? "active" : ""} onClick={() => setTab("incoming")}>
          {t("requests.incoming")}
        </button>
        <button type="button" className={tab === "sent" ? "active" : ""} onClick={() => setTab("sent")}>
          {t("requests.sent")}
        </button>
        <button type="button" className={tab === "closed" ? "active" : ""} onClick={() => setTab("closed")}>
          {t("requests.closed")}
        </button>
      </div>

      {status === "loading" ? <p role="status">{t("requests.loading")}</p> : null}
      {status === "error" ? <p role="alert">{t("requests.loadError")}</p> : null}
      {status === "ready" && filteredLoans.length === 0 ? <p role="status">{t("requests.empty")}</p> : null}
      <div className="item-grid">
        {filteredLoans.map((loan) => (
          <article key={loan.id} className="request-card">
            <div className="item-card-title-row">
              <h2>
                <Link to={`/loans/${loan.id}`}>{loan.itemTitles.join(", ")}</Link>
              </h2>
              <span className="status-pill">{t(loanStatusLabelKeys[loan.status])}</span>
            </div>
            <dl className="compact-facts">
              <div>
                <dt>{t("loan.startsAt")}</dt>
                <dd>{formatLoanDateTime(loan.startsAt, locale)}</dd>
              </div>
              <div>
                <dt>{t("loan.dueAt")}</dt>
                <dd>{formatLoanDateTime(loan.dueAt, locale)}</dd>
              </div>
              <div>
                <dt>{t("loan.borrower")}</dt>
                <dd>{loan.borrowerDisplayName ?? t("loan.unknownUser")}</dd>
              </div>
              <div>
                <dt>{t("loan.owner")}</dt>
                <dd>{loan.ownerDisplayName ?? t("loan.unknownUser")}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
