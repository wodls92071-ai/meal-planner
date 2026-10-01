import "server-only";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "ko-KR,ko;q=0.9",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
};

export class CoupangError extends Error {}

// 쿠팡 / 쿠팡 단축링크(coupa.ng 등)만 허용한다 (SSRF 방지).
function isCoupangHost(host: string): boolean {
  return (
    host === "coupa.ng" ||
    host === "coupang.com" ||
    host.endsWith(".coupang.com")
  );
}

export function isAllowedImageHost(host: string): boolean {
  return host === "coupangcdn.com" || host.endsWith(".coupangcdn.com");
}

function productIdFrom(url: string): string | null {
  return (
    url.match(/\/vp\/products\/(\d+)/)?.[1] ??
    url.match(/[?&]productId=(\d+)/)?.[1] ??
    url.match(/\/products\/(\d+)/)?.[1] ??
    null
  );
}

async function resolveProductId(input: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new CoupangError("올바른 링크가 아니에요.");
  }
  if (!isCoupangHost(url.hostname)) {
    throw new CoupangError("쿠팡 링크만 사용할 수 있어요.");
  }
  const direct = productIdFrom(url.href);
  if (direct) return direct;

  // 단축링크: 리다이렉트를 직접 따라가며 매번 호스트를 검증한다.
  let current = url.href;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(current, {
      headers: HEADERS,
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    const loc = res.headers.get("location");
    if (!loc) break;
    const next = new URL(loc, current);
    if (!isCoupangHost(next.hostname)) break;
    current = next.href;
    const id = productIdFrom(current);
    if (id) return id;
  }
  throw new CoupangError("링크에서 상품 번호를 찾지 못했어요.");
}

function normalize(src: string): string {
  const s = src.replace(/&amp;/g, "&");
  return s.startsWith("//") ? "https:" + s : s;
}

// 리뷰 썸네일 크기(.../thumbnails/remote/NNNxNNNex/...)를 키워 큰 이미지를 받는다.
function toLarge(src: string): string {
  return src.replace(
    /\/thumbnails\/remote\/\d+x\d+(ex|q\d+)?/,
    "/thumbnails/remote/800x800ex",
  );
}

function extractImages(html: string): string[] {
  const found: string[] = [];
  const re =
    /<img[^>]+(?:data-origin-path|data-src|src)=["']([^"']*coupangcdn\.com[^"']*)["'][^>]*>/gi;
  for (const m of html.matchAll(re)) {
    // 리뷰 첨부 이미지만 (프로필/아이콘 제외)
    if (!/review|attachment|\/image\//i.test(m[0])) continue;
    found.push(toLarge(normalize(m[1])));
  }
  return found;
}

export async function fetchReviewImages(
  link: string,
  maxPages = 5,
): Promise<{ productId: string; images: string[] }> {
  const productId = await resolveProductId(link);
  const seen = new Set<string>();
  const images: string[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const api =
      `https://www.coupang.com/vp/product/reviews?productId=${productId}` +
      `&page=${page}&size=30&sortBy=ORDER_SCORE_ASC&ratings=&q=&viRoleCode=3&ratingSummary=true`;
    const res = await fetch(api, {
      headers: {
        ...HEADERS,
        Referer: `https://www.coupang.com/vp/products/${productId}`,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      if (page === 1) {
        throw new CoupangError(
          `쿠팡에서 리뷰를 가져오지 못했어요 (HTTP ${res.status}). 쿠팡이 서버 접근을 막았을 수 있어요.`,
        );
      }
      break;
    }
    const batch = extractImages(await res.text()).filter((u) => !seen.has(u));
    if (batch.length === 0) break;
    for (const u of batch) {
      seen.add(u);
      images.push(u);
    }
  }
  return { productId, images };
}
