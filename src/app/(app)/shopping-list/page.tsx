import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getWeekStart,
  getWeekDates,
  formatDate,
  parseDateOnly,
  addDays,
} from "@/lib/dates";
import { buildShoppingItems } from "@/lib/shopping/aggregate";
import { ShoppingListClient } from "@/components/ShoppingListClient";
import type { Recipe, ShoppingItem } from "@/types/database";

export default async function ShoppingListPage({
  searchParams,
}: PageProps<"/shopping-list">) {
  const sp = await searchParams;
  const weekParam = typeof sp.week === "string" ? sp.week : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const baseDate = weekParam ? parseDateOnly(weekParam) : new Date();
  const weekStart = getWeekStart(baseDate);
  const weekDates = getWeekDates(weekStart);
  const weekStartStr = formatDate(weekStart);
  const weekEndStr = formatDate(weekDates[6]);
  const isCurrentWeek = weekStartStr === formatDate(getWeekStart(new Date()));
  const prevWeekStartStr = formatDate(addDays(weekStart, -7));
  const nextWeekStartStr = formatDate(addDays(weekStart, 7));

  const [{ data: mealPlans }, { data: existingList }] = await Promise.all([
    supabase
      .from("meal_plans")
      .select("servings, recipes(*)")
      .eq("user_id", user!.id)
      .gte("date", weekStartStr)
      .lte("date", weekEndStr),
    supabase
      .from("shopping_lists")
      .select("*")
      .eq("user_id", user!.id)
      .eq("week_start_date", weekStartStr)
      .maybeSingle(),
  ]);

  // 같은 레시피가 여러 요일에 배치돼 있어도(한 번 만들어 나눠 먹는 요리) 재료는
  // 한 번만 계산한다 — 이미 그 레시피 재료량 자체가 전체 분량을 뜻하기 때문.
  const seenRecipeIds = new Set<string>();
  const ingredientsByRecipe: { ingredients: Recipe["ingredients"]; servings: number }[] = [];
  for (const mp of mealPlans ?? []) {
    const recipe = mp.recipes as unknown as Recipe;
    if (seenRecipeIds.has(recipe.id)) continue;
    seenRecipeIds.add(recipe.id);
    ingredientsByRecipe.push({ ingredients: recipe.ingredients, servings: mp.servings });
  }

  const items: ShoppingItem[] = buildShoppingItems(
    ingredientsByRecipe,
    existingList?.items ?? [],
  );

  const { data: savedList } = await supabase
    .from("shopping_lists")
    .upsert(
      { user_id: user!.id, week_start_date: weekStartStr, items },
      { onConflict: "user_id,week_start_date" },
    )
    .select("*")
    .single();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span>🛒</span> {isCurrentWeek ? "이번 주 장보기 리스트" : "장보기 리스트"}
          </h1>
          <p className="text-sm text-muted">
            {weekStartStr} ~ {weekEndStr} 식단에 필요한 재료
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href={`/shopping-list?week=${prevWeekStartStr}`}
            className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
          >
            ← 지난 주
          </Link>
          {!isCurrentWeek && (
            <Link
              href="/shopping-list"
              className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
            >
              오늘
            </Link>
          )}
          <Link
            href={`/shopping-list?week=${nextWeekStartStr}`}
            className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
          >
            다음 주 →
          </Link>
        </div>
      </div>
      <ShoppingListClient
        key={weekStartStr}
        listId={savedList?.id ?? null}
        initialItems={savedList?.items ?? items}
      />
    </div>
  );
}
