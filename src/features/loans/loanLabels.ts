import type { LoanEventType, LoanStatus } from "@/features/loans/loanSchema";
import type { TranslationKey } from "@/lib/i18n/translations";

export const loanStatusLabelKeys: Record<LoanStatus, TranslationKey> = {
  requested: "loan.status.requested",
  countered: "loan.status.countered",
  approved: "loan.status.approved",
  active: "loan.status.active",
  rejected: "loan.status.rejected",
  cancelled: "loan.status.cancelled",
  return_pending: "loan.status.returnPending",
  completed: "loan.status.completed",
  disputed: "loan.status.disputed"
};

export const loanEventLabelKeys: Record<LoanEventType, TranslationKey> = {
  requested: "loan.event.requested",
  approved: "loan.event.approved",
  rejected: "loan.event.rejected",
  countered: "loan.event.countered",
  cancelled: "loan.event.cancelled",
  lender_handover_confirmed: "loan.event.lenderHandoverConfirmed",
  borrower_receipt_confirmed: "loan.event.borrowerReceiptConfirmed"
};
