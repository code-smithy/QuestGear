import { z } from "zod";

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
  "borrower_receipt_confirmed"
] as const;

export type LoanStatus = (typeof loanStatuses)[number];
export type LoanEventType = (typeof loanEventTypes)[number];

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
  createdAt: string;
  updatedAt: string;
  ownerDisplayName: string | null;
  borrowerDisplayName: string | null;
  itemTitles: string[];
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
};

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
