import { Headphones, ListTree, Settings, Files } from "lucide-react";

const actions = [{ label: "Generate podcast", icon: Headphones }, { label: "Generate roadmap", icon: ListTree }, { label: "View sources", icon: Files }, { label: "Settings", icon: Settings }];

export function QuickActions() {
  return <section className="mt-7"><h2 className="text-xs font-semibold uppercase tracking-[.16em] text-zinc-500">Quick actions</h2><div className="mt-3 grid grid-cols-2 gap-2">{actions.map(({ label, icon: Icon }) => <button type="button" key={label} className="group flex min-h-20 cursor-pointer flex-col justify-between rounded-xl border border-white/[.08] bg-white/[.035] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-violet-300/30 hover:bg-violet-400/[.08]"><Icon className="size-4 text-violet-300" /><span className="text-xs font-medium text-zinc-300 group-hover:text-white">{label}</span></button>)}</div></section>;
}
