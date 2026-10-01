import { NextResponse } from "next/server";
import { isAllowedImageHost } from "@/lib/coupang/reviewImages";
import { createClient } from "@/lib/supabase/server";

// 브라우저에서 쿠팡 CDN 이미지를 직접 저장하면 CORS로 막히므로 서버가 대신 받아서 내려준다.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const src = searchParams.get("url") ?? "";
  const name = (searchParams.get("name") ?? "review.jpg").replace(/[^\w.-]/g, "_");

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return NextResponse.json({ error: "잘못된 주소예요." }, { status: 400 });
  }
  if (target.protocol !== "https:" || !isAllowedImageHost(target.hostname)) {
    return NextResponse.json({ error: "허용되지 않는 주소예요." }, { status: 400 });
  }

  const res = await fetch(target, {
    headers: { Referer: "https://www.coupang.com/" },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "이미지를 받지 못했어요." }, { status: 502 });
  }
  const type = res.headers.get("content-type") ?? "image/jpeg";
  if (!type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지가 아니에요." }, { status: 400 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
