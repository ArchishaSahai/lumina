import { Compass, Files, Headphones } from "lucide-react";

type Props = {
  onGenerateSummary?: () => void;
  onGenerateRoadmap?: () => void;
  onOpenRoadmap?: () => void;
  onGeneratePodcast?: () => void;
};

export function QuickActions({ onGenerateSummary, onGenerateRoadmap, onOpenRoadmap, onGeneratePodcast }: Props) {
  const actions = [
    { label: onOpenRoadmap ? "Open roadmap" : "Generate roadmap", icon: Compass, onClick: onOpenRoadmap || onGenerateRoadmap, fullWidth: true },
    { label: "Generate summary", icon: Files, onClick: onGenerateSummary },
    { label: "Generate podcast", icon: Headphones, onClick: onGeneratePodcast },
  ];

  return (
    <section className="mt-7">
      <h2 className="text-xs font-semibold uppercase tracking-[.16em] text-zinc-500">Quick actions</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {actions.map(({ label, icon: Icon, onClick, fullWidth }) => (
          <button
            type="button"
            key={label}
            onClick={onClick}
            className={`group flex min-h-20 cursor-pointer flex-col justify-between rounded-xl border border-white/[.08] bg-white/[.035] p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-violet-500/10 hover:shadow-[0_4px_20px_rgba(139,92,246,0.12)] active:scale-[0.98] ${
              fullWidth ? "col-span-2" : ""
            }`}
          >
            <Icon className="size-4 text-violet-300 transition-transform duration-300 group-hover:scale-110" />
            <span className="text-xs font-medium text-zinc-300 group-hover:text-white">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
