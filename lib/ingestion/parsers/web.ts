import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { load } from "cheerio";
import type { SourceParser } from "../types";
import { normalizeText } from "./normalize";

export const websiteParser: SourceParser = {
  async parse(input) {
    if (!input.url) throw new Error("Website source has no URL.");
    const response = await fetchPublicUrl(input.url);
    if (!response.ok) throw new Error(`Website returned HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) throw new Error("Website did not return readable HTML or text.");
    const html = await response.text();
    const $ = load(html);
    $("script, style, noscript, svg, canvas, nav, footer, form").remove();
    const root = $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");
    root.find("br").replaceWith("\n");
    root.find("p, h1, h2, h3, h4, h5, h6, li, blockquote, pre").each((_, element) => { $(element).append("\n\n"); });
    const text = normalizeText(root.text());
    if (!text) throw new Error("No readable text was found on this website.");
    return { text, segments: [{ text }] };
  },
};

async function fetchPublicUrl(initialUrl: string) {
  let url = new URL(initialUrl);
  for (let redirect = 0; redirect <= 5; redirect += 1) {
    await assertPublicHttpUrl(url);
    const response = await fetch(url, { redirect: "manual", headers: { "User-Agent": "LuminaSourceProcessor/1.0" }, signal: AbortSignal.timeout(15_000) });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("Website redirect had no destination.");
    url = new URL(location, url);
  }
  throw new Error("Website redirected too many times.");
}

async function assertPublicHttpUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP and HTTPS website URLs are supported.");
  if (url.username || url.password) throw new Error("Website URLs cannot contain credentials.");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Private network website URLs are not allowed.");
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const value = address.toLowerCase();
  return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") || value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
}
