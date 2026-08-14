import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { listOwnItems } from "@/features/items/itemApi";
import type { ItemSummary } from "@/features/items/itemSchema";
import { getUnreadNotificationCount } from "@/features/notifications/notificationApi";
import { getReliabilityScore } from "@/features/reliability/reliabilityApi";
import type { ReliabilityScore } from "@/features/reliability/reliabilitySchema";
import { listLoansForUser } from "@/features/loans/loanApi";
import {
  formatLoanDateTime,
  isLoanOverdue,
  type LoanStatus,
  type LoanSummary
} from "@/features/loans/loanSchema";
import { loanStatusLabelKeys } from "@/features/loans/loanLabels";
import { useI18n } from "@/lib/i18n/useI18n";

export function HomePage() {
  const { locale, t } = useI18n();
  const { user, profile } = useAuth();
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [reliabilityScore, setReliabilityScore] = useState<ReliabilityScore | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (!user) {
        setStatus("ready");
        return;
      }

      try {
        const [loadedItems, loadedLoans, unreadCount, loadedReliabilityScore] = await Promise.all([
          listOwnItems(user.id),
          listLoansForUser(),
          getUnreadNotificationCount(),
          getReliabilityScore(user.id)
        ]);

        if (isMounted) {
          setItems(loadedItems);
          setLoans(loadedLoans);
          setUnreadNotificationCount(unreadCount);
          setReliabilityScore(loadedReliabilityScore);
          setStatus("ready");
        }
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const dashboard = useMemo(() => {
    const closedStatuses: LoanStatus[] = ["rejected", "cancelled", "completed", "disputed"];
    const activeLoans = loans.filter((loan) => !closedStatuses.includes(loan.status));
    const incomingLoans = user
      ? activeLoans.filter((loan) => loan.ownerId === user.id && ["requested", "countered"].includes(loan.status))
      : [];
    const borrowingLoans = user ? activeLoans.filter((loan) => loan.borrowerId === user.id) : [];
    const lendingLoans = user ? activeLoans.filter((loan) => loan.ownerId === user.id) : [];
    const overdueLoans = activeLoans.filter((loan) => isLoanOverdue(loan));
    const dueSoonLoans = activeLoans
      .filter((loan) => ["approved", "active", "return_pending"].includes(loan.status))
      .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())
      .slice(0, 3);

    return {
      incomingLoans,
      borrowingLoans,
      lendingLoans,
      overdueLoans,
      dueSoonLoans,
      draftItems: items.filter((item) => item.state === "draft"),
      publishedItems: items.filter((item) => item.state === "published"),
      unavailableItems: items.filter((item) => item.state === "unavailable")
    };
  }, [items, loans, user]);

  const displayName = profile?.displayName ?? user?.email ?? t("home.userFallback");
  const completedLoans = reliabilityScore
    ? reliabilityScore.completedAsBorrower + reliabilityScore.completedAsLender
    : 0;
  const scoreLabel = !reliabilityScore
    ? t("reliability.confidence.new")
    : completedLoans < 3
      ? t("reliability.confidence.new")
      : String(reliabilityScore.combinedScore);

  return (
    <section className="page-section" aria-labelledby="home-title">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">{t("home.eyebrow")}</p>
          <h1 id="home-title">{t("home.title")}</h1>
          <p className="page-intro">{t("home.intro")}</p>
        </div>
        <div className="dashboard-profile-summary" aria-label={t("home.profileSummary")}>
          <span>{t("home.signedInAs")}</span>
          <strong>{displayName}</strong>
        </div>
      </div>

      {status === "loading" ? <p role="status">{t("home.loading")}</p> : null}
      {status === "error" ? <p role="alert">{t("home.loadError")}</p> : null}

      <div className="dashboard-metrics" aria-label={t("home.sections")}>
        <article className={dashboard.incomingLoans.length > 0 ? "attention-metric" : ""}>
          <span>{t("home.requests.title")}</span>
          <strong>{dashboard.incomingLoans.length}</strong>
          <p>{t(dashboard.incomingLoans.length > 0 ? "home.requests.pending" : "home.requests.empty")}</p>
        </article>
        <article>
          <span>{t("home.borrowing.title")}</span>
          <strong>{dashboard.borrowingLoans.length}</strong>
          <p>{t(dashboard.borrowingLoans.length > 0 ? "home.borrowing.active" : "home.borrowing.empty")}</p>
        </article>
        <article>
          <span>{t("home.lending.title")}</span>
          <strong>{dashboard.lendingLoans.length}</strong>
          <p>{t(dashboard.lendingLoans.length > 0 ? "home.lending.active" : "home.lending.empty")}</p>
        </article>
        <article className={unreadNotificationCount > 0 ? "attention-metric" : ""}>
          <span>{t("home.notifications.title")}</span>
          <strong>{unreadNotificationCount}</strong>
          <p>{t(unreadNotificationCount > 0 ? "home.notifications.unread" : "home.notifications.empty")}</p>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel" aria-labelledby="home-next-title">
          <div className="item-card-title-row">
            <h2 id="home-next-title">{t("home.next.title")}</h2>
            <Link to="/loans">{t("home.viewAll")}</Link>
          </div>
          {dashboard.overdueLoans.length > 0 ? (
            <p className="dashboard-alert">{t("home.next.overdue")}</p>
          ) : null}
          {dashboard.dueSoonLoans.length === 0 ? <p>{t("home.next.empty")}</p> : null}
          <ul className="dashboard-list">
            {dashboard.dueSoonLoans.map((loan) => (
              <li key={loan.id}>
                <div>
                  <Link to={`/loans/${loan.id}`}>{loan.itemTitles.join(", ")}</Link>
                  <span>{getLoanRole(loan, user?.id, t)}</span>
                </div>
                <div>
                  <span className="status-pill">{t(loanStatusLabelKeys[loan.status])}</span>
                  <time dateTime={loan.dueAt}>{formatLoanDateTime(loan.dueAt, locale)}</time>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="dashboard-panel" aria-labelledby="home-inventory-title">
          <div className="item-card-title-row">
            <h2 id="home-inventory-title">{t("home.inventory.title")}</h2>
            <Link to="/inventory">{t("home.viewAll")}</Link>
          </div>
          <dl className="dashboard-facts">
            <div>
              <dt>{t("home.inventory.total")}</dt>
              <dd>{items.length}</dd>
            </div>
            <div>
              <dt>{t("item.state.published")}</dt>
              <dd>{dashboard.publishedItems.length}</dd>
            </div>
            <div>
              <dt>{t("item.state.draft")}</dt>
              <dd>{dashboard.draftItems.length}</dd>
            </div>
            <div>
              <dt>{t("item.state.unavailable")}</dt>
              <dd>{dashboard.unavailableItems.length}</dd>
            </div>
          </dl>
        </section>

        <section className="dashboard-panel" aria-labelledby="home-trust-title">
          <div className="item-card-title-row">
            <h2 id="home-trust-title">{t("home.trust.title")}</h2>
            <Link to="/help/reliability">{t("reliability.helpLink")}</Link>
          </div>
          <div className="score-display">
            <strong>{scoreLabel}</strong>
            <span>{t("home.trust.score")}</span>
          </div>
          <dl className="dashboard-facts">
            <div>
              <dt>{t("reliability.completedLoans")}</dt>
              <dd>{completedLoans}</dd>
            </div>
            <div>
              <dt>{t("reliability.penalties")}</dt>
              <dd>{reliabilityScore?.recentPenaltySummary.length ?? 0}</dd>
            </div>
          </dl>
        </section>

        <section className="dashboard-panel" aria-labelledby="home-actions-title">
          <h2 id="home-actions-title">{t("home.actions.title")}</h2>
          <div className="dashboard-actions">
            <Link className="primary-button button-link" to="/items/new">
              {t("home.actions.addItem")}
            </Link>
            <Link className="secondary-button button-link" to="/browse">
              {t("home.actions.browse")}
            </Link>
            <Link className="secondary-button button-link" to="/requests">
              {t("home.actions.requests")}
            </Link>
            <Link className="secondary-button button-link" to="/notifications">
              {t("home.actions.notifications")}
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}

function getLoanRole(loan: LoanSummary, userId: string | undefined, t: ReturnType<typeof useI18n>["t"]): string {
  if (loan.ownerId === userId) {
    return t("home.role.lender");
  }

  return t("home.role.borrower");
}
