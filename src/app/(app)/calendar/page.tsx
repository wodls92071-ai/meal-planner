import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getWeekStart,
  getWeekDates,
  formatDate,
  parseDateOnly,
  addDays,
  getMonthStart,
  getMonthGridDates,
  addMonths,
  formatMonth,
  parseMonthOnly,
} from "@/lib/dates";
import { WeekCalendar } from "@/components/WeekCalendar";
import { MonthCalendar } from "@/components/MonthCalendar";
import { ChatAssistant } from "@/components/ChatAssistant";
import type { ChatMessage, Recipe, MealPlanWithRecipe } from "@/types/database";

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams;
  const view = sp.view === "week" ? "week" : "month";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", userId)
    .order("title");

  const viewTabs = (
    <div className="flex gap-2 text-xs">
      <Link
        href="/calendar?view=week"
        className={`rounded-full px-3 py-1 font-medium transition-colors ${
          view === "week"
            ? "bg-accent text-accent-foreground"
            : "text-muted hover:bg-accent-soft hover:text-accent"
        }`}
      >
        주간
      </Link>
      <Link
        href="/calendar"
        className={`rounded-full px-3 py-1 font-medium transition-colors ${
          view === "month"
            ? "bg-accent text-accent-foreground"
            : "text-muted hover:bg-accent-soft hover:text-accent"
        }`}
      >
        월간
      </Link>
    </div>
  );

  if (view === "month") {
    const monthParam = typeof sp.month === "string" ? sp.month : undefined;
    const baseMonth = monthParam ? parseMonthOnly(monthParam) : new Date();
    const monthStart = getMonthStart(baseMonth);
    const monthStr = formatMonth(monthStart);
    const isCurrentMonth = monthStr === formatMonth(getMonthStart(new Date()));

    const gridDates = getMonthGridDates(monthStart);
    const gridStartStr = formatDate(gridDates[0]);
    const gridEndStr = formatDate(gridDates[41]);

    const prevMonthStr = formatMonth(addMonths(monthStart, -1));
    const nextMonthStr = formatMonth(addMonths(monthStart, 1));

    const thisWeekStart = getWeekStart(new Date());
    const thisWeekDates = getWeekDates(thisWeekStart);
    const thisWeekStartStr = formatDate(thisWeekStart);
    const thisWeekEndStr = formatDate(thisWeekDates[6]);

    const [{ data: mealPlans }, { data: thisWeekPlans }, { data: chatMessages }] =
      await Promise.all([
        supabase
          .from("meal_plans")
          .select("*, recipes(*)")
          .eq("user_id", userId)
          .gte("date", gridStartStr)
          .lte("date", gridEndStr),
        supabase
          .from("meal_plans")
          .select("*, recipes(*)")
          .eq("user_id", userId)
          .gte("date", thisWeekStartStr)
          .lte("date", thisWeekEndStr),
        supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", userId)
          .eq("week_start_date", thisWeekStartStr)
          .order("created_at", { ascending: true }),
      ]);

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            {viewTabs}
            <h1 className="text-xl font-bold">
              {monthStart.getFullYear()}년 {monthStart.getMonth() + 1}월
            </h1>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Link
              href={`/calendar?view=month&month=${prevMonthStr}`}
              className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
            >
              ← 지난달
            </Link>
            {!isCurrentMonth && (
              <Link
                href="/calendar"
                className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
              >
                이번달
              </Link>
            )}
            <Link
              href={`/calendar?view=month&month=${nextMonthStr}`}
              className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
            >
              다음달 →
            </Link>
          </div>
        </div>
        <MonthCalendar
          key={monthStr}
          monthDates={gridDates.map(formatDate)}
          currentMonth={monthStart.getMonth()}
          recipes={(recipes ?? []) as Recipe[]}
          mealPlans={(mealPlans ?? []) as unknown as MealPlanWithRecipe[]}
        />

        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span>💬</span> AI와 채팅
          </h2>
          <p className="text-sm text-muted">
            이번 주({thisWeekStartStr} ~ {thisWeekEndStr}) 식단을 채팅으로 바로 수정해보세요.
          </p>
          <ChatAssistant
            key={thisWeekStartStr}
            weekStartDate={thisWeekStartStr}
            weekDates={thisWeekDates.map(formatDate)}
            initialPlans={(thisWeekPlans ?? []) as unknown as MealPlanWithRecipe[]}
            initialMessages={(chatMessages ?? []) as ChatMessage[]}
          />
        </div>
      </div>
    );
  }

  const weekParam = typeof sp.week === "string" ? sp.week : undefined;
  const baseDate = weekParam ? parseDateOnly(weekParam) : new Date();
  const weekStart = getWeekStart(baseDate);
  const weekDates = getWeekDates(weekStart);
  const weekStartStr = formatDate(weekStart);
  const weekEndStr = formatDate(weekDates[6]);
  const isCurrentWeek = weekStartStr === formatDate(getWeekStart(new Date()));

  const prevWeekStartStr = formatDate(addDays(weekStart, -7));
  const nextWeekStartStr = formatDate(addDays(weekStart, 7));
  const prevWeekDates = getWeekDates(addDays(weekStart, -7)).map(formatDate);

  const [{ data: mealPlans }, { data: chatMessages }] = await Promise.all([
    supabase
      .from("meal_plans")
      .select("*, recipes(*)")
      .eq("user_id", userId)
      .gte("date", weekStartStr)
      .lte("date", weekEndStr),
    supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start_date", weekStartStr)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          {viewTabs}
          <div>
            <h1 className="text-xl font-bold">
              {isCurrentWeek ? "이번 주 저녁 식단" : "저녁 식단"}
            </h1>
            <p className="text-sm text-muted">
              {weekStartStr} ~ {weekEndStr}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href={`/calendar?view=week&week=${prevWeekStartStr}`}
            className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
          >
            ← 지난 주
          </Link>
          {!isCurrentWeek && (
            <Link
              href="/calendar?view=week"
              className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
            >
              오늘
            </Link>
          )}
          <Link
            href={`/calendar?view=week&week=${nextWeekStartStr}`}
            className="rounded-full px-2.5 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
          >
            다음 주 →
          </Link>
          <Link
            href={
              isCurrentWeek ? "/shopping-list" : `/shopping-list?week=${weekStartStr}`
            }
            className="ml-1 rounded-full border border-card-border bg-card px-3 py-1.5 font-medium transition-colors hover:border-accent hover:text-accent"
          >
            이 주 장보기 리스트 →
          </Link>
        </div>
      </div>
      <WeekCalendar
        key={weekStartStr}
        weekDates={weekDates.map(formatDate)}
        prevWeekDates={prevWeekDates}
        recipes={(recipes ?? []) as Recipe[]}
        mealPlans={(mealPlans ?? []) as unknown as MealPlanWithRecipe[]}
      />

      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span>💬</span> AI와 채팅
        </h2>
        <ChatAssistant
          key={weekStartStr}
          weekStartDate={weekStartStr}
          weekDates={weekDates.map(formatDate)}
          initialPlans={(mealPlans ?? []) as unknown as MealPlanWithRecipe[]}
          initialMessages={(chatMessages ?? []) as ChatMessage[]}
        />
      </div>
    </div>
  );
}
