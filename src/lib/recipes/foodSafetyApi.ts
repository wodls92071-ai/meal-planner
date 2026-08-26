import "server-only";
import { parseIngredientBlock } from "./parseIngredients";
import type { Ingredient } from "@/types/database";

export type ExternalRecipeResult = {
  externalId: string;
  title: string;
  imageUrl: string | null;
  ingredients: Ingredient[];
  instructions: string[];
};

type RawRow = {
  RCP_SEQ: string;
  RCP_NM: string;
  ATT_FILE_NO_MAIN?: string;
  RCP_PARTS_DTLS?: string;
  [key: string]: string | undefined;
};

// 식품안전나라(식약처) 공공데이터포털 "조리식품의 레시피 DB" API (COOKRCP01)
export async function searchExternalRecipes(
  query: string,
): Promise<ExternalRecipeResult[]> {
  const apiKey = process.env.FOOD_SAFETY_API_KEY;
  if (!apiKey) {
    throw new Error("FOOD_SAFETY_API_KEY가 설정되지 않았습니다.");
  }

  const url = `https://openapi.foodsafetykorea.go.kr/api/${apiKey}/COOKRCP01/json/1/20/RCP_NM=${encodeURIComponent(query)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`레시피 API 요청 실패 (${res.status})`);
  }

  const data = await res.json();
  const rows: RawRow[] | undefined = data?.COOKRCP01?.row;
  if (!rows) return [];

  return rows.map((row) => {
    const instructions: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const step = row[`MANUAL${String(i).padStart(2, "0")}`];
      if (step && step.trim()) instructions.push(step.trim());
    }

    return {
      externalId: row.RCP_SEQ,
      title: row.RCP_NM,
      imageUrl: row.ATT_FILE_NO_MAIN?.trim() || null,
      ingredients: parseIngredientBlock(row.RCP_PARTS_DTLS ?? ""),
      instructions,
    };
  });
}
