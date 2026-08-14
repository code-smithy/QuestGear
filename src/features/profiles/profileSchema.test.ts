import {
  getDefaultProfileFormValues,
  profileFormSchema
} from "@/features/profiles/profileSchema";

describe("profileFormSchema", () => {
  it("accepts a valid onboarding profile", () => {
    const result = profileFormSchema.safeParse({
      displayName: "Mara",
      bio: "",
      countryCode: "ch",
      publicRegion: "Zurich",
      timeZone: "Europe/Zurich",
      reminderLeadDays: 2,
      browserPushEnabled: false,
      preferredLocale: "de",
      preferredCurrency: "CHF"
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsafe profile values", () => {
    const result = profileFormSchema.safeParse({
      displayName: "M",
      bio: "x".repeat(501),
      countryCode: "CHE",
      publicRegion: "x".repeat(101),
      timeZone: "",
      reminderLeadDays: 31,
      browserPushEnabled: false,
      preferredLocale: "de",
      preferredCurrency: "GBP"
    });

    expect(result.success).toBe(false);
  });
});

describe("getDefaultProfileFormValues", () => {
  it("uses provider metadata and the selected locale", () => {
    expect(getDefaultProfileFormValues({ displayName: " Mara ", locale: "en" })).toMatchObject({
      displayName: "Mara",
      preferredLocale: "en",
      preferredCurrency: "EUR",
      reminderLeadDays: 2
    });
  });
});
