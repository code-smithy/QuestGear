import { z } from "zod";
import type { LoanReview } from "@/features/reviews/reviewSchema";

export const loanStatuses = [
  "requested",
  "countered",
  "approved",
  "active",
  "rejected",
  "cancelled",
  "return_pending",
  "completed",
  "disputed"
] as const;

export const loanEventTypes = [
  "requested",
  "approved",
  "rejected",
  "countered",
  "cancelled",
  "lender_handover_confirmed",
  "borrower_receipt_confirmed",
  "handover_completed",
  "extension_requested",
  "extension_approved",
  "extension_rejected",
  "return_submitted",
  "return_accepted",
  "return_disputed",
  "due_reminder",
  "due_reached",
  "overdue"
] as const;

export type LoanStatus = (typeof loanStatuses)[number];
export type LoanEventType = (typeof loanEventTypes)[number];
export type ExtensionRequestStatus = "pending" | "approved" | "rejected" | "superseded";

export const loanRequestFormSchema = z
  .object({
    startsAt: z.string().min(1, "loan.validation.startsAtRequired"),
    dueAt: z.string().min(1, "loan.validation.dueAtRequired"),
    note: z.string().trim().max(2000, "loan.validation.noteMax").optional()
  })
  .refine((values) => new Date(values.startsAt).getTime() < new Date(values.dueAt).getTime(), {
    message: "loan.validation.dateOrder",
    path: ["dueAt"]
  });

export type LoanRequestFormValues = z.infer<typeof loanRequestFormSchema>;

export type LoanSummary = {
  id: string;
  ownerId: string;
  borrowerId: string;
  status: LoanStatus;
  startsAt: string;
  dueAt: string;
  note: string | null;
  lenderHandoverConfirmedAt: string | null;
  borrowerReceiptConfirmedAt: string | null;
  activatedAt: string | null;
  returnSubmittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ownerDisplayName: string | null;
  borrowerDisplayName: string | null;
  itemTitles: string[];
};

export type LoanExtensionRequest = {
  id: string;
  requestedBy: string;
  requestedDueAt: string;
  reason: string | null;
  status: ExtensionRequestStatus;
  createdAt: string;
  respondedAt: string | null;
};

export type LoanConditionReport = {
  id: string;
  reportType: "handover" | "return";
  createdBy: string;
  conditionNote: string | null;
  damageNote: string | null;
  missingContentNote: string | null;
  claimedEventAt: string | null;
  createdAt: string;
};

export type LoanEvent = {
  id: string;
  eventType: LoanEventType;
  actorId: string | null;
  createdAt: string;
  eventData: Record<string, unknown>;
};

export type LoanDetail = LoanSummary & {
  items: Array<{
    id: string;
    itemId: string;
    itemTitle: string;
    itemSnapshot: Record<string, unknown>;
  }>;
  events: LoanEvent[];
  extensionRequests: LoanExtensionRequest[];
  conditionReports: LoanConditionReport[];
  reviews: LoanReview[];
};

export const extensionRequestFormSchema = z.object({
  requestedDueAt: z.string().min(1, "loan.validation.dueAtRequired"),
  reason: z.string().trim().max(2000, "loan.validation.noteMax").optional()
});

export type ExtensionRequestFormValues = z.infer<typeof extensionRequestFormSchema>;

export const returnSubmissionFormSchema = z.object({
  claimedReturnedAt: z.string().min(1, "loan.validation.returnedAtRequired"),
  allItemsReturned: z.literal(true, {
    errorMap: () => ({ message: "loan.validation.allItemsReturned" })
  }),
  conditionNote: z.string().trim().min(1, "loan.validation.conditionNoteRequired").max(2000, "loan.validation.noteMax"),
  damageNote: z.string().trim().max(2000, "loan.validation.noteMax").optional(),
  missingContentNote: z.string().trim().max(2000, "loan.validation.noteMax").optional()
});

export type ReturnSubmissionFormValues = z.infer<typeof returnSubmissionFormSchema>;

export const disputeReturnFormSchema = z
  .object({
    conditionNote: z.string().trim().max(2000, "loan.validation.noteMax").optional(),
    damageNote: z.string().trim().max(2000, "loan.validation.noteMax").optional(),
    missingContentNote: z.string().trim().max(2000, "loan.validation.noteMax").optional()
  })
  .refine(
    (values) => Boolean(values.conditionNote?.trim() || values.damageNote?.trim() || values.missingContentNote?.trim()),
    {
      message: "loan.validation.disputeNoteRequired",
      path: ["conditionNote"]
    }
  );

export type DisputeReturnFormValues = z.infer<typeof disputeReturnFormSchema>;

export function getDefaultLoanRequestFormValues(): LoanRequestFormValues {
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 1);
  startsAt.setHours(18, 0, 0, 0);

  const dueAt = new Date(startsAt);
  dueAt.setDate(dueAt.getDate() + 7);

  return {
    startsAt: toDateTimeLocalValue(startsAt),
    dueAt: toDateTimeLocalValue(dueAt),
    note: ""
  };
}

export function getDefaultExtensionRequestFormValues(currentDueAt: string): ExtensionRequestFormValues {
  const requestedDueAt = new Date(currentDueAt);
  requestedDueAt.setDate(requestedDueAt.getDate() + 7);

  return {
    requestedDueAt: toDateTimeLocalValue(requestedDueAt),
    reason: ""
  };
}

export function getDefaultReturnSubmissionFormValues(): ReturnSubmissionFormValues {
  return {
    claimedReturnedAt: toDateTimeLocalValue(new Date()),
    allItemsReturned: true,
    conditionNote: "",
    damageNote: "",
    missingContentNote: ""
  };
}

export function getReminderDueAt(dueAt: string, reminderLeadDays: number, activatedAt: string): string | null {
  if (reminderLeadDays <= 0) {
    return null;
  }

  const dueDate = new Date(dueAt);
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - reminderLeadDays);

  const activatedDate = new Date(activatedAt);
  return new Date(Math.max(reminderDate.getTime(), activatedDate.getTime())).toISOString();
}

export function isLoanOverdue(loan: Pick<LoanSummary, "dueAt" | "status"> & { returnSubmittedAt?: string | null }, now = new Date()): boolean {
  return (
    ["active", "return_pending"].includes(loan.status) &&
    new Date(loan.dueAt).getTime() < now.getTime() &&
    !loan.returnSubmittedAt
  );
}

export function toDateTimeLocalValue(value: Date): string {
  const offsetMs = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function formatLoanDateTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
