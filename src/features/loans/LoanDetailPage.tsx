import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import {
  acceptReturn,
  approveLoan,
  cancelLoan,
  confirmHandover,
  disputeReturn,
  getLoanDetail,
  rejectLoan,
  requestExtension,
  respondToExtension,
  submitReturn
} from "@/features/loans/loanApi";
import { loanEventLabelKeys, loanStatusLabelKeys } from "@/features/loans/loanLabels";
import {
  disputeReturnFormSchema,
  extensionRequestFormSchema,
  formatLoanDateTime,
  getDefaultExtensionRequestFormValues,
  getDefaultReturnSubmissionFormValues,
  returnSubmissionFormSchema,
  type DisputeReturnFormValues,
  type ExtensionRequestFormValues,
  type LoanDetail,
  type ReturnSubmissionFormValues
} from "@/features/loans/loanSchema";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useI18n } from "@/lib/i18n/useI18n";

export function LoanDetailPage() {
  const { locale, t } = useI18n();
  const { loanId } = useParams();
  const { user } = useAuth();
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const extensionForm = useForm<ExtensionRequestFormValues>({
    resolver: zodResolver(extensionRequestFormSchema),
    defaultValues: { requestedDueAt: "", reason: "" }
  });
  const returnForm = useForm<ReturnSubmissionFormValues>({
    resolver: zodResolver(returnSubmissionFormSchema),
    defaultValues: getDefaultReturnSubmissionFormValues()
  });
  const disputeForm = useForm<DisputeReturnFormValues>({
    resolver: zodResolver(disputeReturnFormSchema),
    defaultValues: { conditionNote: "", damageNote: "", missingContentNote: "" }
  });

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

  useEffect(() => {
    if (loan) {
      extensionForm.reset(getDefaultExtensionRequestFormValues(loan.dueAt));
    }
  }, [extensionForm, loan]);

  async function runAction(action: () => Promise<void>) {
    setActionError(null);

    try {
      await action();
      await loadLoan();
    } catch {
      setActionError(t("loan.actionError"));
    }
  }

  async function submitExtensionRequest(values: ExtensionRequestFormValues) {
    if (!loan) {
      return;
    }

    await runAction(async () => {
      await requestExtension({
        loanId: loan.id,
        requestedDueAt: new Date(values.requestedDueAt).toISOString(),
        reason: values.reason
      });
    });
  }

  async function submitReturnReport(values: ReturnSubmissionFormValues) {
    if (!loan) {
      return;
    }

    await runAction(async () => {
      await submitReturn({
        loanId: loan.id,
        claimedReturnedAt: new Date(values.claimedReturnedAt).toISOString(),
        conditionNote: values.conditionNote,
        damageNote: values.damageNote,
        missingContentNote: values.missingContentNote
      });
      returnForm.reset(getDefaultReturnSubmissionFormValues());
    });
  }

  async function submitReturnDispute(values: DisputeReturnFormValues) {
    if (!loan) {
      return;
    }

    await runAction(async () => {
      await disputeReturn({
        loanId: loan.id,
        conditionNote: values.conditionNote,
        damageNote: values.damageNote,
        missingContentNote: values.missingContentNote
      });
      disputeForm.reset({ conditionNote: "", damageNote: "", missingContentNote: "" });
    });
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

  const isOwner = loan.ownerId === user.id;
  const isBorrower = loan.borrowerId === user.id;
  const pendingExtension = loan.extensionRequests.find((request) => request.status === "pending");
  const canOwnerRespond = isOwner && ["requested", "countered"].includes(loan.status);
  const canCancel =
    [loan.ownerId, loan.borrowerId].includes(user.id) &&
    ["requested", "countered", "approved"].includes(loan.status);
  const canConfirmHandover =
    loan.status === "approved" &&
    ((isOwner && !loan.lenderHandoverConfirmedAt) || (isBorrower && !loan.borrowerReceiptConfirmedAt));
  const canRequestExtension = isBorrower && loan.status === "active";
  const canSubmitReturn = isBorrower && loan.status === "active";
  const canRespondToExtension = isOwner && loan.status === "active" && Boolean(pendingExtension);
  const canResolveReturn = isOwner && loan.status === "return_pending";

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
        {canConfirmHandover ? (
          <button type="button" className="primary-button" onClick={() => void runAction(() => confirmHandover(loan.id))}>
            {isOwner ? t("loan.confirmHandover") : t("loan.confirmReceipt")}
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
        <div>
          <dt>{t("loan.handover")}</dt>
          <dd>{getHandoverSummary(loan, locale, t)}</dd>
        </div>
      </dl>

      {canRespondToExtension && pendingExtension ? (
        <section className="loan-request-panel" aria-labelledby="extension-response-title">
          <h2 id="extension-response-title">{t("loan.extensionResponseTitle")}</h2>
          <dl className="compact-facts">
            <div>
              <dt>{t("loan.requestedDueAt")}</dt>
              <dd>{formatLoanDateTime(pendingExtension.requestedDueAt, locale)}</dd>
            </div>
            {pendingExtension.reason ? (
              <div>
                <dt>{t("loan.extensionReason")}</dt>
                <dd>{pendingExtension.reason}</dd>
              </div>
            ) : null}
          </dl>
          <div className="action-row">
            <button
              type="button"
              className="primary-button"
              onClick={() => void runAction(() => respondToExtension(pendingExtension.id, true))}
            >
              {t("loan.extensionApprove")}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void runAction(() => respondToExtension(pendingExtension.id, false))}
            >
              {t("loan.extensionReject")}
            </button>
          </div>
        </section>
      ) : null}

      {canRequestExtension ? (
        <section className="loan-request-panel" aria-labelledby="extension-request-title">
          <h2 id="extension-request-title">{t("loan.extensionRequestTitle")}</h2>
          <form className="compact-form" onSubmit={(event) => void extensionForm.handleSubmit(submitExtensionRequest)(event)}>
            <label>
              <span>{t("loan.requestedDueAt")}</span>
              <input type="datetime-local" {...extensionForm.register("requestedDueAt")} />
              <FieldError message={extensionForm.formState.errors.requestedDueAt?.message} />
            </label>
            <label>
              <span>{t("loan.extensionReason")}</span>
              <textarea rows={3} {...extensionForm.register("reason")} />
              <FieldError message={extensionForm.formState.errors.reason?.message} />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={extensionForm.formState.isSubmitting}>
                {t("loan.extensionSubmit")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {canSubmitReturn ? (
        <section className="loan-request-panel" aria-labelledby="return-submit-title">
          <h2 id="return-submit-title">{t("loan.returnSubmitTitle")}</h2>
          <form className="compact-form" onSubmit={(event) => void returnForm.handleSubmit(submitReturnReport)(event)}>
            <label>
              <span>{t("loan.returnedAt")}</span>
              <input type="datetime-local" {...returnForm.register("claimedReturnedAt")} />
              <FieldError message={returnForm.formState.errors.claimedReturnedAt?.message} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" {...returnForm.register("allItemsReturned")} />
              <span>{t("loan.allItemsReturned")}</span>
              <FieldError message={returnForm.formState.errors.allItemsReturned?.message} />
            </label>
            <label>
              <span>{t("loan.conditionNote")}</span>
              <textarea rows={3} {...returnForm.register("conditionNote")} />
              <FieldError message={returnForm.formState.errors.conditionNote?.message} />
            </label>
            <label>
              <span>{t("loan.damageNote")}</span>
              <textarea rows={3} {...returnForm.register("damageNote")} />
              <FieldError message={returnForm.formState.errors.damageNote?.message} />
            </label>
            <label>
              <span>{t("loan.missingContentNote")}</span>
              <textarea rows={3} {...returnForm.register("missingContentNote")} />
              <FieldError message={returnForm.formState.errors.missingContentNote?.message} />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={returnForm.formState.isSubmitting}>
                {t("loan.returnSubmit")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {canResolveReturn ? (
        <section className="loan-request-panel" aria-labelledby="return-response-title">
          <h2 id="return-response-title">{t("loan.returnResponseTitle")}</h2>
          <div className="action-row">
            <button type="button" className="primary-button" onClick={() => void runAction(() => acceptReturn(loan.id))}>
              {t("loan.returnAccept")}
            </button>
          </div>
          <form className="compact-form" onSubmit={(event) => void disputeForm.handleSubmit(submitReturnDispute)(event)}>
            <label>
              <span>{t("loan.conditionNote")}</span>
              <textarea rows={3} {...disputeForm.register("conditionNote")} />
              <FieldError message={disputeForm.formState.errors.conditionNote?.message} />
            </label>
            <label>
              <span>{t("loan.damageNote")}</span>
              <textarea rows={3} {...disputeForm.register("damageNote")} />
              <FieldError message={disputeForm.formState.errors.damageNote?.message} />
            </label>
            <label>
              <span>{t("loan.missingContentNote")}</span>
              <textarea rows={3} {...disputeForm.register("missingContentNote")} />
              <FieldError message={disputeForm.formState.errors.missingContentNote?.message} />
            </label>
            <div className="form-actions">
              <button type="submit" className="secondary-button" disabled={disputeForm.formState.isSubmitting}>
                {t("loan.returnDispute")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

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

      {loan.conditionReports.length > 0 ? (
        <section aria-labelledby="loan-reports-title">
          <h2 id="loan-reports-title">{t("loan.conditionReports")}</h2>
          <ul className="data-list">
            {loan.conditionReports.map((report) => (
              <li key={report.id}>
                <strong>{report.createdBy === loan.borrowerId ? t("loan.borrower") : t("loan.owner")}</strong>
                {report.claimedEventAt ? <span>{formatLoanDateTime(report.claimedEventAt, locale)}</span> : null}
                {report.conditionNote ? <p>{report.conditionNote}</p> : null}
                {report.damageNote ? <p>{report.damageNote}</p> : null}
                {report.missingContentNote ? <p>{report.missingContentNote}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function getHandoverSummary(loan: LoanDetail, locale: string, t: (key: TranslationKey) => string): string {
  if (loan.activatedAt) {
    return t("loan.handoverComplete");
  }

  const confirmations = [];
  if (loan.lenderHandoverConfirmedAt) {
    confirmations.push(`${t("loan.owner")}: ${formatLoanDateTime(loan.lenderHandoverConfirmedAt, locale)}`);
  }
  if (loan.borrowerReceiptConfirmedAt) {
    confirmations.push(`${t("loan.borrower")}: ${formatLoanDateTime(loan.borrowerReceiptConfirmedAt, locale)}`);
  }

  return confirmations.length > 0 ? confirmations.join(" / ") : t("loan.handoverOpen");
}

function FieldError({ message }: { message?: string }) {
  const { t } = useI18n();

  if (!message) {
    return null;
  }

  return <span className="field-error">{t(message as TranslationKey)}</span>;
}
