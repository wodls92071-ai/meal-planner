"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magiclink";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("idle");
    setErrorMessage("");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-2 flex items-center gap-2 text-xl font-bold">
        <span className="text-2xl">🍲</span> 저녁 식단 스케줄러
      </h1>

      <div className="mb-6 flex gap-4 border-b border-card-border text-sm">
        <button
          onClick={() => switchMode("password")}
          className={`pb-2 font-medium ${mode === "password" ? "border-b-2 border-accent text-accent" : "text-muted"}`}
        >
          비밀번호로 로그인
        </button>
        <button
          onClick={() => switchMode("magiclink")}
          className={`pb-2 font-medium ${mode === "magiclink" ? "border-b-2 border-accent text-accent" : "text-muted"}`}
        >
          이메일 링크로 로그인
        </button>
      </div>

      {mode === "password" ? (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-full border border-card-border bg-card px-4 py-2.5 text-sm shadow-sm outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-full border border-card-border bg-card px-4 py-2.5 text-sm shadow-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="btn-3d rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {status === "sending" ? "로그인 중..." : "로그인"}
          </button>
          {status === "error" && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
          <p className="text-xs text-muted">
            비밀번호를 아직 설정 안 하셨다면 &quot;이메일 링크로 로그인&quot;
            탭으로 로그인한 뒤, 프로필 화면에서 비밀번호를 설정해주세요.
          </p>
        </form>
      ) : status === "sent" ? (
        <p className="rounded-2xl bg-success-soft p-4 text-sm text-success">
          {email}로 로그인 링크를 보냈어요. 메일함을 확인해주세요.
        </p>
      ) : (
        <form onSubmit={handleMagicLinkSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-full border border-card-border bg-card px-4 py-2.5 text-sm shadow-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="btn-3d rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {status === "sending" ? "보내는 중..." : "로그인 링크 받기"}
          </button>
          {status === "error" && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
        </form>
      )}
    </main>
  );
}
