import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getOwnProfile } from "@/features/profiles/profileApi";
import type { Profile } from "@/features/profiles/profileSchema";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/useI18n";
import { AuthContext, type AuthContextValue } from "@/features/auth/authContext";
import type { TranslationKey } from "@/lib/i18n/translations";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const { setLocale } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<TranslationKey | null>(null);

  const loadProfile = useCallback(
    async (user: User | null) => {
      if (!user) {
        setProfile(null);
        setProfileError(null);
        return;
      }

      try {
        const loadedProfile = await getOwnProfile(user.id);
        setProfile(loadedProfile);
        setProfileError(null);

        if (loadedProfile) {
          setLocale(loadedProfile.preferredLocale);
        }
      } catch {
        setProfile(null);
        setProfileError("auth.profileLoadError");
      }
    },
    [setLocale]
  );

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user ?? null);
  }, [loadProfile, session?.user]);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setSession(data.session);
      await loadProfile(data.session?.user ?? null);
      setIsLoading(false);
    }

    void restoreSession();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [loadProfile]);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      profileError,
      refreshProfile,
      signOut
    }),
    [isLoading, profile, profileError, refreshProfile, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
