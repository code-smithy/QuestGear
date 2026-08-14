import { supabase } from "@/lib/supabase";
import type { ReviewFormValues } from "@/features/reviews/reviewSchema";

export async function submitReview(loanId: string, values: ReviewFormValues): Promise<string> {
  const result = (await supabase.rpc("submit_review", {
    p_loan_id: loanId,
    p_rating_one: values.ratingOne,
    p_rating_two: values.ratingTwo,
    p_rating_three: values.ratingThree,
    p_comment: values.comment?.trim() || null
  })) as { data: unknown; error: unknown };

  if (result.error) {
    throw new Error("Could not submit review.");
  }

  if (typeof result.data === "string") {
    return result.data;
  }

  throw new Error("RPC did not return an id.");
}
