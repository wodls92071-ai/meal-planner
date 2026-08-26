import { NextResponse } from "next/server";
import { toCoupangAffiliateLinks } from "@/lib/shopping/coupangDeeplink";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { urls } = await request.json();
  if (!Array.isArray(urls)) {
    return NextResponse.json({ error: "urls 배열이 필요해요." }, { status: 400 });
  }

  const links = await toCoupangAffiliateLinks(urls);
  return NextResponse.json({ links });
}
