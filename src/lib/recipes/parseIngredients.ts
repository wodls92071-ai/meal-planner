import type { Ingredient } from "@/types/database";

// 소수/분수(1/2) 뒤에 단위가 붙는 패턴: "돼지고기 200g", "양파 1/2개", "물 2컵"
// 그룹: 1=이름, 2=수량, 3=단위
const QUANTITY_PATTERN =
  /^(.+?)\s+(\d+\/\d+|\d+(?:\.\d+)?)\s*([가-힣a-zA-Z]*)$/;

function parseFraction(raw: string): number {
  if (raw.includes("/")) {
    const [num, den] = raw.split("/").map(Number);
    return den ? num / den : num;
  }
  return Number(raw);
}

// 식품안전나라 API의 RCP_PARTS_DTLS는 구조화되지 않은 텍스트 블록이라
// 완벽한 파싱은 불가능함 — best-effort로 이름/수량/단위를 추출하고,
// 매칭 실패 시 원문 그대로를 이름으로 남겨 사용자가 직접 수정할 수 있게 한다.
export function parseIngredientBlock(block: string): Ingredient[] {
  if (!block || !block.trim()) return [];

  const parts = block
    .split(/[,\n·]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return parts.map((part) => {
    const match = part.match(QUANTITY_PATTERN);
    if (match) {
      const [, name, amount, unit] = match;
      return {
        name: name.trim(),
        amount: parseFraction(amount),
        unit: unit.trim() || null,
      };
    }
    return { name: part, amount: null, unit: null };
  });
}
