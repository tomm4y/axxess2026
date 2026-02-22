// diagnosticAgent.ts
import { callLLM, extractJSON } from "./openai";
import { searchIcdCodes, type IcdMatch } from "./icdSearch";

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

  // Step 2: ICD-10 code via vector similarity search (not LLM guessing)
  let icd: {
    icd_code: string;
    description: string;
    confidence: string;
    confidence_reason: string;
  };

  try {
    // Build a terse symptom summary for embedding
    const symptomText = [
      extraction.symptoms.length > 0 ? extraction.symptoms.join(", ") : "",
      extraction.severity ? `Severity: ${extraction.severity}` : "",
      extraction.duration ? `Duration: ${extraction.duration}` : "",
      extraction.additional_notes || "",
    ]
      .filter(Boolean)
      .join(". ");

    const matches: IcdMatch[] = await searchIcdCodes(symptomText, 3);

    if (matches.length > 0) {
      const best = matches[0];
      const confidence =
        best.similarity >= 0.75
          ? "high"
          : best.similarity >= 0.55
          ? "medium"
          : "low";

      icd = {
        icd_code: best.code,
        description: best.description,
        confidence,
        confidence_reason: `Semantic similarity: ${(best.similarity * 100).toFixed(1)}%. Top ${matches.length} matches: ${matches.map((m) => `${m.code} (${(m.similarity * 100).toFixed(0)}%)`).join(", ")}`,
      };
    } else {
      icd = {
        icd_code: "",
        description: "No matching ICD code found",
        confidence: "low",
        confidence_reason: "No codes exceeded the similarity threshold",
      };
    }
  } catch (err) {
    console.error("ICD vector search error:", err);
    icd = {
      icd_code: "",
      description: "",
      confidence: "",
      confidence_reason: "Vector search failed, see logs",
    };
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