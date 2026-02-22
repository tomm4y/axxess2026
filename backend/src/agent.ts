// diagnosticAgent.ts
import { callLLM, extractJSON } from "./openai";

export async function diagnosticAgent(conversation: string) {
  // Step 1: Extract structured medical info (now includes vitals)
  const extractionPrompt = [
    {
      role: "system" as const,
      content: `Extract medical information from the conversation.
Return ONLY valid JSON, no extra text, no markdown:
{
  "symptoms": [],
  "duration": "",
  "severity": "",
  "vitals": {
    "temperature": "",
    "blood_pressure": "",
    "heart_rate": "",
    "oxygen_saturation": ""
  },
  "additional_notes": ""
}
If a vital is not mentioned, leave it as empty string.`,
    },
    {
      role: "user" as const,
      content: conversation,
    },
  ];

  const extractionRaw = await callLLM(extractionPrompt, 0.1);

  let extraction: {
    symptoms: string[];
    duration: string;
    severity: string;
    vitals: {
      temperature: string;
      blood_pressure: string;
      heart_rate: string;
      oxygen_saturation: string;
    };
    additional_notes: string;
  };

  try {
    extraction = JSON.parse(extractJSON(extractionRaw));
  } catch (err) {
    console.error("Extraction JSON parse error:", extractionRaw);
    extraction = {
      symptoms: [],
      duration: "",
      severity: "",
      vitals: {
        temperature: "",
        blood_pressure: "",
        heart_rate: "",
        oxygen_saturation: "",
      },
      additional_notes: "",
    };
  }

  // Step 2: Suggest ICD-10 code
  const icdPrompt = [
    {
      role: "system" as const,
      content: `Based on the structured patient data, suggest the most fitting ICD-10 code.
Return ONLY valid JSON, no extra text, no markdown:
{
  "icd_code": "",
  "description": "",
  "confidence": "high | medium | low",
  "confidence_reason": ""
}`,
    },
    {
      role: "user" as const,
      content: JSON.stringify(extraction),
    },
  ];

  const icdRaw = await callLLM(icdPrompt, 0.1);

  let icd: {
    icd_code: string;
    description: string;
    confidence: string;
    confidence_reason: string;
  };

  try {
    icd = JSON.parse(extractJSON(icdRaw));
  } catch (err) {
    console.error("ICD JSON parse error:", icdRaw);
    icd = { icd_code: "", description: "", confidence: "", confidence_reason: "" };
  }

  // Step 3: Short patient-friendly summary
  const summaryPrompt = [
    {
      role: "system" as const,
      content: `You are a helpful medical assistant. 
Summarize the patient's condition in 2-3 sentences max.
- Use simple, plain English
- Mention key symptoms and any notable vitals (fever, BP, etc.) if present
- Do NOT mention ICD codes or medical jargon
- Keep it short and reassuring`,
    },
    {
      role: "user" as const,
      content: JSON.stringify({ extraction, icd }),
    },
  ];

  const summary = await callLLM(summaryPrompt, 0.4);

  return {
    extraction,
    icd,
    summary,
  };
}