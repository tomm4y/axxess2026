import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.featherless.ai/v1",
  apiKey: process.env.FEATHERLESS_API_KEY || "",
});

export async function callLLM(messages: any) {
  const response = await openai.chat.completions.create({
    model: "zai-org/GLM-5",
    max_tokens: 4096,
    messages,
  });

  return response.choices[0]?.message.content ?? "";
}