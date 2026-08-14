import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { createLoanRequest } from "@/features/loans/loanApi";
import {
  getDefaultLoanRequestFormValues,
  loanRequestFormSchema,
  type LoanRequestFormValues
} from "@/features/loans/loanSchema";
import { useI18n } from "@/lib/i18n/useI18n";
import type { TranslationKey } from "@/lib/i18n/translations";

type LoanRequestPanelProps = {
  itemId: string;
  isRequestable: boolean;
};

export function LoanRequestPanel({ itemId, isRequestable }: LoanRequestPanelProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<LoanRequestFormValues>({
    resolver: zodResolver(loanRequestFormSchema),
    defaultValues: getDefaultLoanRequestFormValues()
  });

  async function onSubmit(values: LoanRequestFormValues) {
    setSubmitError(null);

    try {
      const loanId = await createLoanRequest({
        itemIds: [itemId],
        startsAt: new Date(values.startsAt).toISOString(),
        dueAt: new Date(values.dueAt).toISOString(),
        note: values.note
      });
      void navigate(`/loans/${loanId}`);
    } catch {
      setSubmitError(t("loan.requestSaveError"));
    }
  }

  if (!isRequestable) {
    return null;
  }

  return (
    <section className="loan-request-panel" aria-labelledby="loan-request-title">
      <h2 id="loan-request-title">{t("loan.requestTitle")}</h2>
      {submitError ? <p className="alert" role="alert">{submitError}</p> : null}
      <form className="compact-form" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
        <label>
          <span>{t("loan.startsAt")}</span>
          <input type="datetime-local" {...register("startsAt")} />
          <FieldError message={errors.startsAt?.message} />
        </label>
        <label>
          <span>{t("loan.dueAt")}</span>
          <input type="datetime-local" {...register("dueAt")} />
          <FieldError message={errors.dueAt?.message} />
        </label>
        <label className="full-width">
          <span>{t("loan.note")}</span>
          <textarea rows={4} {...register("note")} />
          <FieldError message={errors.note?.message} />
        </label>
        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? t("loan.requestSaving") : t("loan.requestSubmit")}
        </button>
      </form>
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  const { t } = useI18n();

  if (!message) {
    return null;
  }

  return <span className="field-error">{t(message as TranslationKey)}</span>;
}
