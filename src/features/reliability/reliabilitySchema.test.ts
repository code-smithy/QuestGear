import {
  calculateAutomaticComponent,
  calculateBayesianReviewComponent,
  calculateCombinedScore,
  calculateRoleScore,
  getConfidenceLabel,
  getLateReturnPenalty
} from "@/features/reliability/reliabilitySchema";

describe("reliability score helpers", () => {
  it("uses the Bayesian prior for sparse reviews", () => {
    expect(calculateBayesianReviewComponent(15, 3)).toBe(87.5);
  });

  it("clamps automatic penalties", () => {
    expect(calculateAutomaticComponent([-35, -80])).toBe(0);
  });

  it("weights review and automatic components into a role score", () => {
    expect(calculateRoleScore(90, 80)).toBe(88);
  });

  it("weights combined score by completed role counts", () => {
    expect(
      calculateCombinedScore({
        borrowerScore: 90,
        lenderScore: 70,
        completedAsBorrower: 3,
        completedAsLender: 1
      })
    ).toBe(85);
  });

  it("maps confidence labels from completed loans", () => {
    expect(getConfidenceLabel(0)).toBe("new");
    expect(getConfidenceLabel(5)).toBe("low");
    expect(getConfidenceLabel(14)).toBe("medium");
    expect(getConfidenceLabel(15)).toBe("high");
  });

  it("maps late return penalty thresholds", () => {
    expect(getLateReturnPenalty(12)).toBe(0);
    expect(getLateReturnPenalty(13)).toBe(-5);
    expect(getLateReturnPenalty(72)).toBe(-10);
    expect(getLateReturnPenalty(120)).toBe(-20);
    expect(getLateReturnPenalty(169)).toBe(-35);
  });
});
