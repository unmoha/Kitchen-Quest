import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { ProfileXpCard } from "@/components/profile/profile-xp-card";
import { ProfileAchievementsCard } from "@/components/profile/profile-achievements-card";
import { ProfileStreakCard } from "@/components/daily-challenges/profile-streak-card";
import { getUserAchievementsSummaryQuery } from "@/features/achievements/queries";
import { getUserLevelInfoQuery } from "@/features/xp-levels/queries";
import { getUserStreakQuery } from "@/features/daily-challenges/queries";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { PageIntro } from "@/components/layout/page-intro";
import { SupabaseSetupNotice } from "@/components/auth/supabase-setup-notice";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/page-states";
import { signOut } from "@/app/profile/actions";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const [params] = await Promise.all([searchParams]);
  if (!getSupabasePublicConfig()) {
    return <AuthPageShell><SupabaseSetupNotice /></AuthPageShell>;
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth/login?next=%2Fprofile");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <AuthPageShell><SupabaseSetupNotice /></AuthPageShell>;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return (
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
        <ErrorState message="We couldn't load your profile. Please refresh or sign in again." />
      </main>
    );
  }

  const [levelInfo, achievementsSummary, streakInfo] = await Promise.all([
    getUserLevelInfoQuery(user.id),
    getUserAchievementsSummaryQuery(user.id),
    getUserStreakQuery(user.id),
  ]);

  const memberSince = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(profile.created_at));

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
      <PageIntro
        description="Your account details are private and can only be changed by you."
        eyebrow="Your kitchen profile"
        title={`Welcome, ${profile.display_name}.`}
      />
      <div className="mt-8 max-w-3xl space-y-6">
        <div className="rounded-lg border border-[#e7e3d9] bg-white p-5 sm:p-8">
          {params.error === "sign-out" ? <div className="mb-5"><ErrorState message="We couldn't sign you out. Check your connection and try again." /></div> : null}
          <dl className="grid gap-4 border-b border-[#eeece5] pb-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">Email</dt>
              <dd className="mt-1 break-all text-sm font-medium text-[#254235]">{user.email ?? "Not available"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[#59675c]">Member since</dt>
              <dd className="mt-1 text-sm font-medium text-[#254235]">{memberSince}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <ProfileStreakCard streak={streakInfo} />
          </div>
          <ProfileXpCard levelInfo={levelInfo} />
          {achievementsSummary && (
            <div className="mt-6 border-t border-[#eeece5] pt-6">
              <ProfileAchievementsCard summary={achievementsSummary} />
            </div>
          )}
          <div className="mt-6 border-t border-[#eeece5] pt-6">
            <ProfileEditor displayName={profile.display_name} />
          </div>
          <form action={signOut} className="mt-7 border-t border-[#eeece5] pt-5">
            <Button className="w-full sm:w-auto" type="submit" variant="secondary">Sign out</Button>
          </form>
        </div>
      </div>
    </main>
  );
}