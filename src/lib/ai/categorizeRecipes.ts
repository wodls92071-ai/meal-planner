import "server-only";
import type { RecipeCategory } from "@/types/database";
import { RECIPE_CATEGORIES } from "@/lib/recipes/categories";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    results: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          category: { type: "STRING", enum: RECIPE_CATEGORIES },
        },
        required: ["id", "category"],
      },
    },
  },
  required: ["results"],
};

export async function categorizeRecipes(
  recipes: { id: string; title: string }[],
): Promise<Record<string, RecipeCategory>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }
  if (recipes.length === 0) return {};

  const prompt = `아래 요리 이름들을 각각 다음 카테고리 중 하나로 분류해줘: ${RECIPE_CATEGORIES.join(", ")}.

${recipes.map((r) => `- id: ${r.id}, 이름: ${r.title}`).join("\n")}

모든 id에 대해 빠짐없이 분류 결과를 반환해줘.`;

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

  const parsed = JSON.parse(text) as {
    results: { id: string; category: RecipeCategory }[];
  };

  const map: Record<string, RecipeCategory> = {};
  for (const r of parsed.results) {
    map[r.id] = r.category;
  }
  return map;
}
