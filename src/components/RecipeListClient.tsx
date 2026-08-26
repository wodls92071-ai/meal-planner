"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RECIPE_CATEGORIES } from "@/lib/recipes/categories";
import type { Recipe } from "@/types/database";

type CategoryFilter = "전체" | (typeof RECIPE_CATEGORIES)[number];

export function RecipeListClient({ recipes: initialRecipes }: { recipes: Recipe[] }) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("전체");
  const [recategorizing, setRecategorizing] = useState(false);
  const [recategorizeError, setRecategorizeError] = useState("");

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) {
      counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    }
    return counts;
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = q
      ? recipes.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.ingredients.some((i) => i.name.toLowerCase().includes(q)),
        )
      : recipes;
    if (activeCategory !== "전체") {
      base = base.filter((r) => r.category === activeCategory);
    }
    return [...base].sort(
      (a, b) => Number(b.is_favorite) - Number(a.is_favorite),
    );
  }, [recipes, query, activeCategory]);

  async function handleRecategorize() {
    setRecategorizing(true);
    setRecategorizeError("");
    try {
      const res = await fetch("/api/recipes/categorize", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분류 실패");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: fresh } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (fresh) setRecipes(fresh);
    } catch (err) {
      setRecategorizeError(err instanceof Error ? err.message : "분류 실패");
    } finally {
      setRecategorizing(false);
    }
  }

  async function toggleFavorite(id: string, current: boolean) {
    const next = !current;
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_favorite: next } : r)),
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("recipes")
      .update({ is_favorite: next })
      .eq("id", id);
    if (error) {
      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_favorite: current } : r)),
      );
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 레시피를 삭제할까요? 되돌릴 수 없어요.`)) return;
    const prev = recipes;
    setRecipes((cur) => cur.filter((r) => r.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) {
      setRecipes(prev);
      alert(error.message);
    }
  }

  if (recipes.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-card-border p-6 text-center text-sm text-muted">
        아직 레시피가 없어요. 검색하거나 직접 입력해서 추가해보세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="요리 이름이나 재료로 검색..."
          className="flex-1 rounded-full border border-card-border bg-card px-4 py-2 text-sm shadow-sm"
        />
        <button
          onClick={handleRecategorize}
          disabled={recategorizing}
          title="AI가 요리 이름을 보고 카테고리를 다시 분류해요"
          className="shrink-0 rounded-full border border-card-border bg-card px-3 py-2 text-xs font-medium shadow-sm transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {recategorizing ? "분류 중..." : "AI로 자동 분류"}
        </button>
      </div>
      {recategorizeError && (
        <p className="text-sm text-red-600">{recategorizeError}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {(["전체", ...RECIPE_CATEGORIES] as CategoryFilter[]).map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === c
                ? "border-accent bg-accent text-accent-foreground"
                : "border-card-border bg-card hover:border-accent hover:text-accent"
            }`}
          >
            {c}
            {c !== "전체" && categoryCounts.get(c) ? ` (${categoryCounts.get(c)})` : ""}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-card-border p-6 text-center text-sm text-muted">
          {query
            ? `"${query}"와(과) 일치하는 레시피가 없어요.`
            : "이 카테고리에는 레시피가 없어요."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {filtered.map((r) => (
            <li key={r.id} className="relative">
              <Link
                href={`/recipes/${r.id}`}
                className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card p-4 pr-10 shadow-sm transition-colors hover:border-accent"
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <span>🍽️</span> {r.title}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-soft-foreground">
                    {r.category}
                  </span>
                  재료 {r.ingredients.length}개
                </span>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(r.id, r.is_favorite);
                }}
                title={r.is_favorite ? "즐겨찾기 해제" : "즐겨찾기에 추가"}
                className="absolute top-3 right-3 text-lg leading-none"
              >
                {r.is_favorite ? "⭐" : "☆"}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(r.id, r.title);
                }}
                title="레시피 삭제"
                className="absolute bottom-3 right-3 text-sm leading-none text-muted hover:text-red-600"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
