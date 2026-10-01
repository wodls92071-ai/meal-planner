"use client";

import { useState } from "react";

export function ReviewImageDownloader() {
  const [url, setUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function load(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImages([]);
    setSelected(new Set());
    try {
      const res = await fetch("/api/coupang-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "실패했어요.");
      setImages(data.images);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(src: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });
  }

  function downloadHref(src: string, i: number) {
    return `/api/coupang-reviews/download?url=${encodeURIComponent(src)}&name=review-${i + 1}.jpg`;
  }

  async function downloadSelected() {
    const picked = images
      .map((src, i) => ({ src, i }))
      .filter(({ src }) => selected.has(src));
    for (const { src, i } of picked) {
      const a = document.createElement("a");
      a.href = downloadHref(src, i);
      a.download = `review-${i + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={load} className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="쿠팡 상품 링크를 붙여넣으세요"
          className="min-w-0 flex-1 rounded-xl border border-card-border bg-card px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {loading ? "불러오는 중…" : "불러오기"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {searched && !error && images.length === 0 && (
        <p className="text-sm text-muted">사진이 있는 리뷰를 찾지 못했어요.</p>
      )}

      {images.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              {images.length}장 중 {selected.size}장 선택
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-accent"
                onClick={() =>
                  setSelected(
                    selected.size === images.length ? new Set() : new Set(images),
                  )
                }
              >
                {selected.size === images.length ? "전체 해제" : "전체 선택"}
              </button>
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={downloadSelected}
                className="font-bold text-accent disabled:opacity-40"
              >
                선택 다운로드
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((src, i) => {
              const on = selected.has(src);
              return (
                <button
                  type="button"
                  key={src}
                  onClick={() => toggle(src)}
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 ${
                    on ? "border-accent" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`리뷰 이미지 ${i + 1}`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {on && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
