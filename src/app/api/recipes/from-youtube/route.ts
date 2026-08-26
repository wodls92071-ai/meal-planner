import { NextResponse } from "next/server";
import { extractRecipeFromYoutube } from "@/lib/ai/generateRecipe";

export async function POST(request: Request) {
  const { url } = await request.json();
  if (!url || typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "유튜브 링크를 입력해주세요." }, { status: 400 });
  }

  try {
    const recipe = await extractRecipeFromYoutube(url);
    return NextResponse.json({ recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
