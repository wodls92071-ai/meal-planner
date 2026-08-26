import { NextResponse } from "next/server";
import { searchExternalRecipes } from "@/lib/recipes/foodSafetyApi";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 });
  }

  try {
    const results = await searchExternalRecipes(query);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
