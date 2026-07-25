import { Fragment, type ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[0.85em] text-violet-200">{part.slice(1, -1)}</code>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function MarkdownContent({ content }: { content: string }) {
  const normalized = content
    .replace(/\[Source\s+\d+\]/gi, "")
    .replace(/^(#{1,6}\s+.+)$/gm, "\n\n$1\n\n")
    .trim();

  const blocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="space-y-3.5 leading-relaxed text-zinc-200">
      {blocks.map((block, index) => {
        if (block.trim() === "---" || block.trim() === "***" || block.trim() === "___") {
          return <hr key={index} className="my-4 border-t border-white/[.08]" />;
        }
        if (block.startsWith("```") && block.endsWith("```")) {
          return (
            <pre key={index} className="my-2 overflow-x-auto rounded-xl border border-white/[.08] bg-black/50 p-3.5 text-xs leading-5 text-violet-200 font-mono">
              <code>{block.replace(/^```[^\n]*\n?/, "").replace(/```$/, "")}</code>
            </pre>
          );
        }
        if (block.startsWith(">")) {
          return (
            <blockquote key={index} className="my-2 border-l-2 border-violet-400/60 bg-violet-400/[.05] px-3.5 py-2 text-xs italic text-zinc-300 rounded-r-lg">
              {renderInline(block.replace(/^>\s?/, ""))}
            </blockquote>
          );
        }
        const heading = block.match(/^(#{1,3})\s+(.+)/);
        if (heading) {
          const level = heading[1].length;
          if (level === 1) {
            return (
              <h1 key={index} className="mt-5 mb-3 font-heading text-xl font-bold tracking-tight text-violet-200 border-b border-white/[.12] pb-2.5">
                {renderInline(heading[2])}
              </h1>
            );
          }
          if (level === 2) {
            return (
              <h2 key={index} className="mt-4 mb-2 font-heading text-base font-semibold tracking-tight text-violet-300">
                {renderInline(heading[2])}
              </h2>
            );
          }
          return (
            <h3 key={index} className="mt-3 mb-1 text-sm font-semibold text-zinc-200">
              {renderInline(heading[2])}
            </h3>
          );
        }
        const lines = block.split("\n");
        if (lines.every((line) => /^\s*[-*+]\s+/.test(line))) {
          return (
            <ul key={index} className="my-2 list-disc space-y-1.5 pl-5 text-sm text-zinc-200">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^\s*[-*+]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
          return (
            <ol key={index} className="my-2 list-decimal space-y-1.5 pl-5 text-sm text-zinc-200">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^\s*\d+\.\s+/, ""))}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap text-sm leading-6">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}
