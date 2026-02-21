import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.featherless.ai/v1",
  apiKey: "rc_04fe4df5608a3f0e2ce87b6650c782494b77787d2afdb8e967f9e2854a78acab"// process.env.FEATHERLESS_API_KEY || "",
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
