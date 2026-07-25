export function normalizeText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const namedEntities: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
};

export function decodeEntities(value: string) {
  return value
    .replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp|rsquo|lsquo|rdquo|ldquo|ndash|mdash|hellip);/g, (entity) => namedEntities[entity] ?? entity)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      try {
        const code = Number.parseInt(hex, 16);
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    })
    .replace(/&#(\d+);/g, (_, decimal: string) => {
      try {
        const code = Number.parseInt(decimal, 10);
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    });
}
