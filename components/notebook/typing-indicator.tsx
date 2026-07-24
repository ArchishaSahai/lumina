import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-label="Lumina is thinking">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="size-1.5 rounded-full bg-violet-300"
          animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
          transition={{ duration: 0.9, delay: dot * 0.12, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <span className="ml-1 text-xs text-zinc-500">Lumina is thinking</span>
    </div>
  );
}
