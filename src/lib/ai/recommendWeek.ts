import "server-only";
import type { Ingredient } from "@/types/database";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export type RecommendedDish = {
  title: string;
  weekdays: string[]; // 이 요리를 먹는 요일들 (예: ["월","화"] — 한 번 만들어 나눠 먹음)
  recipe_id?: string; // 저장된 레시피를 그대로 재사용하는 경우에만
  ingredients: Ingredient[];
  instructions: string[];
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    dishes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          weekdays: {
            type: "ARRAY",
            items: { type: "STRING", enum: WEEKDAYS },
          },
          recipe_id: {
            type: "STRING",
            description:
              "이미 저장된 레시피를 그대로 재사용할 때만 채움. 이 경우 ingredients/instructions는 빈 배열로 둬도 됨.",
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
        required: ["title", "weekdays", "ingredients", "instructions"],
      },
    },
  },
  required: ["dishes"],
};

export async function recommendWeek(
  profileText: string,
  savedRecipesText: string,
): Promise<RecommendedDish[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const prompt = `한국 가정식 기준으로 월요일부터 일요일까지 일주일치 저녁 식단을 실제 자취/가정에서 하듯이 현실적으로 짜줘.

${profileText}

${savedRecipesText}

레시피 선택 원칙:
- 위 저장된 레시피 목록에서 적당한 게 있으면 새로 만들지 말고 recipe_id로 재사용하세요. 특히 ⭐ 즐겨찾기 표시가 있거나 자주 만든(N회) 레시피는 그 사용자가 좋아하는 요리이니 우선적으로 이번 주에도 배치하세요.
- recipe_id로 재사용하는 요리는 이미 저장된 분량 그대로 쓰는 거라 weekdays를 1개 요일만 지정하세요 (여러 날 나눠 먹는 배치는 새로 만드는 요리에만 적용).
- 목록에 마땅한 게 없거나 다양성을 위해 새로운 메뉴가 필요할 때만 recipe_id 없이 title/ingredients/instructions로 새 요리를 만드세요.
- 저장된 레시피만으로 일주일을 다 채우려 하지 말고, 적당히 새 요리와 섞어서 다양하게 구성하세요.

요리 배분 원칙 (recipe_id 없이 새로 만드는 요리에 적용):
- 요리 하나를 만들면 하루만 먹는 게 아니라 보통 2~3일 나눠 먹습니다. 특히 찌개/국/카레/조림처럼 저장성 좋은 메인요리나 밑반찬은 한 번 넉넉히 만들어서 여러 요일에 걸쳐 배치하세요 (그 요리의 weekdays 배열에 해당하는 요일을 모두 적기).
- 매일 완전히 새로운 요리를 만들 필요 없습니다. 일주일 전체를 봤을 때 실제로 새로 만드는 요리 가짓수는 4~6개 정도로, 이걸 요일에 나눠 배치하는 방식으로 짜주세요.
- 재료를 서로 겹치게 활용하세요. 예를 들어 대파/마늘/양파/고추 같은 기본 채소나, 한 번에 사면 남는 고기·생선 등은 그 주의 다른 요리에도 재사용해서, 한 재료를 아주 조금만 쓰고 나머지가 남는 일이 없게 하세요.

공통 규칙:
- 매 요일 저녁에는 반드시 최소 1개 이상의 요리가 배치되어 있어야 하고(그 요리가 여러 요일에 걸쳐 있어도 됨), 월~일 7일 모두 빠짐없이 채워주세요.
- 일주일 전체로 봤을 때는 다양하게(같은 주재료가 계속 반복되지 않게) 구성하세요.
- 새로 만드는 요리의 재료는 이름/수량/단위를 구체적으로 적되(예: 돼지고기, 300, g), 위 가구 인원이 "한 번" 먹을 분량 기준으로만 계산해줘. 그 요리를 며칠에 나눠 먹을지는 신경 쓰지 마세요 — 여러 날에 걸친 분량 계산은 별도로 처리됩니다.
- 조리 순서는 2~6단계로 간단히`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
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

  const parsed = JSON.parse(text) as { dishes: RecommendedDish[] };

  // AI가 "한 번 먹을 분량"만 계산하게 하고, 며칠 나눠 먹을지에 따른 배율은
  // 여기서 확실하게 곱해준다 — 단, 기존 레시피를 재사용하는 경우엔 이미 저장된
  // 분량 그대로 써야 하므로 스케일하지 않는다.
  return parsed.dishes.map((dish) => {
    if (dish.recipe_id) return dish;
    const multiplier = Math.max(1, dish.weekdays.length);
    return {
      ...dish,
      ingredients: dish.ingredients.map((ing) => ({
        ...ing,
        amount: ing.amount === null ? null : ing.amount * multiplier,
      })),
    };
  });
}
