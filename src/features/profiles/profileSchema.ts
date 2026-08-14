import { z } from "zod";
import { locales } from "@/lib/i18n/translations";

export const profileFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "profile.validation.displayNameMin")
    .max(50, "profile.validation.displayNameMax"),
  bio: z.string().trim().max(500, "profile.validation.bioMax").optional(),
  countryCode: z
    .string()
    .trim()
    .length(2, "profile.validation.countryCode")
    .regex(/^[A-Za-z]{2}$/, "profile.validation.countryCode")
    .optional()
    .or(z.literal("")),
  publicRegion: z.string().trim().max(100, "profile.validation.publicRegionMax").optional(),
  timeZone: z.string().trim().min(1, "profile.validation.timeZoneRequired"),
  reminderLeadDays: z.coerce
    .number()
    .int("profile.validation.reminderLeadDays")
    .min(0, "profile.validation.reminderLeadDays")
    .max(30, "profile.validation.reminderLeadDays"),
  browserPushEnabled: z.boolean(),
  preferredLocale: z.enum(locales)
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export type Profile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  countryCode: string | null;
  publicRegion: string | null;
  timeZone: string;
  reminderLeadDays: number;
  browserPushEnabled: boolean;
  accountStatus: "active" | "suspended" | "deleted";
  preferredLocale: ProfileFormValues["preferredLocale"];
  createdAt: string;
  updatedAt: string;
};

export type PublicProfile = Pick<
  Profile,
  | "id"
  | "displayName"
  | "avatarUrl"
  | "bio"
  | "publicRegion"
  | "accountStatus"
  | "createdAt"
>;

export function toProfileFormValues(profile: Profile): ProfileFormValues {
  return {
    displayName: profile.displayName,
    bio: profile.bio ?? "",
    countryCode: profile.countryCode ?? "",
    publicRegion: profile.publicRegion ?? "",
    timeZone: profile.timeZone,
    reminderLeadDays: profile.reminderLeadDays,
    browserPushEnabled: profile.browserPushEnabled,
    preferredLocale: profile.preferredLocale
  };
}

export function getDefaultProfileFormValues(options: {
  displayName?: string | null;
  locale: ProfileFormValues["preferredLocale"];
}): ProfileFormValues {
  return {
    displayName: options.displayName?.trim() || "",
    bio: "",
    countryCode: "",
    publicRegion: "",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Zurich",
    reminderLeadDays: 2,
    browserPushEnabled: false,
    preferredLocale: options.locale
  };
}
