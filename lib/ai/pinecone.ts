import { Pinecone } from "@pinecone-database/pinecone";

const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY ?? "" });

export function getPineconeIndex() {
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!indexName) throw new Error("PINECONE_INDEX_NAME is not configured.");
  return client.index(indexName);
}
