import { z } from "zod";

export type ReviewerRole = "borrower" | "lender";

export type LoanReview = {
  id: string;
  loanId: string;
  reviewerId: string;
  revieweeId: string;
  reviewerRole: ReviewerRole;
  ratingOne: number;
  ratingTwo: number;
  ratingThree: number;
  comment: string | null;
  submittedAt: string;
  visibleAt: string | null;
};

export const reviewFormSchema = z.object({
  ratingOne: z.coerce.number().int("review.validation.rating").min(1, "review.validation.rating").max(5, "review.validation.rating"),
  ratingTwo: z.coerce.number().int("review.validation.rating").min(1, "review.validation.rating").max(5, "review.validation.rating"),
  ratingThree: z.coerce.number().int("review.validation.rating").min(1, "review.validation.rating").max(5, "review.validation.rating"),
  comment: z.string().trim().max(1000, "review.validation.commentMax").optional()
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export function getDefaultReviewFormValues(): ReviewFormValues {
  return {
    ratingOne: 5,
    ratingTwo: 5,
    ratingThree: 5,
    comment: ""
  };
}
