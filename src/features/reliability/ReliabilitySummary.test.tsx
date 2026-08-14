import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ReliabilitySummary } from "@/features/reliability/ReliabilitySummary";
import type { ReliabilityScore } from "@/features/reliability/reliabilitySchema";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

describe("ReliabilitySummary", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows New instead of a numeric score for fewer than three completed loans", () => {
    renderSummary({
      completedAsBorrower: 1,
      completedAsLender: 1,
      confidence: "new",
      combinedScore: 95
    });

    expect(screen.getAllByText("Neu")[0]).toBeInTheDocument();
    expect(screen.queryByText("95")).not.toBeInTheDocument();
  });

  it("shows numeric scores for established users", () => {
    renderSummary({
      completedAsBorrower: 3,
      completedAsLender: 2,
      confidence: "low",
      combinedScore: 88
    });

    expect(screen.getByText("88")).toBeInTheDocument();
    expect(screen.getByText("Niedrig")).toBeInTheDocument();
  });
});

function renderSummary(overrides: Partial<ReliabilityScore>) {
  const score: ReliabilityScore = {
    userId: "user-1",
    borrowerScore: 90,
    lenderScore: 85,
    combinedScore: 88,
    completedAsBorrower: 3,
    completedAsLender: 2,
    borrowerReviewAverage: 4.5,
    lenderReviewAverage: 4.2,
    borrowerReviewCount: 2,
    lenderReviewCount: 1,
    confidence: "low",
    recentPenaltySummary: [],
    calculatedAt: "2026-08-14T00:00:00Z",
    ...overrides
  };

  render(
    <I18nProvider>
      <MemoryRouter>
        <ReliabilitySummary score={score} />
      </MemoryRouter>
    </I18nProvider>
  );
}
