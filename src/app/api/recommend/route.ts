import { NextResponse } from "next/server";
import { recommendWeek } from "@/lib/ai/recommendWeek";
import { createClient } from "@/lib/supabase/server";
import { profileToPromptText } from "@/lib/profile";
import type { Profile } from "@/types/database";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
    }

    const [{ data: profile }, { data: recipes }, { data: pastPlans }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("recipes")
          .select("id,title,is_favorite")
          .eq("user_id", user.id),
        supabase.from("meal_plans").select("recipe_id").eq("user_id", user.id),
      ]);

    const usageCount = new Map<string, number>();
    for (const p of pastPlans ?? []) {
      usageCount.set(p.recipe_id, (usageCount.get(p.recipe_id) ?? 0) + 1);
    }

    const ranked = (recipes ?? [])
      .map((r) => ({ ...r, count: usageCount.get(r.id) ?? 0 }))
      .sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite) || b.count - a.count)
      .slice(0, 20);

    const savedRecipesText =
      ranked.length > 0
        ? `사용자가 이미 저장해둔 레시피 (즐겨찾기/자주 만든 순, recipe_id로 재사용 가능):\n${ranked
            .map(
              (r) =>
                `- ${r.is_favorite ? "⭐ " : ""}${r.title} (recipe_id: ${r.id}${r.count > 0 ? `, ${r.count}회 만듦` : ""})`,
            )
            .join("\n")}`
        : "사용자가 저장해둔 레시피가 아직 없습니다. 전부 새로 만들어주세요.";

    const dishes = await recommendWeek(
      profileToPromptText((profile as Profile) ?? null),
      savedRecipesText,
    );
    return NextResponse.json({ dishes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
