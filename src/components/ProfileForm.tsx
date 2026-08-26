"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

type ChipOption = { label: string; emoji: string };

const ALLERGY_OPTIONS: ChipOption[] = [
  { label: "새우", emoji: "🦐" },
  { label: "게/갑각류", emoji: "🦀" },
  { label: "조개류", emoji: "🦪" },
  { label: "생선", emoji: "🐟" },
  { label: "계란", emoji: "🥚" },
  { label: "유제품", emoji: "🥛" },
  { label: "땅콩", emoji: "🥜" },
  { label: "견과류", emoji: "🌰" },
  { label: "밀/글루텐", emoji: "🌾" },
  { label: "대두/콩", emoji: "🫘" },
  { label: "메밀", emoji: "🍚" },
  { label: "복숭아", emoji: "🍑" },
];

const DISLIKE_OPTIONS: ChipOption[] = [
  { label: "가지", emoji: "🍆" },
  { label: "오이", emoji: "🥒" },
  { label: "버섯", emoji: "🍄" },
  { label: "파", emoji: "🌿" },
  { label: "고수", emoji: "🌱" },
  { label: "당근", emoji: "🥕" },
  { label: "브로콜리", emoji: "🥦" },
  { label: "피망/파프리카", emoji: "🫑" },
  { label: "양파", emoji: "🧅" },
  { label: "내장류", emoji: "🍖" },
];

const CUISINE_OPTIONS: ChipOption[] = [
  { label: "한식", emoji: "🇰🇷" },
  { label: "중식", emoji: "🥡" },
  { label: "일식", emoji: "🍣" },
  { label: "양식", emoji: "🍝" },
  { label: "분식", emoji: "🍢" },
  { label: "멕시칸", emoji: "🌮" },
  { label: "동남아", emoji: "🍛" },
  { label: "채식", emoji: "🥗" },
  { label: "국물요리", emoji: "🍲" },
];

const SPICE_LEVELS: ChipOption[] = [
  { label: "못 먹음", emoji: "😌" },
  { label: "순한맛", emoji: "🙂" },
  { label: "보통", emoji: "😋" },
  { label: "매운맛", emoji: "🔥" },
];

function parseSelection(value: string, options: ChipOption[]) {
  const known = new Set(options.map((o) => o.label));
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const selected = new Set(parts.filter((p) => known.has(p)));
  const custom = parts.filter((p) => !known.has(p)).join(", ");
  return { selected, custom };
}

function combineSelection(selected: Set<string>, custom: string): string {
  const customParts = custom
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...selected, ...customParts].join(", ");
}

function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: ChipOption[];
  selected: Set<string>;
  onToggle: (label: string) => void;
}) {
  return (
    <div className="grid w-full max-w-md grid-cols-3 gap-3">
      {options.map((opt) => {
        const active = selected.has(opt.label);
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onToggle(opt.label)}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 py-5 shadow-sm transition-colors ${
              active
                ? "border-accent bg-accent text-accent-foreground"
                : "border-card-border bg-card text-muted hover:border-accent hover:text-accent"
            }`}
          >
            <span className="text-3xl">{opt.emoji}</span>
            <span className="text-sm font-semibold">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const STEP_COUNT = 6;

export function ProfileForm({ initial }: { initial: Profile | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [householdSize, setHouseholdSize] = useState(initial?.household_size ?? 2);

  const allergyParsed = parseSelection(initial?.allergies ?? "", ALLERGY_OPTIONS);
  const [allergySelected, setAllergySelected] = useState(allergyParsed.selected);
  const [allergyCustom, setAllergyCustom] = useState(allergyParsed.custom);

  const dislikeParsed = parseSelection(initial?.dislikes ?? "", DISLIKE_OPTIONS);
  const [dislikeSelected, setDislikeSelected] = useState(dislikeParsed.selected);
  const [dislikeCustom, setDislikeCustom] = useState(dislikeParsed.custom);

  const cuisineParsed = parseSelection(
    initial?.preferred_cuisines ?? "",
    CUISINE_OPTIONS,
  );
  const [cuisineSelected, setCuisineSelected] = useState(cuisineParsed.selected);

  const [spiceLevel, setSpiceLevel] = useState(initial?.spice_level ?? "보통");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, label: string) {
    const next = new Set(set);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    setSet(next);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setError("로그인이 필요해요.");

      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        household_size: householdSize,
        allergies: combineSelection(allergySelected, allergyCustom),
        dislikes: combineSelection(dislikeSelected, dislikeCustom),
        preferred_cuisines: [...cuisineSelected].join(", "),
        spice_level: spiceLevel,
        notes,
      });
      if (error) return setError(error.message);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    if (step < STEP_COUNT - 1) {
      setStep((s) => s + 1);
    } else {
      save();
    }
  }

  function goPrev() {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-accent" : "bg-card-border"
            }`}
          />
        ))}
      </div>

      <div className="flex min-h-[340px] flex-col items-center gap-5 text-center">
        {step === 0 && (
          <>
            <p className="text-lg font-bold">🧑‍🧑‍🧒 몇 인 가구인가요?</p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setHouseholdSize((n) => Math.max(1, n - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-card-border bg-card text-lg font-bold hover:border-accent hover:text-accent"
              >
                −
              </button>
              <span className="w-16 text-2xl font-bold text-accent">
                {householdSize}인
              </span>
              <button
                type="button"
                onClick={() => setHouseholdSize((n) => n + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-card-border bg-card text-lg font-bold hover:border-accent hover:text-accent"
              >
                +
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-lg font-bold">🤧 알레르기나 못 먹는 재료가 있나요?</p>
            <p className="text-xs text-muted">해당하는 걸 모두 눌러주세요</p>
            <ChipGrid
              options={ALLERGY_OPTIONS}
              selected={allergySelected}
              onToggle={(l) => toggle(allergySelected, setAllergySelected, l)}
            />
            <input
              value={allergyCustom}
              onChange={(e) => setAllergyCustom(e.target.value)}
              placeholder="목록에 없으면 직접 입력 (쉼표로 구분)"
              className="w-full max-w-xs rounded-full border border-card-border bg-card px-3 py-1.5 text-center text-xs"
            />
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-lg font-bold">🙅 싫어하는 음식이나 재료가 있나요?</p>
            <p className="text-xs text-muted">해당하는 걸 모두 눌러주세요</p>
            <ChipGrid
              options={DISLIKE_OPTIONS}
              selected={dislikeSelected}
              onToggle={(l) => toggle(dislikeSelected, setDislikeSelected, l)}
            />
            <input
              value={dislikeCustom}
              onChange={(e) => setDislikeCustom(e.target.value)}
              placeholder="목록에 없으면 직접 입력 (쉼표로 구분)"
              className="w-full max-w-xs rounded-full border border-card-border bg-card px-3 py-1.5 text-center text-xs"
            />
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-lg font-bold">😍 어떤 음식 스타일을 좋아하세요?</p>
            <p className="text-xs text-muted">해당하는 걸 모두 눌러주세요</p>
            <ChipGrid
              options={CUISINE_OPTIONS}
              selected={cuisineSelected}
              onToggle={(l) => toggle(cuisineSelected, setCuisineSelected, l)}
            />
          </>
        )}

        {step === 4 && (
          <>
            <p className="text-lg font-bold">🌶️ 매운맛은 어느 정도로 드세요?</p>
            <div className="grid w-full max-w-sm grid-cols-2 gap-3">
              {SPICE_LEVELS.map((level) => (
                <button
                  key={level.label}
                  type="button"
                  onClick={() => setSpiceLevel(level.label)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 py-6 shadow-sm transition-colors ${
                    spiceLevel === level.label
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-card-border bg-card text-muted hover:border-accent hover:text-accent"
                  }`}
                >
                  <span className="text-3xl">{level.emoji}</span>
                  <span className="text-sm font-semibold">{level.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <p className="text-lg font-bold">📝 마지막으로, 더 알려주고 싶은 게 있나요?</p>
            <p className="text-xs text-muted">
              예: 아이가 있어서 자극적이지 않게, 다이어트 중이라 저칼로리 위주로
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="선택사항이에요. 없으면 비워두세요."
              className="w-full rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
            />
          </>
        )}
      </div>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      {saved && !error && (
        <p className="text-center text-sm text-success">
          저장했어요. 다음 AI 추천부터 반영돼요.
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 0}
          className="rounded-full border border-card-border bg-card px-4 py-2 text-sm font-medium disabled:opacity-0"
        >
          ← 이전
        </button>
        <span className="text-xs text-muted">
          {step + 1} / {STEP_COUNT}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={saving}
          className="rounded-full btn-3d bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {step < STEP_COUNT - 1 ? "다음 →" : saving ? "저장 중..." : "완료"}
        </button>
      </div>
    </div>
  );
}
