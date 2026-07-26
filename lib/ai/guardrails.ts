import type { RetrievedChunk, RetrievalPlan } from "./rag";

export const GUARDRAIL_MESSAGES = {
  emptyPrompt: "Ask a question about your uploaded sources and I will help from there.",
  promptTooLong: "That request is a little too long. Try shortening it and ask again.",
  promptInjection: "I can't help with requests that try to override notebook safety instructions. Please ask about your uploaded sources.",
  jailbreak: "I can't help with jailbreak-style requests. Please ask about your uploaded sources.",
  unrelated: "This notebook assistant answers questions only about your uploaded sources.",
  insufficientEvidence: "I couldn't find enough supporting information in your uploaded sources to answer that reliably.",
} as const;

export type GuardrailUseCase = "chat" | "summary" | "roadmap" | "podcast";
export type GuardrailBlockReason = "prompt_injection" | "jailbreak" | "unrelated_query" | "insufficient_context";

export type GuardrailContext = {
  notebookId: string;
  notebookTitle: string;
  notebookDescription?: string | null;
  sourceTitles: string[];
  useCase?: GuardrailUseCase;
};

export type GuardrailConfig = {
  maxPromptLength: number;
  minSimilarity: number;
  minBroadSimilarity: number;
  minChunks: number;
  minBroadChunks: number;
};

type GuardrailPass = { allowed: true };
type GuardrailBlock = { allowed: false; reason: GuardrailBlockReason; message: string };
export type GuardrailDecision = GuardrailPass | GuardrailBlock;

const defaultConfig: GuardrailConfig = {
  maxPromptLength: 8_000,
  minSimilarity: 0.45,
  minBroadSimilarity: 0.25,
  minChunks: 1,
  minBroadChunks: 2,
};

const injectionSignals = [
  { signal: "instruction_override", terms: ["ignore", "disregard", "override", "forget"], targets: ["instructions", "rules", "previous", "above", "developer", "system"] },
  { signal: "system_prompt_exfiltration", terms: ["reveal", "show", "print", "display", "leak", "dump"], targets: ["system prompt", "developer message", "hidden prompt", "instructions"] },
  { signal: "context_abandonment", terms: ["forget", "ignore", "discard"], targets: ["uploaded documents", "sources", "notebook", "context", "documents"] },
];

const jailbreakSignals = [
  "jailbreak",
  "do anything now",
  "dan mode",
  "developer mode",
  "bypass safety",
  "bypass restrictions",
  "no restrictions",
  "uncensored mode",
  "unfiltered mode",
  "ignore policy",
  "break character",
  "you are now an unrestricted",
];

const broadNotebookTerms = new Set(["notebook", "source", "sources", "document", "documents", "file", "files", "video", "pdf", "summary", "summarize", "roadmap", "study", "explain", "overview", "compare", "uploaded", "podcast", "episode", "phase", "task", "objective", "objectives"]);
const stopwords = new Set(["the", "and", "for", "with", "what", "how", "why", "when", "where", "about", "this", "that", "from", "your", "you", "are", "was", "were", "does", "did", "can", "could", "would", "should", "tell", "give", "make", "into", "only", "just", "please"]);

function config(overrides?: Partial<GuardrailConfig>): GuardrailConfig {
  return { ...defaultConfig, ...overrides };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function terms(value: string) {
  return (normalize(value).match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((term) => !stopwords.has(term));
}

function includesAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}

function createBlock(reason: GuardrailBlockReason, message: string, context: GuardrailContext, signal: string, score?: number): GuardrailBlock {
  logGuardrailBlock({ notebookId: context.notebookId, useCase: context.useCase, reason, signal, score });
  return { allowed: false, reason, message };
}

function scorePromptInjection(prompt: string) {
  const normalized = normalize(prompt);
  let best = { score: 0, signal: "none" };
  for (const rule of injectionSignals) {
    const hasTerm = includesAny(normalized, rule.terms);
    const hasTarget = includesAny(normalized, rule.targets);
    const score = hasTerm && hasTarget ? 0.85 : hasTerm ? 0.45 : 0;
    if (score > best.score) best = { score, signal: rule.signal };
  }
  return best;
}

function scoreJailbreak(prompt: string) {
  const normalized = normalize(prompt);
  const signal = jailbreakSignals.find((candidate) => normalized.includes(candidate));
  return signal ? { score: 0.9, signal } : { score: 0, signal: "none" };
}

function relevanceScore(prompt: string, context: GuardrailContext, plan: RetrievalPlan) {
  if (plan.intent === "list_sources") return 1;
  const promptTerms = new Set(terms(prompt));
  if (!promptTerms.size) return 0;
  const notebookTerms = new Set(terms([context.notebookTitle, context.notebookDescription ?? "", ...context.sourceTitles].join(" ")));
  const broadHits = [...promptTerms].filter((term) => broadNotebookTerms.has(term)).length;
  const notebookHits = [...promptTerms].filter((term) => notebookTerms.has(term)).length;
  return Math.min(1, notebookHits * 0.34 + broadHits * 0.18);
}

export function groundedFallback(reason: GuardrailBlockReason) {
  if (reason === "prompt_injection") return GUARDRAIL_MESSAGES.promptInjection;
  if (reason === "jailbreak") return GUARDRAIL_MESSAGES.jailbreak;
  if (reason === "unrelated_query") return GUARDRAIL_MESSAGES.unrelated;
  return GUARDRAIL_MESSAGES.insufficientEvidence;
}

export function logGuardrailBlock(input: { notebookId: string; useCase?: GuardrailUseCase; reason: GuardrailBlockReason; signal: string; score?: number }) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn("[ai-guardrail-block]", input);
}

export function validatePromptSafety(prompt: string, context: GuardrailContext, overrides?: Partial<GuardrailConfig>): GuardrailDecision {
  const settings = config(overrides);
  const trimmed = prompt.trim();
  if (!trimmed) return createBlock("unrelated_query", GUARDRAIL_MESSAGES.emptyPrompt, context, "empty_prompt");
  if (trimmed.length > settings.maxPromptLength) return createBlock("unrelated_query", GUARDRAIL_MESSAGES.promptTooLong, context, "prompt_too_long", trimmed.length);

  const jailbreak = scoreJailbreak(trimmed);
  if (jailbreak.score >= 0.8) return createBlock("jailbreak", GUARDRAIL_MESSAGES.jailbreak, context, jailbreak.signal, jailbreak.score);

  const injection = scorePromptInjection(trimmed);
  if (injection.score >= 0.72) return createBlock("prompt_injection", GUARDRAIL_MESSAGES.promptInjection, context, injection.signal, injection.score);

  return { allowed: true };
}

export function validateNotebookRelevance(prompt: string, context: GuardrailContext, plan: RetrievalPlan): GuardrailDecision {
  const score = relevanceScore(prompt, context, plan);
  if (score < 0.18 && context.sourceTitles.length > 0) {
    return createBlock("unrelated_query", GUARDRAIL_MESSAGES.unrelated, context, "low_notebook_relevance", score);
  }
  return { allowed: true };
}

export function validatePreRetrievalGuardrails(prompt: string, context: GuardrailContext, plan: RetrievalPlan, overrides?: Partial<GuardrailConfig>): GuardrailDecision {
  const safety = validatePromptSafety(prompt, context, overrides);
  if (!safety.allowed) return safety;
  return validateNotebookRelevance(prompt, context, plan);
}

export function validateRetrievalEvidence(chunks: RetrievedChunk[], context: GuardrailContext, plan: RetrievalPlan, overrides?: Partial<GuardrailConfig>): GuardrailDecision {
  if (plan.intent === "list_sources") return { allowed: true };
  const settings = config(overrides);
  const topScore = Math.max(0, ...chunks.map((chunk) => chunk.score));
  const minimumTopScore = plan.broad ? settings.minBroadSimilarity : settings.minSimilarity;
  const minimumChunks = plan.broad ? Math.min(settings.minBroadChunks, Math.max(plan.limit, settings.minBroadChunks)) : settings.minChunks;

  if (chunks.length < minimumChunks) {
    return createBlock("insufficient_context", GUARDRAIL_MESSAGES.insufficientEvidence, context, "insufficient_chunks", chunks.length);
  }

  if (topScore < minimumTopScore) {
    return createBlock("insufficient_context", GUARDRAIL_MESSAGES.insufficientEvidence, context, "low_similarity", topScore);
  }

  return { allowed: true };
}

export function validateGroundedOutput(answer: string, chunks: RetrievedChunk[], context: GuardrailContext, supportedChunkCount: number): { answer: string; supported: boolean } {
  if (!answer.trim()) {
    logGuardrailBlock({ notebookId: context.notebookId, useCase: context.useCase, reason: "insufficient_context", signal: "empty_output" });
    return { answer: GUARDRAIL_MESSAGES.insufficientEvidence, supported: false };
  }
  const negativeAnswer = /couldn'?t find|not enough|not mentioned|not provided|does not contain|uploaded sources/i.test(answer);
  if (!negativeAnswer && chunks.length > 0 && supportedChunkCount === 0) {
    logGuardrailBlock({ notebookId: context.notebookId, useCase: context.useCase, reason: "insufficient_context", signal: "no_supporting_citations" });
    return { answer: GUARDRAIL_MESSAGES.insufficientEvidence, supported: false };
  }
  return { answer, supported: true };
}
