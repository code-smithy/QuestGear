export type ReliabilityConfidence = "new" | "low" | "medium" | "high";

export type ReliabilityScore = {
  userId: string;
  borrowerScore: number;
  lenderScore: number;
  combinedScore: number;
  completedAsBorrower: number;
  completedAsLender: number;
  borrowerReviewAverage: number | null;
  lenderReviewAverage: number | null;
  borrowerReviewCount: number;
  lenderReviewCount: number;
  confidence: ReliabilityConfidence;
  recentPenaltySummary: Array<{ role: "borrower" | "lender"; eventType: string; points: number }>;
  calculatedAt: string;
};

export function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function calculateBayesianReviewComponent(ratingSum: number, ratingCount: number): number {
  const priorRating = 4;
  const priorWeight = 5;
  const bayesianRating = (ratingSum + priorRating * priorWeight) / (ratingCount + priorWeight);
  return clampScore(bayesianRating * 20);
}

export function calculateAutomaticComponent(points: number[]): number {
  return clampScore(100 + points.reduce((sum, point) => sum + point, 0));
}

export function calculateRoleScore(reviewComponent: number, automaticComponent: number): number {
  return Math.round(0.8 * reviewComponent + 0.2 * automaticComponent);
}

export function calculateCombinedScore(options: {
  borrowerScore: number;
  lenderScore: number;
  completedAsBorrower: number;
  completedAsLender: number;
}): number {
  const total = options.completedAsBorrower + options.completedAsLender;

  if (total === 0) {
    return Math.round((options.borrowerScore + options.lenderScore) / 2);
  }

  if (options.completedAsBorrower === 0) {
    return options.lenderScore;
  }

  if (options.completedAsLender === 0) {
    return options.borrowerScore;
  }

  return Math.round(
    (options.borrowerScore * options.completedAsBorrower + options.lenderScore * options.completedAsLender) / total
  );
}

export function getConfidenceLabel(completedLoans: number): ReliabilityConfidence {
  if (completedLoans <= 2) {
    return "new";
  }

  if (completedLoans <= 5) {
    return "low";
  }

  if (completedLoans <= 14) {
    return "medium";
  }

  return "high";
}

export function getLateReturnPenalty(latenessHours: number): number {
  if (latenessHours <= 12) {
    return 0;
  }

  if (latenessHours <= 48) {
    return -5;
  }

  if (latenessHours <= 96) {
    return -10;
  }

  if (latenessHours <= 168) {
    return -20;
  }

  return -35;
}
