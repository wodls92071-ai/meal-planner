"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordRow() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setErrorMessage("");

    if (password.length < 6) {
      setStatus("error");
      setErrorMessage("비밀번호는 6자 이상이어야 해요.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setErrorMessage("비밀번호가 서로 달라요.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("done");
    setPassword("");
    setConfirm("");
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-1 py-3.5 text-sm transition-colors hover:text-accent"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-base">
            🔒
          </span>
          비밀번호 설정
        </span>
        <span className="text-muted">{open ? "︿" : "›"}</span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-1 pb-4">
          <input
            type="password"
            required
            placeholder="새 비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-card-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            placeholder="비밀번호 확인"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="rounded-xl border border-card-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={saving}
            className="self-start rounded-full btn-3d bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "저장 중..." : "비밀번호 저장"}
          </button>
          {status === "error" && (
            <p className="text-xs text-red-600">{errorMessage}</p>
          )}
          {status === "done" && (
            <p className="text-xs text-success">
              설정 완료! 이제 이메일+비밀번호로 로그인할 수 있어요.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
