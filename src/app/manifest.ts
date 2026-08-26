import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "저녁 식단 스케줄러",
    short_name: "식단표",
    description: "이번 주 저녁 식단을 짜고 장보기 리스트를 자동으로 만들어요",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6fc",
    theme_color: "#3b6ff0",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
