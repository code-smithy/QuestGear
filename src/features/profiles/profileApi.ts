import { supabase } from "@/lib/supabase";
import type { SupportedCurrency } from "@/lib/currency";
import type { Locale } from "@/lib/i18n/translations";
import type {
  Profile,
  ProfileFormValues,
  ProfileLocation,
  PublicProfile,
  PublicProfileLocation
} from "@/features/profiles/profileSchema";

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

type ProfileLocationRow = {
  id: string;
  label: string;
  private_address: string | null;
  map_url: string | null;
  public_region: string;
  region_center_lat: number | null;
  region_center_lng: number | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type PublicProfileLocationRow = {
  id: string;
  public_region: string;
  region_center_lat: number | string | null;
  region_center_lng: number | string | null;
  is_default: boolean;
  sort_order: number;
};

type PublicProfileResultRow = Pick<
  ProfileRow,
  "id" | "display_name" | "avatar_url" | "bio" | "public_region" | "account_status" | "created_at"
> & {
  locations: PublicProfileLocationRow[] | null;
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

  if (!data) {
    return null;
  }

  const { data: locationData, error: locationError } = await supabase
    .from("profile_locations")
    .select(
      "id,label,private_address,map_url,public_region,region_center_lat,region_center_lng,is_default,sort_order,created_at,updated_at"
    )
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (locationError) {
    throw new Error("Could not load profile locations.");
  }

  return mapProfile(data as unknown as ProfileRow, ((locationData ?? []) as unknown as ProfileLocationRow[]).map(mapProfileLocation));
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc("get_public_profile", { p_user_id: userId }).maybeSingle();

  if (error) {
    throw new Error("Could not load public profile.");
  }

  return data ? mapPublicProfile(data as unknown as PublicProfileResultRow) : null;
}

export async function saveOwnProfile(userId: string, values: ProfileFormValues): Promise<Profile> {
  void userId;
  const profileResult = (await supabase.rpc("save_own_profile", {
    p_display_name: values.displayName.trim(),
    p_bio: normalizeOptional(values.bio),
    p_country_code: normalizeOptional(values.countryCode)?.toUpperCase() ?? null,
    p_public_region: normalizeOptional(values.publicRegion),
    p_time_zone: values.timeZone.trim(),
    p_reminder_lead_days: values.reminderLeadDays,
    p_browser_push_enabled: values.browserPushEnabled,
    p_preferred_locale: values.preferredLocale,
    p_preferred_currency: values.preferredCurrency
  })) as { data: ProfileRow | null; error: unknown };

  if (profileResult.error || !profileResult.data) {
    throw new Error("Could not save profile.");
  }

  const { error: locationError } = await supabase.rpc("replace_profile_locations", {
    p_locations: values.locations.map((location) => ({
      label: location.label.trim(),
      privateAddress: normalizeOptional(location.privateAddress),
      mapUrl: normalizeOptional(location.mapUrl),
      publicRegion: location.publicRegion.trim(),
      regionCenterLat: location.regionCenterLat === "" ? null : Number(location.regionCenterLat),
      regionCenterLng: location.regionCenterLng === "" ? null : Number(location.regionCenterLng),
      isDefault: location.isDefault
    }))
  });

  if (locationError) {
    throw new Error("Could not save profile locations.");
  }

  return {
    ...mapProfile(profileResult.data, []),
    locations: values.locations.map((location, index) => ({
      id: location.id ?? `pending-${index}`,
      label: location.label.trim(),
      privateAddress: normalizeOptional(location.privateAddress),
      mapUrl: normalizeOptional(location.mapUrl),
      publicRegion: location.publicRegion.trim(),
      regionCenterLat: location.regionCenterLat === "" ? "" : Number(location.regionCenterLat),
      regionCenterLng: location.regionCenterLng === "" ? "" : Number(location.regionCenterLng),
      isDefault: location.isDefault,
      sortOrder: index,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
  };
}

function normalizeOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapProfile(row: ProfileRow, locations: ProfileLocation[]): Profile {
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
    locations,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPublicProfile(row: PublicProfileResultRow): PublicProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    publicRegion: row.public_region,
    accountStatus: row.account_status,
    createdAt: row.created_at,
    locations: (row.locations ?? []).map(mapPublicProfileLocation)
  };
}

function mapProfileLocation(row: ProfileLocationRow): ProfileLocation {
  return {
    id: row.id,
    label: row.label,
    privateAddress: row.private_address,
    mapUrl: row.map_url,
    publicRegion: row.public_region,
    regionCenterLat: row.region_center_lat ?? "",
    regionCenterLng: row.region_center_lng ?? "",
    isDefault: row.is_default,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPublicProfileLocation(row: PublicProfileLocationRow): PublicProfileLocation {
  return {
    id: row.id,
    publicRegion: row.public_region,
    regionCenterLat: normalizeCoordinate(row.region_center_lat),
    regionCenterLng: normalizeCoordinate(row.region_center_lng),
    isDefault: row.is_default,
    sortOrder: row.sort_order
  };
}

function normalizeCoordinate(value: number | string | null): number | "" {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : "";
  }

  return "";
}
