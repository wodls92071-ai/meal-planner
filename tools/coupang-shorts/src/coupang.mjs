// 쿠팡 파트너스 Open API 클라이언트
// 문서: https://partners.coupang.com → 추가기능 → Open API
import crypto from "node:crypto";

const HOST = "https://api-gateway.coupang.com";
const BASE = "/v2/providers/affiliate_open_api/apis/openapi/v1";

function credentials() {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error(
      "COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 가 없습니다. .env 를 확인하세요.",
    );
  }
  return { accessKey, secretKey };
}

// signed-date 형식: yyMMdd'T'HHmmss'Z' (GMT)
function signedDate(now = new Date()) {
  const iso = now.toISOString(); // 2026-10-15T01:02:03.456Z
  return (
    iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10) + "T" +
    iso.slice(11, 13) + iso.slice(14, 16) + iso.slice(17, 19) + "Z"
  );
}

export function authorization(method, path, query, { accessKey, secretKey }) {
  const datetime = signedDate();
  const message = datetime + method + path + query;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

async function call(method, path, { params, body } = {}) {
  const creds = credentials();
  const query = params ? new URLSearchParams(params).toString() : "";
  const res = await fetch(HOST + path + (query ? `?${query}` : ""), {
    method,
    headers: {
      Authorization: authorization(method, path, query, creds),
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`쿠팡 API 응답 파싱 실패 (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok || (json.rCode && json.rCode !== "0")) {
    throw new Error(
      `쿠팡 API 오류 (HTTP ${res.status}, rCode ${json.rCode}): ${json.rMessage ?? json.message ?? text.slice(0, 300)}`,
    );
  }
  return json.data;
}

function subId() {
  return process.env.COUPANG_SUB_ID || undefined;
}

function normalize(p) {
  return {
    productId: String(p.productId),
    name: p.productName,
    price: p.productPrice,
    imageUrl: p.productImage,
    // 파트너스 API가 돌려주는 productUrl 은 이미 수익 추적 링크입니다.
    link: p.productUrl,
    category: p.categoryName ?? "",
    isRocket: Boolean(p.isRocket),
    isFreeShipping: Boolean(p.isFreeShipping),
  };
}

/** 키워드 검색 (limit 최대 10) */
export async function searchProducts(keyword, limit = 5) {
  const params = { keyword, limit: String(Math.min(limit, 10)), imageSize: "700x700" };
  if (subId()) params.subId = subId();
  const data = await call("GET", `${BASE}/products/search`, { params });
  return (data?.productData ?? []).map(normalize);
}

/** 골드박스(오늘의 특가) 상품 */
export async function goldboxProducts(limit = 5) {
  const params = { imageSize: "700x700" };
  if (subId()) params.subId = subId();
  const data = await call("GET", `${BASE}/products/goldbox`, { params });
  return (data ?? []).slice(0, limit).map(normalize);
}

/** 일반 쿠팡 상품 URL → 파트너스 단축 링크 */
export async function deeplink(urls) {
  const body = { coupangUrls: urls };
  if (subId()) body.subId = subId();
  const data = await call("POST", `${BASE}/deeplink`, { body });
  return Object.fromEntries((data ?? []).map((d) => [d.originalUrl, d.shortenUrl]));
}
