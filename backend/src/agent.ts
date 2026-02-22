import { callLLM } from "./openai";

export async function diagnosticAgent(conversation: string) {
  // 
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
`
    },
    {
      role: "user",
      content: conversation,
    },
  ];

  const extractionRaw = await callLLM(extractionPrompt);

  // 
  let extraction;
  try {
    extraction = JSON.parse(extractionRaw);
  } catch (err) {
    console.error("Extraction JSON parse error:", extractionRaw);
    extraction = {
      symptoms: [],
      duration: "",
      severity: "",
      additional_notes: "",
    };
  }

  // 
  const icdPrompt = [
    {
      role: "system",
      content: `
Based on this structured data, suggest ICD-10 code in JSON:
{
  "icd_code": "",
  "description": "",
  "confidence": ""
}
Do not include extra text.`
    },
    {
      role: "user",
      content: JSON.stringify(extraction), // send structured data as string
    },
  ];

  const icdRaw = await callLLM(icdPrompt);

  let icd;
  try {
    icd = JSON.parse(icdRaw);
  } catch (err) {
    console.error("ICD JSON parse error:", icdRaw);
    icd = { icd_code: "", description: "", confidence: "" };
  }

  //
  const summaryPrompt = [
    {
      role: "system",
      content: "Convert medical data into patient-friendly explanation."
    },
    {
      role: "user",
      content: JSON.stringify(extraction),
    },
  ];

  const summary = await callLLM(summaryPrompt);

  return {
    extraction,
    icd,
    summary,
  };
}