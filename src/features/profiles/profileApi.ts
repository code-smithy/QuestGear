import { supabase } from "@/lib/supabase";
import type { SupportedCurrency } from "@/lib/currency";
import type { Locale } from "@/lib/i18n/translations";
import type { Profile, ProfileFormValues, PublicProfile } from "@/features/profiles/profileSchema";

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  country_code: string | null;
  public_region: string | null;
  time_zone: string;
  reminder_lead_days: number;
  browser_push_enabled: boolean;
  account_status: "active" | "suspended" | "deleted";
  preferred_locale: Locale;
  preferred_currency: SupportedCurrency;
  created_at: string;
  updated_at: string;
};

const publicProfileColumns = [
  "id",
  "display_name",
  "avatar_url",
  "bio",
  "public_region",
  "account_status",
  "created_at"
].join(",");

const ownProfileColumns = [
  publicProfileColumns,
  "country_code",
  "time_zone",
  "reminder_lead_days",
  "browser_push_enabled",
  "preferred_locale",
  "preferred_currency",
  "updated_at"
].join(",");

export async function getOwnProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(ownProfileColumns)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load profile.");
  }

  return data ? mapProfile(data as unknown as ProfileRow) : null;
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(publicProfileColumns)
    .eq("id", userId)
    .eq("account_status", "active")
    .maybeSingle();

  if (error) {
    throw new Error("Could not load public profile.");
  }

  return data ? mapPublicProfile(data as unknown as ProfileRow) : null;
}

export async function saveOwnProfile(userId: string, values: ProfileFormValues): Promise<Profile> {
  const payload = {
    id: userId,
    display_name: values.displayName.trim(),
    bio: normalizeOptional(values.bio),
    country_code: normalizeOptional(values.countryCode)?.toUpperCase() ?? null,
    public_region: normalizeOptional(values.publicRegion),
    time_zone: values.timeZone.trim(),
    reminder_lead_days: values.reminderLeadDays,
    browser_push_enabled: values.browserPushEnabled,
    preferred_locale: values.preferredLocale,
    preferred_currency: values.preferredCurrency
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(ownProfileColumns)
    .single();

  if (error) {
    throw new Error("Could not save profile.");
  }

  return mapProfile(data as unknown as ProfileRow);
}

function normalizeOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    countryCode: row.country_code,
    publicRegion: row.public_region,
    timeZone: row.time_zone,
    reminderLeadDays: row.reminder_lead_days,
    browserPushEnabled: row.browser_push_enabled,
    accountStatus: row.account_status,
    preferredLocale: row.preferred_locale,
    preferredCurrency: row.preferred_currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPublicProfile(row: ProfileRow): PublicProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    publicRegion: row.public_region,
    accountStatus: row.account_status,
    createdAt: row.created_at
  };
}
