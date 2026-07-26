"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type DashboardTab = "notebooks" | "roadmaps" | "podcasts";

const tabs: Array<{ id: DashboardTab; label: string; href: string }> = [
  { id: "notebooks", label: "Notebooks", href: "/dashboard" },
  { id: "roadmaps", label: "Roadmaps", href: "/dashboard/roadmaps" },
  { id: "podcasts", label: "Podcasts", href: "/dashboard/podcasts" },
];

export function DashboardHeader({ activeTab, contextLabel }: { activeTab: DashboardTab; contextLabel: string }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const initials = (user?.firstName?.[0] ?? user?.lastName?.[0] ?? "L").toUpperCase();

  return (
    <header className="border-b border-white/[.1] bg-zinc-950/85 backdrop-blur-xl">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center">
          <Link href="/dashboard" className="cursor-pointer text-lg font-semibold tracking-[-.04em] text-white transition-colors hover:text-violet-200">
            Lumina
          </Link>
        </div>

        <nav className="flex items-center gap-1.5 rounded-full border border-white/[.14] bg-white/[.07] p-1.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 font-semibold transition-all ${
                  active
                    ? "bg-violet-500/20 text-white shadow-[0_0_8px_rgba(139,92,246,0.18),inset_0_1px_0_rgba(255,255,255,.08)]"
                    : "text-zinc-300 hover:bg-white/[.08] hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{user?.fullName ?? "Lumina member"}</p>
            <p className="text-xs text-zinc-500">{contextLabel}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Open account menu" className="cursor-pointer rounded-full outline-none transition-transform hover:scale-105">
                <Avatar>
                  <AvatarImage src={user?.imageUrl} alt="Your profile" />
                  <AvatarFallback className="bg-violet-500/20 text-violet-200">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 border border-white/[.1] bg-zinc-950 p-1 text-white shadow-xl">
              <DropdownMenuLabel className="px-2 py-1.5 text-zinc-400">{user?.fullName ?? "Lumina member"}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[.08]" />
              <DropdownMenuItem onSelect={() => signOut({ redirectUrl: "/" })} className="cursor-pointer px-2 py-2 text-zinc-300 focus:bg-white/[.08] focus:text-white">
                <LogOut className="size-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
