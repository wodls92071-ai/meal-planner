import "server-only";

export type YoutubeVideoResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

export async function searchYoutubeRecipes(
  query: string,
): Promise<YoutubeVideoResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.");
  }

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "3",
    q: `${query} 레시피 만드는법`,
    relevanceLanguage: "ko",
    safeSearch: "strict",
    key: apiKey,
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube 검색 실패 (${res.status}): ${text}`);
  }

  const data = await res.json();
  return (data.items ?? []).map(
    (item: {
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        thumbnails: { medium?: { url: string }; default?: { url: string } };
      };
    }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl:
        item.snippet.thumbnails.medium?.url ??
        item.snippet.thumbnails.default?.url ??
        "",
    }),
  );
}
