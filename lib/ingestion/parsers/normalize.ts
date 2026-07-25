export function normalizeText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function decodeEntities(value: string) {
  return value.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " })[entity] ?? entity);
}
