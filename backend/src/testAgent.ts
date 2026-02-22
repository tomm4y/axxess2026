// testAgent.ts — usage: npx tsx src/testAgent.ts <roomId> <sessionId>
import { diagnosticAgent } from "./agent";
import { getSessionTranscript } from "./storage";

const [roomId, sessionId] = process.argv.slice(2);

if (!roomId || !sessionId) {
  console.error("Usage: npx tsx src/testAgent.ts <roomId> <sessionId>");
  process.exit(1);
}

async function main() {
  console.log(`Fetching transcript for room ${roomId}, session ${sessionId}...\n`);

  const transcriptData = await getSessionTranscript(roomId, sessionId);

  // Convert segments into a readable conversation string
  const conversation = transcriptData.segments
    .map((seg) => {
      const speaker = seg.role ?? "Unknown";
      return `${speaker}: ${seg.text}`;
    })
    .join("\n");

  console.log("Transcript:\n", conversation, "\n");
  console.log("Running diagnostic agent...\n");

  const result = await diagnosticAgent(conversation);

  console.log("Done!\n");
  console.log("Extraction:", JSON.stringify(result.extraction, null, 2));
  console.log("ICD Code:  ", JSON.stringify(result.icd, null, 2));
  console.log("Summary:\n ", result.summary);
}

main().catch(console.error);