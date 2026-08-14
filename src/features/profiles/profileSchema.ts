import { z } from "zod";
import { defaultCurrency, supportedCurrencies, type SupportedCurrency } from "@/lib/currency";
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
  preferredLocale: z.enum(locales),
  preferredCurrency: z.enum(supportedCurrencies),
  locations: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().trim().min(1, "profile.validation.locationLabel").max(80, "profile.validation.locationLabel"),
        privateAddress: z.string().trim().max(500, "profile.validation.locationAddress").optional(),
        mapUrl: z.string().trim().url("profile.validation.locationMapUrl").max(1000).optional().or(z.literal("")),
        publicRegion: z.string().trim().min(1, "profile.validation.locationRegion").max(100, "profile.validation.locationRegion"),
        regionCenterLat: z.preprocess(
          (value) => (value === "" || value === undefined ? "" : Number(value)),
          z.number().min(-90).max(90).or(z.literal(""))
        ),
        regionCenterLng: z.preprocess(
          (value) => (value === "" || value === undefined ? "" : Number(value)),
          z.number().min(-180).max(180).or(z.literal(""))
        ),
        isDefault: z.boolean()
      })
    )
    .max(10)
    .default([])
})
.superRefine((values, context) => {
  if (values.locations.length === 0) {
    return;
  }

  const defaultCount = values.locations.filter((location) => location.isDefault).length;
  if (defaultCount !== 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "profile.validation.locationDefault",
      path: ["locations"]
    });
  }
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export type ProfileLocation = {
  id: string;
  label: string;
  privateAddress: string | null;
  mapUrl: string | null;
  publicRegion: string;
  regionCenterLat: number | "";
  regionCenterLng: number | "";
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

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
  preferredCurrency: SupportedCurrency;
  locations: ProfileLocation[];
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
    preferredLocale: profile.preferredLocale,
    preferredCurrency: profile.preferredCurrency,
    locations: profile.locations.map((location) => ({
      id: location.id,
      label: location.label,
      privateAddress: location.privateAddress ?? "",
      mapUrl: location.mapUrl ?? "",
      publicRegion: location.publicRegion,
      regionCenterLat: location.regionCenterLat ?? "",
      regionCenterLng: location.regionCenterLng ?? "",
      isDefault: location.isDefault
    }))
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
    preferredLocale: options.locale,
    preferredCurrency: defaultCurrency,
    locations: []
  };
}

export function getDefaultProfileLocation(publicRegion = ""): ProfileFormValues["locations"][number] {
  return {
    label: "",
    privateAddress: "",
    mapUrl: "",
    publicRegion,
    regionCenterLat: "",
    regionCenterLng: "",
    isDefault: true
  };
}
