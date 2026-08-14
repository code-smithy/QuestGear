import {
  formatLoanDateTime,
  getDefaultLoanRequestFormValues,
  loanRequestFormSchema
} from "@/features/loans/loanSchema";

describe("loanRequestFormSchema", () => {
  it("accepts a valid date proposal", () => {
    const result = loanRequestFormSchema.safeParse({
      startsAt: "2026-08-15T18:00",
      dueAt: "2026-08-20T18:00",
      note: "Weekend session"
    });

    expect(result.success).toBe(true);
  });

  it("rejects a due date before the start", () => {
    const result = loanRequestFormSchema.safeParse({
      startsAt: "2026-08-20T18:00",
      dueAt: "2026-08-15T18:00",
      note: ""
    });

    expect(result.success).toBe(false);
  });
});

describe("loan date helpers", () => {
  it("creates default local datetime values", () => {
    expect(getDefaultLoanRequestFormValues().startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("formats ISO timestamps for display", () => {
    expect(formatLoanDateTime("2026-08-15T18:00:00.000Z", "en")).toContain("2026");
  });
});
