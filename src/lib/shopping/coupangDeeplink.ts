import "server-only";
import crypto from "crypto";

const HOST = "https://api-gateway.coupang.com";
const PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";

function signedDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yy = pad(d.getUTCFullYear() % 100);
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

// 일반 coupang.com URL들을 쿠팡파트너스 추적 링크(딥링크)로 일괄 변환한다.
// 계정/키 문제 등으로 실패해도 장보기 리스트 자체는 계속 써야 하므로 에러를
// 던지지 않고, 변환 안 된 항목은 원래 URL 그대로 돌려준다.
export async function toCoupangAffiliateLinks(
  urls: string[],
): Promise<Record<string, string>> {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;
  const fallback: Record<string, string> = {};
  for (const u of urls) fallback[u] = u;

  if (!accessKey || !secretKey || urls.length === 0) return fallback;

  try {
    const datetime = signedDate();
    const message = `${datetime}POST${PATH}`;
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(message)
      .digest("hex");
    const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;

    const res = await fetch(`${HOST}${PATH}`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({ coupangUrls: urls }),
      cache: "no-store",
    });

    if (!res.ok) return fallback;

    const data = await res.json();
    const result: Record<string, string> = { ...fallback };
    for (const item of data.data ?? []) {
      if (item.originalUrl && item.shortenUrl) {
        result[item.originalUrl] = item.shortenUrl;
      }
    }
    return result;
  } catch {
    return fallback;
  }
}
