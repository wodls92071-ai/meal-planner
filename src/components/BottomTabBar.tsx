"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarTabIcon,
  RecipeTabIcon,
  ChatTabIcon,
  CartTabIcon,
  ProfileTabIcon,
} from "@/components/icons";

const TABS = [
  { href: "/calendar", label: "식단표", Icon: CalendarTabIcon },
  { href: "/recipes", label: "레시피", Icon: RecipeTabIcon },
  { href: "/assistant", label: "AI 채팅", Icon: ChatTabIcon },
  { href: "/shopping-list", label: "장보기", Icon: CartTabIcon },
  { href: "/profile", label: "프로필", Icon: ProfileTabIcon },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-card-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-3xl items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-accent" : "text-muted hover:text-accent"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2 : 1.6} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
