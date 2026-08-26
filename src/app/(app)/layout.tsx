import { NavBar } from "@/components/NavBar";
import { BottomTabBar } from "@/components/BottomTabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 pb-28">
        {children}
      </div>
      <BottomTabBar />
    </div>
  );
}
