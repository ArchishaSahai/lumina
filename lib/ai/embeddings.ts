import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini";

export const embeddingDimensions = 1536;

export async function embedText(value: string) {
  const { embedding } = await embed({
    model: openai.embedding(EMBEDDING_MODEL),
    value,
  });

  return embedding;
}

export function getChatModel() {
  return openai(CHAT_MODEL);
}
