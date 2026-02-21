import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = "https://ajdzgecxzrryyiwznqku.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error("SUPABASE_ANON_KEY environment variable is required");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = "assets";

export async function createSessionFolder(roomId: string, sessionId: string): Promise<void> {
  const path = `room-${roomId}/session-${sessionId}/.keep`;
  await supabase.storage.from(BUCKET_NAME).upload(path, new Blob([""]));
}

export async function putSessionTranscript(roomId: string, sessionId: string, content: string): Promise<void> {
  const path = `room-${roomId}/session-${sessionId}/transcript.txt`;
  await supabase.storage.from(BUCKET_NAME).upload(path, new Blob([content]), { upsert: true });
}

export async function getSessionTranscript(roomId: string, sessionId: string): Promise<string> {
  const path = `room-${roomId}/session-${sessionId}/transcript.txt`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);
  if (error) throw error;
  return await data.text();
}
