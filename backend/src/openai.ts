import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.featherless.ai/v1",
  apiKey: process.env.FEATHERLESS_API_KEY || "",
});

export async function generateResponse(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string> {
  const chatCompletion = await openai.chat.completions.create({
    model: "zai-org/GLM-5",
    max_tokens: 4096,
    messages,
  });

  return chatCompletion.choices[0]?.message.content ?? "";
}
