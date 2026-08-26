"use client";

import { useState } from "react";
import Link from "next/link";
import { RecipeForm } from "@/components/RecipeForm";
import {
  SearchTabIcon,
  SparkleTabIcon,
  PlayTabIcon,
  LinkTabIcon,
  PencilTabIcon,
} from "@/components/icons";
import type { Ingredient, RecipeCategory } from "@/types/database";

type ExternalResult = {
  externalId: string;
  title: string;
  imageUrl: string | null;
  ingredients: Ingredient[];
  instructions: string[];
};

type GeneratedRecipe = {
  title: string;
  category: RecipeCategory;
  ingredients: Ingredient[];
  instructions: string[];
};

type YoutubeVideoResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

type Mode = "search" | "ai" | "youtube-search" | "youtube-link" | "custom";

const MODE_TILES: {
  mode: Mode;
  label: string;
  Icon: typeof SearchTabIcon;
  className: string;
}[] = [
  {
    mode: "search",
    label: "레시피 검색",
    Icon: SearchTabIcon,
    className: "bg-accent text-accent-foreground",
  },
  {
    mode: "ai",
    label: "AI로 만들기",
    Icon: SparkleTabIcon,
    className: "bg-[#1b2464] text-white",
  },
  {
    mode: "youtube-search",
    label: "유튜브 음식 검색",
    Icon: PlayTabIcon,
    className: "bg-[#5b7bf5] text-white",
  },
  {
    mode: "youtube-link",
    label: "유튜브 링크로 분석",
    Icon: LinkTabIcon,
    className: "bg-[#2952c8] text-white",
  },
  {
    mode: "custom",
    label: "직접 입력",
    Icon: PencilTabIcon,
    className: "bg-accent-soft text-accent-soft-foreground",
  },
];

export default function NewRecipePage() {
  const [mode, setMode] = useState<Mode>("search");

  // 식품안전나라 DB 검색
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExternalResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selected, setSelected] = useState<ExternalResult | null>(null);

  // AI 생성 / 유튜브 분석 (둘 다 결과 형태가 같음)
  const [aiQuery, setAiQuery] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generated, setGenerated] = useState<GeneratedRecipe | null>(null);

  // 유튜브 영상 검색
  const [ytQuery, setYtQuery] = useState("");
  const [ytResults, setYtResults] = useState<YoutubeVideoResult[]>([]);
  const [ytSearching, setYtSearching] = useState(false);
  const [ytSearchError, setYtSearchError] = useState("");
  const [analyzingVideoId, setAnalyzingVideoId] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setSelected(null);
    setGenerated(null);
    setSearchError("");
    setGenerateError("");
    setYtResults([]);
    setYtSearchError("");
    setAnalyzingVideoId(null);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    setSelected(null);

    try {
      const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색 실패");
      setResults(data.results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "검색 실패");
    } finally {
      setSearching(false);
    }
  }

  async function handleAiGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setGenerating(true);
    setGenerateError("");
    setGenerated(null);

    try {
      const res = await fetch("/api/recipes/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      setGenerated(data.recipe);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "생성 실패");
    } finally {
      setGenerating(false);
    }
  }

  async function extractFromUrl(url: string) {
    setGenerating(true);
    setGenerateError("");
    setGenerated(null);

    try {
      const res = await fetch("/api/recipes/from-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석 실패");
      setGenerated(data.recipe);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "분석 실패");
    } finally {
      setGenerating(false);
    }
  }

  async function handleYoutubeExtract(e: React.FormEvent) {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    await extractFromUrl(youtubeUrl);
  }

  async function handleYoutubeSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!ytQuery.trim()) return;
    setYtSearching(true);
    setYtSearchError("");
    setYtResults([]);

    try {
      const res = await fetch(`/api/recipes/youtube-search?q=${encodeURIComponent(ytQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색 실패");
      setYtResults(data.results);
    } catch (err) {
      setYtSearchError(err instanceof Error ? err.message : "검색 실패");
    } finally {
      setYtSearching(false);
    }
  }

  async function handleSelectYoutubeVideo(videoId: string) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    setYoutubeUrl(url);
    setAnalyzingVideoId(videoId);
    await extractFromUrl(url);
    setAnalyzingVideoId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/recipes" className="text-xs font-medium text-muted hover:text-accent">
          ← 레시피 목록
        </Link>
        <h1 className="mt-1 text-xl font-bold">레시피 추가</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MODE_TILES.map(({ mode: m, label, Icon, className }) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex flex-col items-start justify-between gap-4 rounded-3xl p-4 text-left shadow-sm transition-all ${className} ${
              mode === m
                ? "ring-2 ring-offset-2 ring-offset-background ring-accent"
                : "opacity-80 hover:opacity-100 hover:-translate-y-0.5"
            }`}
          >
            <Icon size={26} strokeWidth={1.6} />
            <span className="text-sm font-bold">{label}</span>
          </button>
        ))}
      </div>

      {mode === "search" && !selected && (
        <div className="flex flex-col gap-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 된장찌개"
              className="flex-1 rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-full btn-3d bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {searching ? "검색 중..." : "검색"}
            </button>
          </form>

          {searchError && <p className="text-sm text-red-600">{searchError}</p>}

          <ul className="flex flex-col gap-2">
            {results.map((r) => (
              <li
                key={r.externalId}
                className="flex items-center justify-between rounded-xl border border-card-border bg-card px-4 py-3 shadow-sm"
              >
                <span className="text-sm">{r.title}</span>
                <button
                  onClick={() => setSelected(r)}
                  className="rounded-full border border-card-border px-3 py-1 text-xs font-medium hover:border-accent hover:text-accent"
                >
                  이 레시피로 시작
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === "search" && selected && (
        <RecipeForm
          initial={{
            title: selected.title,
            imageUrl: selected.imageUrl,
            ingredients: selected.ingredients,
            instructions: selected.instructions,
            source: "external",
            externalId: selected.externalId,
          }}
        />
      )}

      {mode === "ai" && !generated && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            요리 이름이나 원하는 스타일을 적으면 Gemini가 재료·조리순서를
            만들어줘요.
          </p>
          <form onSubmit={handleAiGenerate} className="flex gap-2">
            <input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="예: 매운 두부조림, 아이도 잘 먹는 소고기 볶음밥"
              className="flex-1 rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={generating}
              className="rounded-full btn-3d bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {generating ? "만드는 중..." : "생성"}
            </button>
          </form>
          {generateError && <p className="text-sm text-red-600">{generateError}</p>}
        </div>
      )}

      {mode === "youtube-search" && !generated && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            요리 이름을 검색하면 추천 유튜브 레시피 영상을 보여줘요.
            &quot;선택하기&quot;를 누르면 Gemini가 그 영상을 보고 레시피를
            정리해줘요.
          </p>
          <form onSubmit={handleYoutubeSearch} className="flex gap-2">
            <input
              value={ytQuery}
              onChange={(e) => setYtQuery(e.target.value)}
              placeholder="예: 된장찌개"
              className="flex-1 rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={ytSearching}
              className="rounded-full btn-3d bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {ytSearching ? "검색 중..." : "검색"}
            </button>
          </form>
          {ytSearchError && (
            <p className="text-sm text-red-600">{ytSearchError}</p>
          )}

          {ytResults.length > 0 && (
            <ul className="flex flex-col gap-2">
              {ytResults.map((v) => (
                <li
                  key={v.videoId}
                  className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3 shadow-sm"
                >
                  {v.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnailUrl}
                      alt={v.title}
                      className="h-16 w-24 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{v.title}</span>
                    <span className="truncate text-xs text-muted">{v.channelTitle}</span>
                  </div>
                  <button
                    onClick={() => handleSelectYoutubeVideo(v.videoId)}
                    disabled={generating}
                    className="shrink-0 rounded-full border border-card-border px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {analyzingVideoId === v.videoId ? "분석 중..." : "선택하기"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {generateError && <p className="text-sm text-red-600">{generateError}</p>}
        </div>
      )}

      {mode === "youtube-link" && !generated && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            공개된 요리 유튜브 영상 링크를 넣으면 Gemini가 영상을 보고
            레시피를 정리해줘요.
          </p>
          <form onSubmit={handleYoutubeExtract} className="flex gap-2">
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={generating}
              className="rounded-full btn-3d bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {generating ? "분석 중..." : "분석"}
            </button>
          </form>
          {generateError && <p className="text-sm text-red-600">{generateError}</p>}
        </div>
      )}

      {(mode === "ai" || mode === "youtube-search" || mode === "youtube-link") && generated && (
        <RecipeForm
          initial={{
            title: generated.title,
            imageUrl: null,
            category: generated.category,
            ingredients: generated.ingredients,
            instructions: generated.instructions,
            source: "custom",
          }}
        />
      )}

      {mode === "custom" && <RecipeForm />}
    </div>
  );
}
