import { callLLM } from "./openai";

export async function diagnosticAgent(conversation: string) {

  // 1️⃣ Extract medical data
  const extractionPrompt = [
    {
      role: "system",
      content: `
      Extract medical information from the conversation.

      Return strictly valid JSON in this format:
      {
        "symptoms": [],
        "duration": "",
        "severity": "",
        "additional_notes": ""
      }
      Do not include any extra text.`
    },
    {
      role: "user",
      content: conversation,
    },
  ];

  const extraction = await callLLM(extractionPrompt);

  // 2️⃣ Map ICD code
  const icdPrompt = [
    {
      role: "system",
      content: "Based on this structured data, suggest ICD-10 code in JSON.",
    },
    {
      role: "user",
      content: extraction,
    },
  ];

  const icd = await callLLM(icdPrompt);

  // 3️⃣ Patient-friendly summary
  const summaryPrompt = [
    {
      role: "system",
      content: "Convert medical data into patient-friendly explanation.",
    },
    {
      role: "user",
      content: extraction,
    },
  ];

  const summary = await callLLM(summaryPrompt);

  return {
    extraction,
    icd,
    summary,
  };
}