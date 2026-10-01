import { NextResponse } from "next/server";
import { CoupangError, fetchReviewImages } from "@/lib/coupang/reviewImages";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { url } = await request.json().catch(() => ({}));
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "링크를 입력해 주세요." }, { status: 400 });
  }

  try {
    const result = await fetchReviewImages(url);
    return NextResponse.json(result);
  } catch (e) {
    const msg =
      e instanceof CoupangError ? e.message : "리뷰를 불러오는 중 문제가 생겼어요.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
