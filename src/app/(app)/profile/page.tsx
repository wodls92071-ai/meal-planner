import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";
import { SetPasswordRow } from "@/components/SetPasswordRow";
import { signOut } from "@/app/actions";
import type { Profile } from "@/types/database";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-2xl">
          🧑‍🍳
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-bold">{user!.email}</span>
          <span className="text-xs text-muted">
            여기 적어두신 내용은 AI 추천/생성에 자동으로 반영돼요.
          </span>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-card-border rounded-2xl border border-card-border bg-card px-4 shadow-sm">
        <SetPasswordRow />
        <form action={signOut} className="contents">
          <button
            type="submit"
            className="flex w-full items-center justify-between px-1 py-3.5 text-sm transition-colors hover:text-accent"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-base">
                🚪
              </span>
              로그아웃
            </span>
            <span className="text-muted">›</span>
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold">식성 프로필 수정</h2>
        <ProfileForm initial={(profile as Profile) ?? null} />
      </div>
    </div>
  );
}
