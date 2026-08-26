"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RecipeForm } from "@/components/RecipeForm";
import type { Recipe } from "@/types/database";

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(recipe.is_favorite);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("이 레시피를 삭제할까요? 되돌릴 수 없어요.")) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("recipes").delete().eq("id", recipe.id);
    if (error) {
      setDeleting(false);
      alert(error.message);
      return;
    }
    router.push("/recipes");
    router.refresh();
  }

  async function toggleFavorite() {
    setTogglingFavorite(true);
    const next = !isFavorite;
    setIsFavorite(next);
    const supabase = createClient();
    const { error } = await supabase
      .from("recipes")
      .update({ is_favorite: next })
      .eq("id", recipe.id);
    setTogglingFavorite(false);
    if (error) {
      setIsFavorite(!next);
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <RecipeForm
        recipeId={recipe.id}
        initial={{
          title: recipe.title,
          imageUrl: recipe.image_url,
          category: recipe.category,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          source: recipe.source,
          externalId: recipe.external_id,
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span>🍽️</span> {recipe.title}
          </h1>
          <span className="w-fit rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent-soft-foreground">
            {recipe.category}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFavorite}
            disabled={togglingFavorite}
            title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기에 추가 (AI 추천 시 우선 반영돼요)"}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
              isFavorite
                ? "border-accent bg-accent text-accent-foreground"
                : "border-card-border bg-card hover:border-accent hover:text-accent"
            }`}
          >
            {isFavorite ? "⭐ 즐겨찾기" : "☆ 즐겨찾기"}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="rounded-full border border-card-border bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:border-accent hover:text-accent"
          >
            수정
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-full border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition-colors hover:border-red-400 disabled:opacity-50"
          >
            {deleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>

      {recipe.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="max-h-64 w-full rounded-2xl object-cover shadow-sm"
        />
      )}

      <section className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
        <h2 className="mb-2 text-xs font-semibold text-accent">재료</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="flex justify-between border-b border-card-border py-1 last:border-none">
              <span>{ing.name}</span>
              <span className="text-muted">
                {ing.amount ?? ""} {ing.unit ?? ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {recipe.instructions.length > 0 && (
        <section className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold text-accent">조리 순서</h2>
          <ol className="flex flex-col gap-2 text-sm">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-soft-foreground">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
