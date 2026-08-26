import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RecipeListClient } from "@/components/RecipeListClient";
import type { Recipe } from "@/types/database";

export default async function RecipesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 레시피</h1>
        <Link
          href="/recipes/new"
          className="rounded-full btn-3d bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          + 레시피 추가
        </Link>
      </div>

      <RecipeListClient recipes={(recipes ?? []) as Recipe[]} />
    </div>
  );
}
