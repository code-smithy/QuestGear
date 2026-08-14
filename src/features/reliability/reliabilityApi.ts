import { supabase } from "@/lib/supabase";
import type { ReliabilityConfidence, ReliabilityScore } from "@/features/reliability/reliabilitySchema";

type ReliabilityScoreRow = {
  user_id: string;
  borrower_score: number;
  lender_score: number;
  combined_score: number;
  completed_as_borrower: number;
  completed_as_lender: number;
  borrower_review_average: number | null;
  lender_review_average: number | null;
  borrower_review_count: number;
  lender_review_count: number;
  confidence: ReliabilityConfidence;
  recent_penalty_summary: Array<{ role: "borrower" | "lender"; event_type: string; points: number }> | null;
  calculated_at: string;
};

export async function getReliabilityScore(userId: string): Promise<ReliabilityScore | null> {
  const { data, error } = await supabase
    .from("reliability_scores")
    .select(
      [
        "user_id",
        "borrower_score",
        "lender_score",
        "combined_score",
        "completed_as_borrower",
        "completed_as_lender",
        "borrower_review_average",
        "lender_review_average",
        "borrower_review_count",
        "lender_review_count",
        "confidence",
        "recent_penalty_summary",
        "calculated_at"
      ].join(",")
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load reliability score.");
  }

  return data ? mapReliabilityScore(data as unknown as ReliabilityScoreRow) : null;
}

function mapReliabilityScore(row: ReliabilityScoreRow): ReliabilityScore {
  return {
    userId: row.user_id,
    borrowerScore: row.borrower_score,
    lenderScore: row.lender_score,
    combinedScore: row.combined_score,
    completedAsBorrower: row.completed_as_borrower,
    completedAsLender: row.completed_as_lender,
    borrowerReviewAverage: row.borrower_review_average,
    lenderReviewAverage: row.lender_review_average,
    borrowerReviewCount: row.borrower_review_count,
    lenderReviewCount: row.lender_review_count,
    confidence: row.confidence,
    recentPenaltySummary: (row.recent_penalty_summary ?? []).map((entry) => ({
      role: entry.role,
      eventType: entry.event_type,
      points: entry.points
    })),
    calculatedAt: row.calculated_at
  };
}
