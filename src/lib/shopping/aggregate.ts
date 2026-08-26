import type { Ingredient, ShoppingItem } from "@/types/database";

/**
 * 이번 주 배치된 레시피들의 재료를 (이름, 단위) 기준으로 그룹핑해 합산한다.
 * 기존 리스트의 checked 상태와 manual(수동 추가) 항목은 그대로 보존한다.
 */
export function buildShoppingItems(
  ingredientsByRecipe: { ingredients: Ingredient[]; servings: number }[],
  previousItems: ShoppingItem[] = [],
): ShoppingItem[] {
  const checkedKeys = new Set(
    previousItems
      .filter((i) => !i.manual && i.checked)
      .map((i) => itemKey(i)),
  );

  const totals = new Map<string, ShoppingItem>();

  for (const { ingredients, servings } of ingredientsByRecipe) {
    for (const ing of ingredients) {
      const key = itemKey(ing);
      const existing = totals.get(key);
      const amount =
        ing.amount === null ? null : ing.amount * (servings || 1);

      if (existing) {
        existing.amount =
          existing.amount === null || amount === null
            ? null
            : existing.amount + amount;
      } else {
        totals.set(key, {
          name: ing.name,
          amount,
          unit: ing.unit,
          checked: checkedKeys.has(key),
          manual: false,
        });
      }
    }
  }

  const manualItems = previousItems.filter((i) => i.manual);
  return [...totals.values(), ...manualItems];
}

function itemKey(i: { name: string; unit: string | null }): string {
  return `${i.name.trim()}__${(i.unit ?? "").trim()}`;
}
