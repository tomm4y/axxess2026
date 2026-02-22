import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = "assets";

export type TranscriptSegment = {
  text: string;
  role: "Doctor" | "Patient" | null;
  startMs: number;
  endMs: number;
  audioFragmentId?: string;
};

export type TranscriptData = {
  segments: TranscriptSegment[];
  audioFragments: { id: string; startMs: number; endMs: number; filename: string }[];
};

export async function createSessionFolder(roomId: string, sessionId: string): Promise<void> {
  const path = `room-${roomId}/session-${sessionId}/.keep`;
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, new Blob([""]));
  if (error) throw new Error(`Failed to create session folder: ${error.message}`);
}

export async function putSessionTranscript(roomId: string, sessionId: string, data: TranscriptData): Promise<void> {
  const path = `room-${roomId}/session-${sessionId}/transcript.json`;
  const content = JSON.stringify(data, null, 2);
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, new Blob([content]), { upsert: true, contentType: 'application/json' });
  if (error) throw new Error(`Failed to upload transcript: ${error.message}`);
}

export async function getSessionTranscript(roomId: string, sessionId: string): Promise<TranscriptData> {
  const path = `room-${roomId}/session-${sessionId}/transcript.json`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);
  if (error) throw error;
  const text = await data.text();
  return JSON.parse(text);
}

export async function putAudioFragment(roomId: string, sessionId: string, fragmentId: string, audioBuffer: Buffer): Promise<string> {
  const filename = `recording-${fragmentId}.wav`;
  const path = `room-${roomId}/session-${sessionId}/${filename}`;
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, audioBuffer, { upsert: true, contentType: 'audio/wav' });
  if (error) throw new Error(`Failed to upload audio fragment: ${error.message}`);
  return filename;
}

export async function getAudioFragment(roomId: string, sessionId: string, filename: string): Promise<Blob> {
  const path = `room-${roomId}/session-${sessionId}/${filename}`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);
  if (error) throw error;
  return data;
}

export async function putRecording(roomId: string, sessionId: string, audioBuffer: Buffer): Promise<void> {
  const path = `room-${roomId}/session-${sessionId}/recording-full.wav`;
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, audioBuffer, { upsert: true, contentType: 'audio/wav' });
  if (error) throw new Error(`Failed to upload recording: ${error.message}`);
}

export async function getRecording(roomId: string, sessionId: string): Promise<Blob> {
  const path = `room-${roomId}/session-${sessionId}/recording-full.wav`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);
  if (error) throw error;
  return data;
}

export async function createSignedAssetUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Failed to create signed URL");
  return data.signedUrl;
}
