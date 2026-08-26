import { NextResponse } from "next/server";
import { searchYoutubeRecipes } from "@/lib/youtube/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q || !q.trim()) {
    return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
  }

  try {
    const results = await searchYoutubeRecipes(q);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
