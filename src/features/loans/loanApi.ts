import { supabase } from "@/lib/supabase";
import type { LoanDetail, LoanEventType, LoanStatus, LoanSummary } from "@/features/loans/loanSchema";

type LoanRow = {
  id: string;
  owner_id: string;
  borrower_id: string;
  status: LoanStatus;
  starts_at: string;
  due_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  owner_profile?: { display_name: string } | null;
  borrower_profile?: { display_name: string } | null;
  loan_items?: LoanItemRow[];
  loan_events?: LoanEventRow[];
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

const loanSelect = [
  "id",
  "owner_id",
  "borrower_id",
  "status",
  "starts_at",
  "due_at",
  "note",
  "created_at",
  "updated_at",
  "owner_profile:profiles!loans_owner_id_fkey(display_name)",
  "borrower_profile:profiles!loans_borrower_id_fkey(display_name)",
  "loan_items(id,item_id,item_snapshot,items(title))"
].join(",");

const loanDetailSelect = `${loanSelect},loan_events(id,event_type,actor_id,event_data,created_at)`;

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
  };
}

function getSnapshotTitle(entry: LoanItemRow): string {
  if (typeof entry.item_snapshot.title === "string") {
    return entry.item_snapshot.title;
  }

  return entry.items?.title ?? "Untitled item";
}
