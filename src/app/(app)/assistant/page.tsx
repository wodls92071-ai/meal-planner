import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getWeekStart,
  getWeekDates,
  formatDate,
  parseDateOnly,
  addDays,
} from "@/lib/dates";
import { ChatAssistant } from "@/components/ChatAssistant";
import type { ChatMessage, MealPlanWithRecipe } from "@/types/database";

export default async function AssistantPage({
  searchParams,
}: PageProps<"/assistant">) {
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

  const [{ data: mealPlans }, { data: chatMessages }] = await Promise.all([
    supabase
      .from("meal_plans")
      .select("*, recipes(*)")
      .eq("user_id", user!.id)
      .gte("date", weekStartStr)
      .lte("date", weekEndStr),
    supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user!.id)
      .eq("week_start_date", weekStartStr)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span>💬</span> AI와 식단 짜기
          </h1>
          <p className="text-sm text-muted">
            {weekStartStr} ~ {weekEndStr}
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href={`/assistant?week=${prevWeekStartStr}`}
            className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
          >
            ← 지난 주
          </Link>
          {!isCurrentWeek && (
            <Link
              href="/assistant"
              className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
            >
              오늘
            </Link>
          )}
          <Link
            href={`/assistant?week=${nextWeekStartStr}`}
            className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
          >
            다음 주 →
          </Link>
        </div>
      </div>
      <ChatAssistant
        key={weekStartStr}
        weekStartDate={weekStartStr}
        weekDates={weekDates.map(formatDate)}
        initialPlans={(mealPlans ?? []) as unknown as MealPlanWithRecipe[]}
        initialMessages={(chatMessages ?? []) as ChatMessage[]}
      />
    </div>
  );
}
