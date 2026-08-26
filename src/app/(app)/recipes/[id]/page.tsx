import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecipeDetail } from "@/components/RecipeDetail";

export default async function RecipeDetailPage({
  params,
}: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (!recipe) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/recipes" className="text-xs font-medium text-muted hover:text-accent">
        ← 레시피 목록
      </Link>
      <RecipeDetail recipe={recipe} />
    </div>
  );
}
