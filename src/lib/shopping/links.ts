export type ShoppingSite = "coupang" | "kurly" | "naver";

export const SHOPPING_SITE_LABELS: Record<ShoppingSite, string> = {
  coupang: "쿠팡",
  kurly: "마켓컬리",
  naver: "네이버쇼핑",
};

export function shoppingSearchUrl(site: ShoppingSite, query: string): string {
  const q = encodeURIComponent(query);
  switch (site) {
    case "coupang":
      return `https://www.coupang.com/np/search?component=&q=${q}`;
    case "kurly":
      return `https://www.kurly.com/search?sword=${q}`;
    case "naver":
      return `https://search.shopping.naver.com/search/all?query=${q}`;
  }
}
