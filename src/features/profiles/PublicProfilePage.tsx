import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicProfile } from "@/features/profiles/profileApi";
import { ProfileRegionMap } from "@/features/profiles/ProfileRegionMap";
import type { PublicProfile, PublicProfileLocation } from "@/features/profiles/profileSchema";
import { ReliabilitySummary } from "@/features/reliability/ReliabilitySummary";
import { getReliabilityScore } from "@/features/reliability/reliabilityApi";
import type { ReliabilityScore } from "@/features/reliability/reliabilitySchema";
import { useI18n } from "@/lib/i18n/useI18n";

export function PublicProfilePage() {
  const { t } = useI18n();
  const { userId } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reliabilityScore, setReliabilityScore] = useState<ReliabilityScore | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!userId) {
        setStatus("missing");
        return;
      }

      try {
        const [loadedProfile, loadedReliabilityScore] = await Promise.all([
          getPublicProfile(userId),
          getReliabilityScore(userId).catch(() => null)
        ]);

        if (!isMounted) {
          return;
        }

        setProfile(loadedProfile);
        setReliabilityScore(loadedReliabilityScore);
        setStatus(loadedProfile ? "ready" : "missing");
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (status === "loading") {
    return <p role="status">{t("profile.loading")}</p>;
  }

  if (status === "error") {
    return <p role="alert">{t("profile.loadError")}</p>;
  }

  if (!profile) {
    return <p role="status">{t("profile.notFound")}</p>;
  }

  const publicLocations = getPublicLocations(profile);

  return (
    <section className="page-section" aria-labelledby="profile-title">
      <div className="profile-heading">
        {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="avatar" /> : null}
        <div>
          <p className="eyebrow">{t("profile.eyebrow")}</p>
          <h1 id="profile-title">{profile.displayName}</h1>
          <p className="page-intro">{profile.publicRegion ?? t("profile.noRegion")}</p>
        </div>
      </div>
      {profile.bio ? <p>{profile.bio}</p> : null}
      <dl className="profile-facts">
        <div>
          <dt>{t("profile.memberSince")}</dt>
          <dd>{new Date(profile.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>
      <section className="profile-regions" aria-labelledby="profile-regions-title">
        <div>
          <h2 id="profile-regions-title">{t("profile.publicRegions")}</h2>
          <p>{t("profile.publicRegionsIntro")}</p>
        </div>
        {publicLocations.length === 0 ? (
          <p role="status">{t("profile.noPublicLocations")}</p>
        ) : (
          <ul className="profile-region-list">
            {publicLocations.map((location) => (
              <li key={location.id}>
                <div className="profile-region-heading">
                  <strong>{location.publicRegion}</strong>
                  {location.isDefault ? <span className="status-pill">{t("profile.defaultRegion")}</span> : null}
                </div>
                <ProfileRegionMap location={location} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <ReliabilitySummary score={reliabilityScore} />
    </section>
  );
}

function getPublicLocations(profile: PublicProfile): PublicProfileLocation[] {
  if (profile.locations.length > 0) {
    return profile.locations;
  }

  if (!profile.publicRegion) {
    return [];
  }

  return [
    {
      id: `profile-region-${profile.id}`,
      publicRegion: profile.publicRegion,
      regionCenterLat: "",
      regionCenterLng: "",
      isDefault: true,
      sortOrder: 0
    }
  ];
}
