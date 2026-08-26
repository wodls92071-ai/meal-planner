import "server-only";

export type YoutubeVideoResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

const VIDEO_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export function extractYoutubeVideoId(url: string): string | null {
  const match = url.match(VIDEO_ID_PATTERN);
  return match ? match[1] : null;
}

// 영상 설명/댓글에 레시피가 텍스트로 적혀있는 경우가 많아서, 영상 분석과 함께
// 참고할 수 있게 상위 댓글을 가져온다. 댓글이 막혀있거나 실패해도 영상 분석
// 자체는 계속 진행해야 하므로 에러를 던지지 않고 빈 배열을 돌려준다.
export async function getTopComments(
  videoId: string,
  maxResults = 15,
): Promise<string[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      part: "snippet",
      videoId,
      order: "relevance",
      maxResults: String(maxResults),
      textFormat: "plainText",
      key: apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];

    const data = await res.json();
    return (data.items ?? []).map(
      (item: {
        snippet: {
          topLevelComment: { snippet: { textDisplay: string } };
        };
      }) => item.snippet.topLevelComment.snippet.textDisplay,
    );
  } catch {
    return [];
  }
}

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
