"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { WEEKDAY_LABELS, formatDate } from "@/lib/dates";
import type { Recipe, MealPlanWithRecipe } from "@/types/database";

const TODAY_STR = formatDate(new Date());

type Props = {
  monthDates: string[]; // 42개, "YYYY-MM-DD"
  currentMonth: number; // 0-11, monthDates 중 이 달에 속하지 않는 날은 흐리게 표시
  recipes: Recipe[];
  mealPlans: MealPlanWithRecipe[];
};

export function MonthCalendar({ monthDates, currentMonth, recipes, mealPlans }: Props) {
  const [plans, setPlans] = useState(mealPlans);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pendingRecipeId, setPendingRecipeId] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedDayPlans = selectedDate
    ? plans.filter((p) => p.date === selectedDate)
    : [];

  async function addRecipe(date: string, recipeId: string) {
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
      setPendingRecipeId("");
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

  async function removePlan(id: string) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("meal_plans").delete().eq("id", id);
    setBusy(false);
    if (!error) {
      setPlans((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-card-border bg-card-border text-xs shadow-sm">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-accent-soft px-2 py-1.5 text-center font-semibold text-accent-soft-foreground"
          >
            {label}
          </div>
        ))}
        {monthDates.map((date) => {
          const d = new Date(date);
          const inMonth = d.getMonth() === currentMonth;
          const isToday = date === TODAY_STR;
          const dayPlans = plans.filter((p) => p.date === date);
          const isSelected = selectedDate === date;
          return (
            <button
              key={date}
              onClick={() => {
                setSelectedDate(date);
                setPendingRecipeId("");
              }}
              className={`flex min-h-[72px] flex-col items-start gap-1 bg-card p-1.5 text-left align-top transition-colors ${
                isSelected ? "ring-2 ring-inset ring-accent" : ""
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  isToday
                    ? "bg-accent font-bold text-accent-foreground"
                    : "text-muted"
                }`}
              >
                {d.getDate()}
              </span>
              {dayPlans.map((p) => (
                <span
                  key={p.id}
                  className="w-full truncate rounded-md bg-accent-soft px-1 py-0.5 text-[11px] text-accent-soft-foreground"
                >
                  {p.recipes.title}
                </span>
              ))}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="flex flex-col gap-2 rounded-2xl border border-card-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{selectedDate}</span>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-muted"
            >
              닫기
            </button>
          </div>

          {selectedDayPlans.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {selectedDayPlans.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-accent-soft/60 px-3 py-2 text-sm"
                >
                  <Link href={`/recipes/${p.recipe_id}`} className="font-medium hover:underline">
                    {p.recipes.title}
                  </Link>
                  <div className="flex items-center gap-3">
                    <select
                      value=""
                      disabled={busy}
                      onChange={(e) => changeRecipe(p.id, e.target.value)}
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
              value={pendingRecipeId}
              onChange={(e) => setPendingRecipeId(e.target.value)}
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
              onClick={() => addRecipe(selectedDate, pendingRecipeId)}
              disabled={busy || !pendingRecipeId}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
