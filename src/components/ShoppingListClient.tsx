"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  shoppingSearchUrl,
  SHOPPING_SITE_LABELS,
  type ShoppingSite,
} from "@/lib/shopping/links";
import type { ShoppingItem } from "@/types/database";

const SITES: ShoppingSite[] = ["coupang", "kurly", "naver"];

export function ShoppingListClient({
  listId,
  initialItems,
}: {
  listId: string | null;
  initialItems: ShoppingItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [manualName, setManualName] = useState("");

  async function persist(next: ShoppingItem[]) {
    setItems(next);
    if (!listId) return;
    const supabase = createClient();
    await supabase.from("shopping_lists").update({ items: next }).eq("id", listId);
  }

  function toggle(index: number) {
    persist(
      items.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item,
      ),
    );
  }

  function remove(index: number) {
    persist(items.filter((_, i) => i !== index));
  }

  function setAllChecked(checked: boolean) {
    persist(items.map((item) => ({ ...item, checked })));
  }

  function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualName.trim()) return;
    persist([
      ...items,
      { name: manualName.trim(), amount: null, unit: null, checked: false, manual: true },
    ]);
    setManualName("");
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-card-border p-6 text-center text-sm text-muted">
        이번 주 캘린더에 레시피를 배치하면 필요한 재료가 여기 자동으로
        모여요.
      </p>
    );
  }

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-medium">
          {items.length}개 중 {checkedCount}개 체크됨
        </span>
        <div className="flex gap-3">
          <button onClick={() => setAllChecked(true)} className="font-medium hover:text-accent">
            전체 체크
          </button>
          <button onClick={() => setAllChecked(false)} className="font-medium hover:text-accent">
            전체 해제
          </button>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li
            key={`${item.name}-${item.unit}-${i}`}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm transition-colors ${
              item.checked
                ? "border-success-soft bg-success-soft"
                : "border-card-border bg-card"
            }`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggle(i)}
              className="h-4 w-4 accent-accent"
            />
            <div className="flex-1">
              <span
                className={`text-sm ${item.checked ? "text-success line-through" : ""}`}
              >
                {item.name}
              </span>
              {(item.amount !== null || item.unit) && (
                <span className="ml-2 text-xs text-muted">
                  {item.amount ?? ""} {item.unit ?? ""}
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              {SITES.map((site) => (
                <a
                  key={site}
                  href={shoppingSearchUrl(site, item.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-card-border bg-card px-2 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {SHOPPING_SITE_LABELS[site]}
                </a>
              ))}
            </div>
            <button
              onClick={() => remove(i)}
              className="text-xs text-muted hover:text-red-600"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={addManual} className="flex gap-2">
        <input
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder="직접 추가할 재료명"
          className="flex-1 rounded-full border border-card-border bg-card px-4 py-2 text-sm shadow-sm"
        />
        <button
          type="submit"
          className="rounded-full border border-card-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-accent hover:text-accent"
        >
          추가
        </button>
      </form>
    </div>
  );
}
