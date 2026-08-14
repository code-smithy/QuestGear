import { supabase } from "@/lib/supabase";
import type {
  ExtensionRequestStatus,
  LoanConditionReport,
  LoanDetail,
  LoanEventType,
  LoanExtensionRequest,
  LoanStatus,
  LoanSummary
} from "@/features/loans/loanSchema";
import type { LoanReview, ReviewerRole } from "@/features/reviews/reviewSchema";

type LoanRow = {
  id: string;
  owner_id: string;
  borrower_id: string;
  status: LoanStatus;
  starts_at: string;
  due_at: string;
  note: string | null;
  lender_handover_confirmed_at: string | null;
  borrower_receipt_confirmed_at: string | null;
  activated_at: string | null;
  return_submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  owner_profile?: { display_name: string } | null;
  borrower_profile?: { display_name: string } | null;
  loan_items?: LoanItemRow[];
  loan_events?: LoanEventRow[];
  loan_extension_requests?: LoanExtensionRequestRow[];
  loan_condition_reports?: LoanConditionReportRow[];
  reviews?: ReviewRow[];
};

type LoanItemRow = {
  id: string;
  item_id: string;
  item_snapshot: Record<string, unknown>;
  items?: { title: string } | null;
};

type LoanEventRow = {
  id: string;
  event_type: LoanEventType;
  actor_id: string | null;
  event_data: Record<string, unknown> | null;
  created_at: string;
};

type LoanExtensionRequestRow = {
  id: string;
  requested_by: string;
  requested_due_at: string;
  reason: string | null;
  status: ExtensionRequestStatus;
  created_at: string;
  responded_at: string | null;
};

type LoanConditionReportRow = {
  id: string;
  report_type: "handover" | "return";
  created_by: string;
  condition_note: string | null;
  damage_note: string | null;
  missing_content_note: string | null;
  claimed_event_at: string | null;
  created_at: string;
};

type ReviewRow = {
  id: string;
  loan_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: ReviewerRole;
  rating_one: number;
  rating_two: number;
  rating_three: number;
  comment: string | null;
  submitted_at: string;
  visible_at: string | null;
};

const loanSelect = [
  "id",
  "owner_id",
  "borrower_id",
  "status",
  "starts_at",
  "due_at",
  "note",
  "lender_handover_confirmed_at",
  "borrower_receipt_confirmed_at",
  "activated_at",
  "return_submitted_at",
  "completed_at",
  "created_at",
  "updated_at",
  "owner_profile:profiles!loans_owner_id_fkey(display_name)",
  "borrower_profile:profiles!loans_borrower_id_fkey(display_name)",
  "loan_items(id,item_id,item_snapshot,items(title))"
].join(",");

const loanDetailSelect = [
  loanSelect,
  "loan_events(id,event_type,actor_id,event_data,created_at)",
  "loan_extension_requests(id,requested_by,requested_due_at,reason,status,created_at,responded_at)",
  "loan_condition_reports(id,report_type,created_by,condition_note,damage_note,missing_content_note,claimed_event_at,created_at)",
  "reviews(id,loan_id,reviewer_id,reviewee_id,reviewer_role,rating_one,rating_two,rating_three,comment,submitted_at,visible_at)"
].join(",");

export async function createLoanRequest(input: {
  itemIds: string[];
  startsAt: string;
  dueAt: string;
  note?: string;
}): Promise<string> {
  const result = (await supabase.rpc("create_loan_request", {
    p_item_ids: input.itemIds,
    p_starts_at: input.startsAt,
    p_due_at: input.dueAt,
    p_note: input.note?.trim() || null
  })) as { data: unknown; error: unknown };

  if (result.error) {
    throw new Error("Could not create loan request.");
  }

  return getRpcId(result.data);
}

export async function listLoansForUser(): Promise<LoanSummary[]> {
  const { data, error } = await supabase
    .from("loans")
    .select(loanSelect)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Could not load loans.");
  }

  return ((data ?? []) as unknown as LoanRow[]).map(mapLoanSummary);
}

export async function getLoanDetail(loanId: string): Promise<LoanDetail | null> {
  const { data, error } = await supabase
    .from("loans")
    .select(loanDetailSelect)
    .eq("id", loanId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load loan.");
  }

  return data ? mapLoanDetail(data as unknown as LoanRow) : null;
}

export async function approveLoan(loanId: string): Promise<void> {
  const { error } = await supabase.rpc("approve_loan", { p_loan_id: loanId });

  if (error) {
    throw new Error("Could not approve loan.");
  }
}

export async function rejectLoan(loanId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc("reject_loan", {
    p_loan_id: loanId,
    p_reason: reason?.trim() || null
  });

  if (error) {
    throw new Error("Could not reject loan.");
  }
}

export async function cancelLoan(loanId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_loan", { p_loan_id: loanId });

  if (error) {
    throw new Error("Could not cancel loan.");
  }
}

export async function confirmHandover(loanId: string): Promise<void> {
  const { error } = await supabase.rpc("confirm_handover", { p_loan_id: loanId });

  if (error) {
    throw new Error("Could not confirm handover.");
  }
}

export async function requestExtension(input: {
  loanId: string;
  requestedDueAt: string;
  reason?: string;
}): Promise<string> {
  const result = (await supabase.rpc("request_extension", {
    p_loan_id: input.loanId,
    p_requested_due_at: input.requestedDueAt,
    p_reason: input.reason?.trim() || null
  })) as { data: unknown; error: unknown };

  if (result.error) {
    throw new Error("Could not request extension.");
  }

  return getRpcId(result.data);
}

export async function respondToExtension(extensionRequestId: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc("respond_to_extension", {
    p_extension_request_id: extensionRequestId,
    p_approve: approve
  });

  if (error) {
    throw new Error("Could not respond to extension.");
  }
}

export async function submitReturn(input: {
  loanId: string;
  claimedReturnedAt: string;
  conditionNote: string;
  damageNote?: string;
  missingContentNote?: string;
}): Promise<string> {
  const result = (await supabase.rpc("submit_return", {
    p_loan_id: input.loanId,
    p_claimed_event_at: input.claimedReturnedAt,
    p_condition_note: input.conditionNote.trim(),
    p_damage_note: input.damageNote?.trim() || null,
    p_missing_content_note: input.missingContentNote?.trim() || null
  })) as { data: unknown; error: unknown };

  if (result.error) {
    throw new Error("Could not submit return.");
  }

  return getRpcId(result.data);
}

export async function acceptReturn(loanId: string): Promise<void> {
  const { error } = await supabase.rpc("accept_return", { p_loan_id: loanId });

  if (error) {
    throw new Error("Could not accept return.");
  }
}

export async function disputeReturn(input: {
  loanId: string;
  conditionNote?: string;
  damageNote?: string;
  missingContentNote?: string;
}): Promise<string> {
  const result = (await supabase.rpc("dispute_return", {
    p_loan_id: input.loanId,
    p_condition_note: input.conditionNote?.trim() || null,
    p_damage_note: input.damageNote?.trim() || null,
    p_missing_content_note: input.missingContentNote?.trim() || null
  })) as { data: unknown; error: unknown };

  if (result.error) {
    throw new Error("Could not dispute return.");
  }

  return getRpcId(result.data);
}

function getRpcId(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  throw new Error("RPC did not return an id.");
}

function mapLoanSummary(row: LoanRow): LoanSummary {
  return {
    id: row.id,
    ownerId: row.owner_id,
    borrowerId: row.borrower_id,
    status: row.status,
    startsAt: row.starts_at,
    dueAt: row.due_at,
    note: row.note,
    lenderHandoverConfirmedAt: row.lender_handover_confirmed_at,
    borrowerReceiptConfirmedAt: row.borrower_receipt_confirmed_at,
    activatedAt: row.activated_at,
    returnSubmittedAt: row.return_submitted_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerDisplayName: row.owner_profile?.display_name ?? null,
    borrowerDisplayName: row.borrower_profile?.display_name ?? null,
    itemTitles: (row.loan_items ?? []).map((entry) => getSnapshotTitle(entry))
  };
}

function mapLoanDetail(row: LoanRow): LoanDetail {
  return {
    ...mapLoanSummary(row),
    items: (row.loan_items ?? []).map((entry) => ({
      id: entry.id,
      itemId: entry.item_id,
      itemTitle: getSnapshotTitle(entry),
      itemSnapshot: entry.item_snapshot
    })),
    events: (row.loan_events ?? [])
      .map((event) => ({
        id: event.id,
        eventType: event.event_type,
        actorId: event.actor_id,
        eventData: event.event_data ?? {},
        createdAt: event.created_at
      }))
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    ,
    extensionRequests: (row.loan_extension_requests ?? [])
      .map(mapLoanExtensionRequest)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    conditionReports: (row.loan_condition_reports ?? [])
      .map(mapLoanConditionReport)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    reviews: (row.reviews ?? [])
      .map(mapReview)
      .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())
  };
}

function mapReview(row: ReviewRow): LoanReview {
  return {
    id: row.id,
    loanId: row.loan_id,
    reviewerId: row.reviewer_id,
    revieweeId: row.reviewee_id,
    reviewerRole: row.reviewer_role,
    ratingOne: row.rating_one,
    ratingTwo: row.rating_two,
    ratingThree: row.rating_three,
    comment: row.comment,
    submittedAt: row.submitted_at,
    visibleAt: row.visible_at
  };
}

function mapLoanExtensionRequest(row: LoanExtensionRequestRow): LoanExtensionRequest {
  return {
    id: row.id,
    requestedBy: row.requested_by,
    requestedDueAt: row.requested_due_at,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at
  };
}

function mapLoanConditionReport(row: LoanConditionReportRow): LoanConditionReport {
  return {
    id: row.id,
    reportType: row.report_type,
    createdBy: row.created_by,
    conditionNote: row.condition_note,
    damageNote: row.damage_note,
    missingContentNote: row.missing_content_note,
    claimedEventAt: row.claimed_event_at,
    createdAt: row.created_at
  };
}

function getSnapshotTitle(entry: LoanItemRow): string {
  if (typeof entry.item_snapshot.title === "string") {
    return entry.item_snapshot.title;
  }

  return entry.items?.title ?? "Untitled item";
}
