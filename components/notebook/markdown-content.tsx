import { Fragment, type ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[0.85em] text-violet-200">{part.slice(1, -1)}</code>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function MarkdownContent({ content }: { content: string }) {
  const blocks = content.replace(/\[Source\s+\d+\]/gi, "").trim().split(/\n{2,}/);

  return <div className="space-y-3">{blocks.map((block, index) => {
    if (block.startsWith("```") && block.endsWith("```")) return <pre key={index} className="overflow-x-auto rounded-xl bg-black/45 p-3 text-xs leading-5 text-zinc-200"><code>{block.replace(/^```[^\n]*\n?/, "").replace(/```$/, "")}</code></pre>;
    const heading = block.match(/^(#{1,3})\s+(.+)/);
    if (heading) {
      const headingClass = heading[1].length === 1 ? "text-lg" : heading[1].length === 2 ? "text-base" : "text-sm";
      return <p key={index} className={`${headingClass} font-semibold tracking-tight text-white`}>{renderInline(heading[2])}</p>;
    }
    const lines = block.split("\n");
    if (lines.every((line) => /^\s*[-*+]\s+/.test(line))) return <ul key={index} className="list-disc space-y-1 pl-5">{lines.map((line, lineIndex) => <li key={lineIndex}>{renderInline(line.replace(/^\s*[-*+]\s+/, ""))}</li>)}</ul>;
    if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) return <ol key={index} className="list-decimal space-y-1 pl-5">{lines.map((line, lineIndex) => <li key={lineIndex}>{renderInline(line.replace(/^\s*\d+\.\s+/, ""))}</li>)}</ol>;
    return <p key={index} className="whitespace-pre-wrap">{renderInline(block)}</p>;
  })}</div>;
}
