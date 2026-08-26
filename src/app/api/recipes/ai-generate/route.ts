import { NextResponse } from "next/server";
import { generateRecipeFromText } from "@/lib/ai/generateRecipe";
import { createClient } from "@/lib/supabase/server";
import { profileToPromptText } from "@/lib/profile";
import type { Profile } from "@/types/database";

export async function POST(request: Request) {
  const { query } = await request.json();
  if (!query || typeof query !== "string" || !query.trim()) {
    return NextResponse.json({ error: "요리 이름을 입력해주세요." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const recipe = await generateRecipeFromText(
      query,
      profileToPromptText((profile as Profile) ?? null),
    );
    return NextResponse.json({ recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
