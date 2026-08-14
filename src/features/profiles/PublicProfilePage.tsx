import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicProfile } from "@/features/profiles/profileApi";
import type { PublicProfile } from "@/features/profiles/profileSchema";
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
          getReliabilityScore(userId)
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
      <ReliabilitySummary score={reliabilityScore} />
    </section>
  );
}
