import { render, screen } from "@testing-library/react";
import { ProfileRegionMap } from "@/features/profiles/ProfileRegionMap";
import { getOpenStreetMapEmbedUrl, getOpenStreetMapSearchUrl } from "@/features/profiles/profileMapUrls";
import type { PublicProfileLocation } from "@/features/profiles/profileSchema";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

describe("ProfileRegionMap", () => {
  it("renders an OpenStreetMap embed when region coordinates are public", () => {
    const location: PublicProfileLocation = {
      id: "location-1",
      publicRegion: "Zurich",
      regionCenterLat: 47.3769,
      regionCenterLng: 8.5417,
      isDefault: true,
      sortOrder: 0
    };

    render(
      <I18nProvider>
        <ProfileRegionMap location={location} />
      </I18nProvider>
    );

    expect(screen.getByTitle("Karte der öffentlichen Region - Zurich")).toHaveAttribute(
      "src",
      getOpenStreetMapEmbedUrl(47.3769, 8.5417)
    );
    expect(screen.getByRole("link", { name: "In OpenStreetMap öffnen" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/?mlat=47.3769&mlon=8.5417#map=12/47.3769/8.5417"
    );
  });

  it("falls back to an OpenStreetMap search link without coordinates", () => {
    const location: PublicProfileLocation = {
      id: "location-1",
      publicRegion: "Basel Stadt",
      regionCenterLat: "",
      regionCenterLng: "",
      isDefault: false,
      sortOrder: 0
    };

    render(
      <I18nProvider>
        <ProfileRegionMap location={location} />
      </I18nProvider>
    );

    expect(screen.getByRole("link", { name: "In OpenStreetMap öffnen" })).toHaveAttribute(
      "href",
      getOpenStreetMapSearchUrl("Basel Stadt")
    );
    expect(screen.queryByTitle(/Karte der öffentlichen Region/)).not.toBeInTheDocument();
  });
});
