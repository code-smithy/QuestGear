import {
  formatLoanDateTime,
  getDefaultLoanRequestFormValues,
  getReminderDueAt,
  isLoanOverdue,
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

  it("calculates advance reminders after activation", () => {
    expect(
      getReminderDueAt("2026-08-20T18:00:00.000Z", 2, "2026-08-17T18:00:00.000Z")
    ).toBe("2026-08-18T18:00:00.000Z");
    expect(
      getReminderDueAt("2026-08-20T18:00:00.000Z", 5, "2026-08-17T18:00:00.000Z")
    ).toBe("2026-08-17T18:00:00.000Z");
  });

  it("derives overdue state only until return submission", () => {
    expect(
      isLoanOverdue(
        {
          dueAt: "2026-08-20T18:00:00.000Z",
          status: "active",
          returnSubmittedAt: null
        },
        new Date("2026-08-21T18:00:00.000Z")
      )
    ).toBe(true);
    expect(
      isLoanOverdue(
        {
          dueAt: "2026-08-20T18:00:00.000Z",
          status: "return_pending",
          returnSubmittedAt: "2026-08-21T12:00:00.000Z"
        },
        new Date("2026-08-22T18:00:00.000Z")
      )
    ).toBe(false);
  });
});
