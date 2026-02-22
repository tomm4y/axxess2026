import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = "assets";

export async function createSessionFolder(roomId: string, sessionId: string): Promise<void> {
  const path = `room-${roomId}/session-${sessionId}/.keep`;
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, new Blob([""]));
  if (error) throw new Error(`Failed to create session folder: ${error.message}`);
}

export async function putSessionTranscript(roomId: string, sessionId: string, content: string): Promise<void> {
  const path = `room-${roomId}/session-${sessionId}/transcript.txt`;
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, new Blob([content]), { upsert: true });
  if (error) throw new Error(`Failed to upload transcript: ${error.message}`);
}

export async function getSessionTranscript(roomId: string, sessionId: string): Promise<string> {
  const path = `room-${roomId}/session-${sessionId}/transcript.txt`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);
  if (error) throw error;
  return await data.text();
}

export async function putRecording(roomId: string, sessionId: string, audioBuffer: Buffer): Promise<void> {
  const path = `room-${roomId}/session-${sessionId}/recording.wav`;
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, audioBuffer, { upsert: true, contentType: 'audio/wav' });
  if (error) throw new Error(`Failed to upload recording: ${error.message}`);
}

export async function getRecording(roomId: string, sessionId: string): Promise<Blob> {
  const path = `room-${roomId}/session-${sessionId}/recording.wav`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);
  if (error) throw error;
  return data;
}
