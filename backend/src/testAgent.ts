// simpleTest.ts
import { diagnosticAgent } from "./agent";

// Simulates what your Speech-to-Text engine would output
const mockTranscript = `
  Doctor: Good morning, what seems to be the problem today?
  Patient: I've been having chest pain for about two days now. 
  It gets worse when I breathe deeply. Also a mild fever, maybe 100.4.
  Doctor: On a scale of 1 to 10, how bad is the pain?
  Patient: About a 6. It's sharp, on the right side.
`;

async function main() {
  console.log(" Mock transcript received from STT engine...\n");
  console.log("  Running diagnostic agent...\n");

  const result = await diagnosticAgent(mockTranscript);

  console.log("Done!\n");
  console.log(" Extraction:", JSON.stringify(result.extraction, null, 2));
  console.log(" ICD Code:  ", JSON.stringify(result.icd, null, 2));
  console.log(" Summary:\n ", result.summary);
}

main().catch(console.error);