import { NextResponse } from "next/server";
import { categorizeRecipes } from "@/lib/ai/categorizeRecipes";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
    }

    const { data: recipes } = await supabase
      .from("recipes")
      .select("id,title")
      .eq("user_id", user.id);

    if (!recipes || recipes.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    const categoryMap = await categorizeRecipes(recipes);

    await Promise.all(
      Object.entries(categoryMap).map(([id, category]) =>
        supabase.from("recipes").update({ category }).eq("id", id).eq("user_id", user.id),
      ),
    );

    return NextResponse.json({ updated: Object.keys(categoryMap).length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
