"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { MealMascot } from "@/components/MealMascot";
import type { ChatMessage, MealPlanWithRecipe } from "@/types/database";

type ChatMsg = { role: "user" | "model"; text: string };

export function ChatAssistant({
  weekStartDate,
  weekDates,
  initialPlans,
  initialMessages,
}: {
  weekStartDate: string;
  weekDates: string[];
  initialPlans: MealPlanWithRecipe[];
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMsg[]>(
    initialMessages.map((m) => ({ role: m.role, text: m.text })),
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState(initialPlans);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError("");
    setSending(true);
    const nextMessages: ChatMsg[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, weekStartDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "요청 실패");
      setMessages([...nextMessages, { role: "model", text: data.reply }]);
      setPlans(data.weekPlan);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="flex flex-1 flex-col gap-3">
        <div
          ref={scrollRef}
          className="flex h-[360px] flex-col gap-3 overflow-y-auto rounded-2xl border border-card-border bg-card p-4 shadow-sm"
        >
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4 text-center">
              <MealMascot />
              <div className="max-w-[85%] rounded-2xl bg-accent-soft px-4 py-2.5 text-sm text-accent-soft-foreground shadow-sm">
                오늘 저녁 뭐 먹을지, 뭐든 얘기해주세요!
              </div>
              <p className="text-xs text-muted">
                예: &quot;이번 주 국물요리 위주로 짜줘&quot;, &quot;수요일은 매운거 빼줘&quot;,
                &quot;화요일도 저번에 만든 걸로 다시&quot;
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap shadow-sm ${
                m.role === "user"
                  ? "self-end bg-accent text-accent-foreground"
                  : "self-start bg-accent-soft text-accent-soft-foreground"
              }`}
            >
              {m.text}
            </div>
          ))}
          {sending && (
            <div className="self-start text-xs text-muted">
              🍳 생각하는 중...
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <form onSubmit={send} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: 이번주 국물요리 위주로 짜줘"
            className="flex-1 rounded-full border border-card-border bg-card px-4 py-2 text-sm shadow-sm"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-full btn-3d bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            보내기
          </button>
        </form>
      </div>

      <div className="w-full shrink-0 md:w-56">
        <h2 className="mb-2 text-xs font-semibold text-accent">
          현재 배치 현황
        </h2>
        <ul className="flex flex-col gap-1.5">
          {weekDates.map((date, i) => {
            const dayPlans = plans.filter((p) => p.date === date);
            return (
              <li
                key={date}
                className="rounded-xl border border-card-border bg-card px-3 py-2 text-xs shadow-sm"
              >
                <span className="font-semibold">{WEEKDAY_LABELS[i]}</span>
                {dayPlans.length > 0 ? (
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {dayPlans.map((p) => (
                      <Link
                        key={p.id}
                        href={`/recipes/${p.recipe_id}`}
                        className="text-muted hover:text-accent hover:underline"
                      >
                        {p.recipes.title}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span className="ml-1 text-muted">비어있음</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
