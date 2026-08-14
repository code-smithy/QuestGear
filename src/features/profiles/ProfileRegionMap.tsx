import type { PublicProfileLocation } from "@/features/profiles/profileSchema";
import {
  getOpenStreetMapEmbedUrl,
  getOpenStreetMapMarkerUrl,
  getOpenStreetMapSearchUrl
} from "@/features/profiles/profileMapUrls";
import { useI18n } from "@/lib/i18n/useI18n";

type ProfileRegionMapProps = {
  location: PublicProfileLocation;
};

export function ProfileRegionMap({ location }: ProfileRegionMapProps) {
  const { t } = useI18n();
  const coordinates = getPublicCoordinates(location);

  if (!coordinates) {
    return (
      <a
        className="osm-search-link"
        href={getOpenStreetMapSearchUrl(location.publicRegion)}
        target="_blank"
        rel="noreferrer"
      >
        {t("profile.openRegionMap")}
      </a>
    );
  }

  return (
    <div className="profile-map" aria-label={t("profile.regionMap")}>
      <iframe
        title={`${t("profile.regionMap")} - ${location.publicRegion}`}
        src={getOpenStreetMapEmbedUrl(coordinates.lat, coordinates.lng)}
        loading="lazy"
      />
      <a href={getOpenStreetMapMarkerUrl(coordinates.lat, coordinates.lng)} target="_blank" rel="noreferrer">
        {t("profile.openRegionMap")}
      </a>
    </div>
  );
}

function getPublicCoordinates(location: PublicProfileLocation): { lat: number; lng: number } | null {
  if (typeof location.regionCenterLat !== "number" || typeof location.regionCenterLng !== "number") {
    return null;
  }

  return {
    lat: location.regionCenterLat,
    lng: location.regionCenterLng
  };
}
