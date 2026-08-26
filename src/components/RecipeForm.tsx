"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RECIPE_CATEGORIES } from "@/lib/recipes/categories";
import type { Ingredient, RecipeCategory, RecipeSource } from "@/types/database";

type Props = {
  recipeId?: string; // 있으면 수정 모드
  initial?: {
    title: string;
    imageUrl: string | null;
    ingredients: Ingredient[];
    instructions: string[];
    source: RecipeSource;
    externalId?: string | null;
    category?: RecipeCategory;
  };
};

const emptyIngredient: Ingredient = { name: "", amount: null, unit: null };

export function RecipeForm({ recipeId, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [category, setCategory] = useState<RecipeCategory>(
    initial?.category ?? "기타",
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial?.ingredients.length ? initial.ingredients : [emptyIngredient],
  );
  const [instructions, setInstructions] = useState<string[]>(
    initial?.instructions.length ? initial.instructions : [""],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateIngredient(i: number, patch: Partial<Ingredient>) {
    setIngredients((prev) =>
      prev.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const supabase = createClient();
      const cleanIngredients = ingredients.filter((i) => i.name.trim());
      const cleanInstructions = instructions.filter((s) => s.trim());

      const payload = {
        title: title.trim(),
        image_url: imageUrl.trim() || null,
        category,
        ingredients: cleanIngredients,
        instructions: cleanInstructions,
      };

      if (recipeId) {
        const { error } = await supabase
          .from("recipes")
          .update(payload)
          .eq("id", recipeId);
        if (error) return setError(error.message);
        router.push(`/recipes/${recipeId}`);
        router.refresh();
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setError("로그인이 필요해요. 다시 로그인해주세요.");

      const { data, error } = await supabase
        .from("recipes")
        .insert({
          ...payload,
          user_id: user.id,
          source: initial?.source ?? "custom",
          external_id: initial?.externalId ?? null,
        })
        .select("id")
        .single();

      if (error) return setError(error.message);
      router.push(`/recipes/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!recipeId) return;
    if (!confirm("이 레시피를 삭제할까요?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
      if (error) return setError(error.message);
      router.push("/recipes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 중 오류가 발생했어요.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted">요리 이름</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted">
          이미지 URL (선택)
        </label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted">카테고리</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as RecipeCategory)}
          className="rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
        >
          {RECIPE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted">
            재료 (이름 / 수량 / 단위)
          </label>
          <button
            type="button"
            onClick={() =>
              setIngredients((prev) => [...prev, { ...emptyIngredient }])
            }
            className="text-xs font-medium text-accent hover:text-accent-hover"
          >
            + 재료 추가
          </button>
        </div>
        {ingredients.map((ing, i) => (
          <div key={i} className="flex gap-2">
            <input
              placeholder="이름"
              value={ing.name}
              onChange={(e) => updateIngredient(i, { name: e.target.value })}
              className="flex-[2] rounded-lg border border-card-border bg-card px-2 py-1.5 text-sm"
            />
            <input
              placeholder="수량"
              type="number"
              step="any"
              value={ing.amount ?? ""}
              onChange={(e) =>
                updateIngredient(i, {
                  amount: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-20 rounded-lg border border-card-border bg-card px-2 py-1.5 text-sm"
            />
            <input
              placeholder="단위"
              value={ing.unit ?? ""}
              onChange={(e) => updateIngredient(i, { unit: e.target.value })}
              className="w-20 rounded-lg border border-card-border bg-card px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() =>
                setIngredients((prev) => prev.filter((_, idx) => idx !== i))
              }
              className="px-2 text-xs text-muted hover:text-red-600"
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted">조리 순서</label>
          <button
            type="button"
            onClick={() => setInstructions((prev) => [...prev, ""])}
            className="text-xs font-medium text-accent hover:text-accent-hover"
          >
            + 단계 추가
          </button>
        </div>
        {instructions.map((step, i) => (
          <div key={i} className="flex gap-2">
            <span className="pt-2 text-xs text-muted">{i + 1}.</span>
            <textarea
              value={step}
              onChange={(e) =>
                setInstructions((prev) =>
                  prev.map((s, idx) => (idx === i ? e.target.value : s)),
                )
              }
              rows={2}
              className="flex-1 rounded-lg border border-card-border bg-card px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() =>
                setInstructions((prev) => prev.filter((_, idx) => idx !== i))
              }
              className="px-2 text-xs text-muted hover:text-red-600"
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full btn-3d bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {recipeId && (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
          >
            삭제
          </button>
        )}
      </div>
    </form>
  );
}
