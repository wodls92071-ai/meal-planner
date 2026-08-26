import Link from "next/link";
import {
  CalendarTabIcon,
  RecipeTabIcon,
  ChatTabIcon,
  CartTabIcon,
  ProfileTabIcon,
} from "@/components/icons";

const TILES = [
  {
    href: "/calendar",
    label: "#이번주 뭐 먹지",
    title: "식단표",
    Icon: CalendarTabIcon,
    className: "bg-accent text-accent-foreground",
  },
  {
    href: "/recipes",
    label: "#내 레시피 모음",
    title: "레시피",
    Icon: RecipeTabIcon,
    className: "bg-[#1b2464] text-white",
  },
  {
    href: "/assistant",
    label: "#AI한테 물어보기",
    title: "AI 채팅",
    Icon: ChatTabIcon,
    className: "bg-[#5b7bf5] text-white",
  },
  {
    href: "/shopping-list",
    label: "#오늘 장보러가기",
    title: "장보기",
    Icon: CartTabIcon,
    className: "bg-accent-soft text-accent-soft-foreground",
  },
  {
    href: "/profile",
    label: "#내 취향 설정",
    title: "프로필",
    Icon: ProfileTabIcon,
    className: "bg-accent-hover text-white",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">저녁 식단 스케줄러</h1>
        <p className="mt-1 text-sm text-muted">
          오늘 저녁은 뭘 만들지, 눌러서 시작해보세요.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TILES.map(({ href, label, title, Icon, className }) => (
          <Link
            key={href}
            href={href}
            className={`flex aspect-square flex-col justify-between rounded-3xl p-5 shadow-sm transition-transform hover:-translate-y-0.5 ${className}`}
          >
            <Icon size={44} strokeWidth={1.5} />
            <div>
              <div className="text-sm font-bold">{title}</div>
              <div className="mt-0.5 text-xs opacity-80">{label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
