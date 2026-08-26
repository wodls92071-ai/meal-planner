import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMealPlanChat, type ToolResult } from "@/lib/ai/chatMealPlan";
import {
  getWeekStart,
  getWeekDates,
  formatDate,
  parseDateOnly,
  WEEKDAY_LABELS,
} from "@/lib/dates";
import { profileToPromptText } from "@/lib/profile";
import type { Ingredient, MealPlanWithRecipe, Profile } from "@/types/database";

const HISTORY_LIMIT = 40;

export async function POST(request: Request) {
  const body = await request.json();
  const { message, weekStartDate } = body as {
    message?: string;
    weekStartDate?: string;
  };

  if (!message || !message.trim()) {
    return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const userId = user.id;

  const baseDate = weekStartDate ? parseDateOnly(weekStartDate) : new Date();
  const weekStart = getWeekStart(baseDate);
  const weekDates = getWeekDates(weekStart).map(formatDate);
  const weekDateSet = new Set(weekDates);
  const weekStartStr = weekDates[0];

  const [{ data: recipes }, { data: mealPlans }, { data: pastMessages }, { data: profile }] =
    await Promise.all([
      supabase.from("recipes").select("id,title").eq("user_id", userId).order("title"),
      supabase
        .from("meal_plans")
        .select("*, recipes(*)")
        .eq("user_id", userId)
        .gte("date", weekDates[0])
        .lte("date", weekDates[6]),
      supabase
        .from("chat_messages")
        .select("role,text")
        .eq("user_id", userId)
        .eq("week_start_date", weekStartStr)
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT),
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    ]);

  const history = (pastMessages ?? [])
    .slice()
    .reverse()
    .map((m) => ({ role: m.role, text: m.text }));

  const dishesByDate = new Map<string, string[]>();
  for (const mp of (mealPlans ?? []) as unknown as MealPlanWithRecipe[]) {
    const list = dishesByDate.get(mp.date) ?? [];
    list.push(mp.recipes.title);
    dishesByDate.set(mp.date, list);
  }

  const todayStr = formatDate(new Date());
  const weekSummary = weekDates
    .map((d, i) => {
      const dishes = dishesByDate.get(d);
      return `${WEEKDAY_LABELS[i]}(${d}): ${dishes && dishes.length ? dishes.join(", ") : "비어있음"}`;
    })
    .join("\n");
  const recipeList =
    (recipes ?? []).map((r) => `- ${r.title} (id: ${r.id})`).join("\n") ||
    "(저장된 레시피 없음)";

  const systemContext = `당신은 사용자의 저녁 식단을 함께 짜주는 어시스턴트입니다.
오늘 날짜: ${todayStr}
현재 다루는 주: ${weekDates[0]} ~ ${weekDates[6]}
이번 주 배치 현황 (하루에 메인요리+반찬 등 여러 개가 배치될 수 있음):
${weekSummary}

사용자가 저장해둔 레시피 목록 (재사용 가능):
${recipeList}

${profileToPromptText((profile as Profile) ?? null)}

중요: 위 "이번 주 배치 현황"이 실제 현재 상태입니다. 사용자가 원하는 결과와 이 현황이 다르면 반드시 add_dish / remove_dish / clear_meal 도구를 실제로 호출해서 데이터베이스를 바꾼 뒤에 답변하세요. 도구를 호출하지 않고 "이미 이렇게 되어 있다"거나 "완료했다"고 말해서는 절대 안 됩니다 — 위 현황에 없는 요리는 실제로 존재하지 않는 것입니다. 예를 들어 어떤 날에 반찬이 1개뿐인데 사용자가 반찬 2개를 원하면, 위 현황에 없는 반찬 1개를 add_dish로 새로 추가해야 합니다.

사용자의 요청에 맞게 add_dish / remove_dish / clear_meal 도구를 사용해 위 기간(${weekDates[0]} ~ ${weekDates[6]})의 식단을 직접 수정하세요. 이 범위 밖의 날짜는 다룰 수 없습니다.
- "월요일 식단 짜줘"처럼 하루 전체를 새로 요청하면 메인요리 1개 + 반찬 1~2개를 add_dish로 각각 따로 추가하세요 (기존에 그 날 배치된 게 있으면 먼저 clear_meal로 비우고 다시 채우세요).
- 기존 저장 레시피와 맞는 요청이면 recipe_id로 재사용하고, 아니면 새 요리를 title/ingredients/instructions로 제안해서 만드세요. 재료는 이름/수량/단위를 구체적으로, 위 사용자 프로필의 가구 인원 기준으로 채우세요.
- "반찬 하나만 바꿔줘"처럼 특정 요리 하나만 다루는 요청은 remove_dish로 그것만 제거하고 add_dish로 새로 하나만 추가하세요 (그 날의 나머지 요리는 건드리지 마세요).
- 요리 하나는 보통 하루만 먹는 게 아니라 2~3일 나눠 먹습니다. 여러 날을 한 번에 요청받으면(예: "이번주 다 짜줘") 매일 새 요리를 만들지 말고, 찌개·국·조림처럼 저장성 좋은 요리는 하루치 add_dish로 만든 뒤 그 응답의 recipe_id를 다른 날의 add_dish에도 재사용해서 여러 날에 걸쳐 배치하세요. 재료도 대파/마늘/양파 등 기본 채소나 고기·생선을 여러 요리에 겹치게 써서 장보기 품목이 불필요하게 늘어나지 않게 하세요.
변경을 마쳤으면 무엇을 했는지 자연스러운 한국어로 짧게 설명하세요. 도구 호출 없이 답변만 해도 되는 질문(예: 이번 주 뭐 먹기로 했는지 물어보는 것)은 그냥 답변만 하세요.`;

  async function executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const date = args.date;
    if (typeof date !== "string" || !weekDateSet.has(date)) {
      return {
        ok: false,
        message: `${date}는 다루는 기간(${weekDates[0]}~${weekDates[6]}) 밖이라 처리할 수 없어요.`,
      };
    }

    if (name === "add_dish") {
      let recipeId: string;
      let title: string;

      if (typeof args.recipe_id === "string" && args.recipe_id) {
        const { data: existing } = await supabase
          .from("recipes")
          .select("id,title")
          .eq("id", args.recipe_id)
          .eq("user_id", userId)
          .maybeSingle();
        if (!existing) {
          return { ok: false, message: "해당 recipe_id를 찾을 수 없어요." };
        }
        recipeId = existing.id;
        title = existing.title;
      } else {
        const ingredients = args.ingredients;
        const instructions = args.instructions;
        if (
          typeof args.title !== "string" ||
          !args.title.trim() ||
          !Array.isArray(ingredients) ||
          !Array.isArray(instructions)
        ) {
          return {
            ok: false,
            message: "새 레시피를 만들려면 title, ingredients, instructions가 모두 필요해요.",
          };
        }
        const { data: inserted, error } = await supabase
          .from("recipes")
          .insert({
            user_id: userId,
            title: args.title,
            image_url: null,
            ingredients: ingredients as Ingredient[],
            instructions: instructions as string[],
            source: "custom",
          })
          .select("id,title")
          .single();
        if (error || !inserted) {
          return { ok: false, message: error?.message ?? "레시피 저장 실패" };
        }
        recipeId = inserted.id;
        title = inserted.title;
      }

      const { error: planError } = await supabase.from("meal_plans").insert({
        user_id: userId,
        date,
        recipe_id: recipeId,
        servings: 1,
      });
      if (planError) return { ok: false, message: planError.message };
      return {
        ok: true,
        message: `${date}에 "${title}" 추가 완료`,
        recipe_id: recipeId,
      };
    }

    if (name === "remove_dish") {
      const recipeId = args.recipe_id;
      if (typeof recipeId !== "string" || !recipeId) {
        return { ok: false, message: "제거할 요리의 recipe_id가 필요해요." };
      }
      await supabase
        .from("meal_plans")
        .delete()
        .eq("user_id", userId)
        .eq("date", date)
        .eq("recipe_id", recipeId);
      return { ok: true, message: `${date}의 해당 요리 제거 완료` };
    }

    if (name === "clear_meal") {
      await supabase.from("meal_plans").delete().eq("user_id", userId).eq("date", date);
      return { ok: true, message: `${date} 배치 전체 취소 완료` };
    }

    return { ok: false, message: "알 수 없는 도구예요." };
  }

  try {
    const { reply } = await runMealPlanChat({
      systemContext,
      history,
      message,
      executeTool,
    });

    await supabase.from("chat_messages").insert([
      { user_id: userId, week_start_date: weekStartStr, role: "user", text: message },
      { user_id: userId, week_start_date: weekStartStr, role: "model", text: reply },
    ]);

    const { data: updatedPlans } = await supabase
      .from("meal_plans")
      .select("*, recipes(*)")
      .eq("user_id", userId)
      .gte("date", weekDates[0])
      .lte("date", weekDates[6]);

    return NextResponse.json({ reply, weekPlan: updatedPlans ?? [] });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
