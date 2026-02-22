// openai.ts
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  baseURL: "https://api.featherless.ai/v1",
  apiKey: process.env.FEATHERLESS_API_KEY || "",
});

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callLLM(messages: Message[], temperature = 0.3): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "meta-llama/Meta-Llama-3.1-8B-Instruct",  // use a valid Featherless model
    max_tokens: 4096,
    temperature,
    messages,
  });

  return response.choices[0]?.message.content ?? "";
}

// Helper to strip markdown code fences before JSON.parse
export function extractJSON(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : raw.trim();
}