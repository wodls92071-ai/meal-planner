"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WEEKDAY_LABELS } from "@/lib/dates";
import type { Ingredient, Recipe, MealPlanWithRecipe } from "@/types/database";

type Props = {
  weekDates: string[]; // "YYYY-MM-DD" x 7, 월~일
  prevWeekDates: string[]; // 바로 직전 주, 같은 순서
  recipes: Recipe[];
  mealPlans: MealPlanWithRecipe[];
};

type RecommendedDish = {
  title: string;
  weekdays: string[]; // 이 요리를 먹는 요일들 (한 번 만들어 나눠 먹을 수 있음)
  recipe_id?: string; // 저장된 레시피를 재사용하는 경우에만
  ingredients: Ingredient[];
  instructions: string[];
};

export function WeekCalendar({
  weekDates,
  prevWeekDates,
  recipes,
  mealPlans,
}: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState(mealPlans);
  const [pendingByDate, setPendingByDate] = useState<Record<string, string>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [copyingLastWeek, setCopyingLastWeek] = useState(false);

  const [recommending, setRecommending] = useState(false);
  const [recommendError, setRecommendError] = useState("");
  const [preview, setPreview] = useState<RecommendedDish[] | null>(null);
  const [applying, setApplying] = useState(false);

  async function addRecipe(date: string) {
    const recipeId = pendingByDate[date];
    if (!recipeId) return;

    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("meal_plans")
      .insert({ user_id: user!.id, date, recipe_id: recipeId, servings: 1 })
      .select("*, recipes(*)")
      .single();

    setBusy(false);
    if (!error && data) {
      setPlans((prev) => [...prev, data as unknown as MealPlanWithRecipe]);
    }
  }

  async function removePlan(id: string) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("meal_plans").delete().eq("id", id);
    setBusy(false);
    if (!error) {
      setPlans((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function changeRecipe(id: string, recipeId: string) {
    if (!recipeId) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("meal_plans")
      .update({ recipe_id: recipeId })
      .eq("id", id)
      .select("*, recipes(*)")
      .single();
    setBusy(false);
    if (!error && data) {
      setPlans((prev) =>
        prev.map((p) => (p.id === id ? (data as unknown as MealPlanWithRecipe) : p)),
      );
    }
  }

  async function updateServings(id: string, servings: number) {
    if (!Number.isFinite(servings) || servings <= 0) return;
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, servings } : p)),
    );
    const supabase = createClient();
    await supabase.from("meal_plans").update({ servings }).eq("id", id);
  }

  async function copyLastWeek() {
    setCopyingLastWeek(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: lastWeekPlans } = await supabase
      .from("meal_plans")
      .select("date, recipe_id, servings")
      .eq("user_id", user!.id)
      .in("date", prevWeekDates);

    const emptyDates = new Set(
      weekDates.filter((date) => plans.every((p) => p.date !== date)),
    );

    const toInsert = (lastWeekPlans ?? [])
      .map((lp) => {
        const dayIndex = prevWeekDates.indexOf(lp.date);
        const targetDate = weekDates[dayIndex];
        return targetDate && emptyDates.has(targetDate)
          ? {
              user_id: user!.id,
              date: targetDate,
              recipe_id: lp.recipe_id,
              servings: lp.servings,
            }
          : null;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (toInsert.length > 0) {
      const { data: inserted } = await supabase
        .from("meal_plans")
        .insert(toInsert)
        .select("*, recipes(*)");
      if (inserted) {
        setPlans((prev) => [
          ...prev,
          ...(inserted as unknown as MealPlanWithRecipe[]),
        ]);
      }
    }
    setCopyingLastWeek(false);
  }

  async function requestRecommendation() {
    setRecommending(true);
    setRecommendError("");
    setPreview(null);
    try {
      const res = await fetch("/api/recommend", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "추천 실패");
      setPreview(data.dishes);
    } catch (err) {
      setRecommendError(err instanceof Error ? err.message : "추천 실패");
    } finally {
      setRecommending(false);
    }
  }

  async function applyRecommendation() {
    if (!preview) return;
    setApplying(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const weekdayToDate = new Map(
      WEEKDAY_LABELS.map((label, i) => [label, weekDates[i]]),
    );

    // 겹치는 요일을 먼저 전부 비운 뒤 채워야, 여러 요리가 같은 날을 가리킬 때
    // 나중에 넣은 요리가 먼저 넣은 요리를 지워버리는 일이 없다.
    const coveredDates = new Set<string>();
    for (const dish of preview) {
      for (const wd of dish.weekdays) {
        const date = weekdayToDate.get(wd);
        if (date) coveredDates.add(date);
      }
    }

    if (coveredDates.size > 0) {
      await supabase
        .from("meal_plans")
        .delete()
        .eq("user_id", user!.id)
        .in("date", [...coveredDates]);
    }

    const newPlans: MealPlanWithRecipe[] = [];

    for (const dish of preview) {
      const dates = dish.weekdays
        .map((wd) => weekdayToDate.get(wd))
        .filter((d): d is string => !!d);
      if (dates.length === 0) continue;

      // AI가 저장된 레시피를 재사용하라고 알려준 경우, 실제로 내가 가진
      // 레시피인지 확인하고 그대로 재사용한다 (새로 만들지 않음).
      const reused = dish.recipe_id
        ? recipes.find((r) => r.id === dish.recipe_id)
        : undefined;

      let recipeId: string;
      if (reused) {
        recipeId = reused.id;
      } else {
        const { data: recipe, error: recipeError } = await supabase
          .from("recipes")
          .insert({
            user_id: user!.id,
            title: dish.title,
            image_url: null,
            ingredients: dish.ingredients,
            instructions: dish.instructions,
            source: "custom",
          })
          .select("*")
          .single();
        if (recipeError || !recipe) continue;
        recipeId = recipe.id;
      }

      const { data: plans, error: planError } = await supabase
        .from("meal_plans")
        .insert(
          dates.map((date) => ({
            user_id: user!.id,
            date,
            recipe_id: recipeId,
            servings: 1,
          })),
        )
        .select("*, recipes(*)");
      if (planError || !plans) continue;

      newPlans.push(...(plans as unknown as MealPlanWithRecipe[]));
    }

    setPlans((prev) => [
      ...prev.filter((p) => !coveredDates.has(p.date)),
      ...newPlans,
    ]);
    setPreview(null);
    setApplying(false);
    router.refresh();
  }

  const hasEmptyDay = weekDates.some((date) =>
    plans.every((p) => p.date !== date),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-accent-soft bg-accent-soft/40 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <span>✨</span> AI로 저녁 식단 추천받기
            </p>
            <p className="text-xs text-muted">
              Gemini가 월~일 저녁 메뉴를 메인요리+반찬까지 한 번에 추천해줘요.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={copyLastWeek}
              disabled={copyingLastWeek || !hasEmptyDay}
              title={
                hasEmptyDay
                  ? "지난주 배치를 빈 요일에 그대로 채워요"
                  : "이번 주는 이미 모든 요일이 채워져 있어요"
              }
              className="rounded-full border border-card-border bg-card px-4 py-2 text-xs font-medium shadow-sm transition-colors hover:border-accent disabled:opacity-40"
            >
              {copyingLastWeek ? "복사 중..." : "지난주와 동일하게 채우기"}
            </button>
            <button
              onClick={requestRecommendation}
              disabled={recommending}
              className="rounded-full btn-3d bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {recommending ? "추천 받는 중..." : "AI 추천받기"}
            </button>
          </div>
        </div>

        {recommendError && (
          <p className="mt-3 text-sm text-red-600">{recommendError}</p>
        )}

        {preview && (
          <div className="mt-4 flex flex-col gap-3">
            <ul className="flex flex-col gap-1.5">
              {preview.map((dish, i) => (
                <li
                  key={i}
                  className="rounded-xl bg-card px-3 py-2 text-sm shadow-sm"
                >
                  <b className="text-accent">{dish.weekdays.join("·")}</b> —{" "}
                  {dish.title}
                  <span className="ml-2 text-xs text-muted">
                    {dish.recipe_id
                      ? "(저장된 레시피 재사용)"
                      : `(${dish.weekdays.length}일치 새 레시피)`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={applyRecommendation}
                disabled={applying}
                className="rounded-full btn-3d bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {applying ? "적용 중..." : "이 주에 적용 (기존 배치는 덮어써요)"}
              </button>
              <button
                onClick={requestRecommendation}
                disabled={recommending}
                className="rounded-full border border-card-border bg-card px-4 py-2 text-xs disabled:opacity-50"
              >
                다시 추천
              </button>
              <button
                onClick={() => setPreview(null)}
                className="rounded-full px-4 py-2 text-xs text-muted"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {recipes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-card-border p-6 text-center text-sm text-muted">
          아직 저장된 레시피가 없어요. 레시피 페이지에서 추가하거나, 위의 AI
          추천을 사용해보세요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {weekDates.map((date, i) => {
            const dayPlans = plans.filter((p) => p.date === date);
            return (
              <div
                key={date}
                className="flex flex-col gap-2.5 rounded-2xl border border-card-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-baseline gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-soft-foreground">
                    {WEEKDAY_LABELS[i]}
                  </span>
                  <span className="text-sm font-semibold">요일</span>
                  <span className="text-xs text-muted">{date}</span>
                </div>

                {dayPlans.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {dayPlans.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between rounded-xl bg-accent-soft/60 px-3 py-2 text-sm"
                      >
                        <Link
                          href={`/recipes/${p.recipe_id}`}
                          className="font-medium hover:underline"
                        >
                          {p.recipes.title}
                        </Link>
                        <div className="flex items-center gap-3">
                          <select
                            value=""
                            onChange={(e) => changeRecipe(p.id, e.target.value)}
                            disabled={busy}
                            className="rounded-md border border-card-border bg-card px-1 py-0.5 text-xs text-muted"
                          >
                            <option value="">다른 레시피로 변경...</option>
                            {recipes
                              .filter((r) => r.id !== p.recipe_id)
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.title}
                                </option>
                              ))}
                          </select>
                          <label className="flex items-center gap-1 text-xs text-muted">
                            인분
                            <input
                              type="number"
                              min={1}
                              step="any"
                              value={p.servings}
                              onChange={(e) =>
                                updateServings(p.id, Number(e.target.value))
                              }
                              className="w-12 rounded-md border border-card-border bg-card px-1 py-0.5 text-center text-xs"
                            />
                          </label>
                          <button
                            onClick={() => removePlan(p.id)}
                            disabled={busy}
                            className="text-xs text-muted hover:text-red-600"
                          >
                            삭제
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <select
                    value={pendingByDate[date] ?? ""}
                    onChange={(e) =>
                      setPendingByDate((prev) => ({
                        ...prev,
                        [date]: e.target.value,
                      }))
                    }
                    className="flex-1 rounded-lg border border-card-border bg-card px-2 py-1.5 text-sm"
                  >
                    <option value="">레시피 선택...</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => addRecipe(date)}
                    disabled={busy || !pendingByDate[date]}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-40"
                  >
                    추가
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
