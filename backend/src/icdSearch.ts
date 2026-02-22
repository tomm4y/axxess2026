// icdSearch.ts — Vector-based ICD-10 code lookup via Supabase pgvector
import OpenAI from "openai";
import dotenv from "dotenv";
import { getSupabaseAdmin } from "./supabase";

dotenv.config();

const embeddingClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface IcdMatch {
  code: string;
  description: string;
  similarity: number;
}

// Embed a symptom summary and search against the ICD-10 vector store.
// Returns the top matching ICD codes sorted by similarity.

export async function searchIcdCodes(
  symptomSummary: string,
  matchCount = 5,
  matchThreshold = 0.4
): Promise<IcdMatch[]> {
  // 1. Embed the symptom text
  const embeddingResponse = await embeddingClient.embeddings.create({
    model: "text-embedding-3-small",
    input: symptomSummary,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // 2. Call the Supabase RPC function
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("match_icd_codes", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error("[icdSearch] Supabase RPC error:", error.message);
    return [];
  }

  return (data as IcdMatch[]) || [];
}
