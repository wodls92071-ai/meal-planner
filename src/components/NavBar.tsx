import Link from "next/link";

export function NavBar() {
  return (
    <header className="border-b border-card-border bg-card">
      <div className="mx-auto flex max-w-3xl items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-1.5 font-bold">
          <span className="text-lg">🍲</span> 식단표
        </Link>
      </div>
    </header>
  );
}
