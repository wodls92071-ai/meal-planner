export type ShoppingSite = "coupang";

export const SHOPPING_SITE_LABELS: Record<ShoppingSite, string> = {
  coupang: "쿠팡",
};

export function shoppingSearchUrl(site: ShoppingSite, query: string): string {
  const q = encodeURIComponent(query);
  switch (site) {
    case "coupang":
      return `https://www.coupang.com/np/search?component=&q=${q}`;
  }
}
