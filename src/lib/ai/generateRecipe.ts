import "server-only";
import type { Ingredient, RecipeCategory } from "@/types/database";
import { RECIPE_CATEGORIES } from "@/lib/recipes/categories";
import { extractYoutubeVideoId, getTopComments } from "@/lib/youtube/search";

export type GeneratedRecipe = {
  title: string;
  category: RecipeCategory;
  ingredients: Ingredient[];
  instructions: string[];
};

const RECIPE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    category: {
      type: "STRING",
      enum: RECIPE_CATEGORIES,
      description: "이 요리에 가장 잘 맞는 음식 카테고리",
    },
    ingredients: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          amount: { type: "NUMBER" },
          unit: { type: "STRING" },
        },
        required: ["name", "amount", "unit"],
      },
    },
    instructions: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["title", "category", "ingredients", "instructions"],
};

async function callGemini(
  parts: object[],
  temperature?: number,
  model = "gemini-flash-latest",
): Promise<GeneratedRecipe> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RECIPE_SCHEMA,
          ...(temperature !== undefined ? { temperature } : {}),
        },
      }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API 요청 실패 (${res.status}): ${text}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("AI 응답을 읽을 수 없습니다.");
  }

  return JSON.parse(text) as GeneratedRecipe;
}

// 요리 이름/설명만 받아서 AI가 레시피를 새로 만들어줌
export async function generateRecipeFromText(
  query: string,
  profileText: string,
): Promise<GeneratedRecipe> {
  const prompt = `"${query}"에 대한 한국 가정식 레시피를 만들어줘.

${profileText}

- 재료를 구하기 쉽고 집에서 만들기 어렵지 않게
- 재료는 이름/수량/단위를 구체적으로 (예: 돼지고기, 300, g). 수량은 위 가구 인원 기준으로 계산해줘
- 조리 순서는 단계 수를 아끼지 말고, 요리를 처음 해보는 사람도 그대로 따라할 수 있을 만큼 최대한 자세히 적어줘. 각 단계마다 시간(예: 3분간), 불세기(강불/중불/약불), 재료의 상태 변화(예: 양파가 투명해질 때까지, 표면이 노릇해질 때까지)를 구체적으로 넣어줘.`;

  return callGemini([{ text: prompt }]);
}

const YOUTUBE_URL_PATTERN =
  /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/;

export function isYoutubeUrl(url: string): boolean {
  return YOUTUBE_URL_PATTERN.test(url.trim());
}

// 유튜브 요리 영상 URL을 넣으면 AI가 영상을 보고 레시피를 정리해줌
export async function extractRecipeFromYoutube(
  url: string,
): Promise<GeneratedRecipe> {
  const trimmed = url.trim();
  if (!isYoutubeUrl(trimmed)) {
    throw new Error("올바른 유튜브 링크가 아니에요.");
  }

  const videoId = extractYoutubeVideoId(trimmed);
  const comments = videoId ? await getTopComments(videoId) : [];
  const commentsBlock =
    comments.length > 0
      ? `\n\n참고로 이 영상의 댓글 중 관련될 수 있는 내용이에요 (댓글 작성자가 재료/분량/조리순서를 텍스트로 정리해둔 경우가 많으니, 영상 속 장면과 맞으면 우선적으로 참고하세요. 영상 내용과 안 맞는 댓글은 무시하세요):\n${comments
          .slice(0, 15)
          .map((c, i) => `${i + 1}. ${c.replace(/\n+/g, " ").slice(0, 500)}`)
          .join("\n")}`
      : "";

  const prompt = `이 요리 영상을 보고 레시피를 정리해줘. 요리 이름, 실제 사용된 재료(이름/수량/단위), 조리 순서를 빠짐없이 뽑아줘.

중요:
- 영상에서 실제로 화면에 나오거나 말로 언급된 재료만 적어. 이 요리에 "보통 이런 재료가 들어간다"고 추측해서 안 나온 재료를 추가하지 마.
- 화면에 잠깐이라도 나오지 않고 언급도 안 된 재료는 절대 넣지 마. 확신이 안 서면 빼는 쪽을 택해.
- 조리 순서는 영상에서 보여준 대로 단계를 나누지 말고 최대한 잘게, 자세히 적어. 각 단계마다 영상에 나온 시간(예: 3분간), 불세기(강불/중불/약불), 재료의 상태 변화(예: 양파가 투명해질 때까지)를 구체적으로 넣어서, 영상을 안 봐도 그대로 따라할 수 있게 해줘.${commentsBlock}

요리 영상이 아니라면 title에 '요리 영상이 아닙니다'라고 적고 나머지는 빈 배열로 줘.`;

  return callGemini(
    [{ text: prompt }, { fileData: { fileUri: trimmed } }],
    0.1,
    "gemini-pro-latest",
  );
}
