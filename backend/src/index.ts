import { createServer } from "http";
import express from "express";
import cors from "cors";
import { getUserByUuid, getUserByEmail, getUserData, getAllSessionsDebug, getSessionsByRoom, getAllRoomsDebug, putSessionTranscriptData, getSessionTranscriptData, getRoomsForUser, isSessionActive, getRoomIdFromSession, getActiveSession, endSession, getSessionsForUser, userCanAccessSession } from "./db";
import { RoomId, SessionId, UserId } from "./types";
import { SockMan, createSockManWebSocketServer } from "./deepgram";
import authRouter from "./auth";
import "dotenv/config";
import { diagnosticAgent } from "./agent";
import { createSignedAssetUrl } from "./storage";

const app = express();
const port = 3000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRouter);

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
if (!deepgramApiKey) {
  throw new Error("DEEPGRAM_API_KEY environment variable is required");
}

const logger = {
  info: (obj: unknown, msg?: string) => console.log(msg ?? "", obj),
  error: (obj: unknown, msg?: string) => console.error(msg ?? "", obj),
};

const sockMan = new SockMan(
  {
    port,
    deepgramApiKey,
    maxSessionMinutes: 30,
    audio: { encoding: "linear16", sampleRate: 16000, channels: 1 },
    deepgram: { model: "nova-2", language: "en" },
  },
  logger
);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/debug/user", async (req, res) => {
  const { uuid, email } = req.query;
  
  let userId;
  if (email && typeof email === "string") {
    userId = await getUserByEmail(email);
  } else if (uuid && typeof uuid === "string") {
    userId = await getUserByUuid(uuid);
  } else {
    res.status(400).json({ error: "uuid or email query parameter required" });
    return;
  }

  if (!userId) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const userData = await getUserData(userId);
  res.json(userData);
});

app.get("/debug/sessions", async (req, res) => {
  const { active, room_id } = req.query;
  const activeOnly = active === "true";

  if (room_id && typeof room_id === "string") {
    const roomId = RoomId.create(room_id);
    const sessions = await getSessionsByRoom(roomId, activeOnly);
    res.json(sessions.map(s => s.toString()));
    return;
  }

  const sessions = await getAllSessionsDebug(activeOnly);
  res.json(sessions);
});

app.get("/debug/transcript_maker", async (req, res) => {
  const rooms = await getAllRoomsDebug();
  const sessions = await getAllSessionsDebug();

  const html = `<!DOCTYPE html>
<html>
<head><title>Transcript Maker</title></head>
<body>
  <h1>Transcript Maker</h1>
  <form method="POST" action="/debug/transcript_maker">
    <label for="room">Available Rooms:</label><br>
    <select name="room_id" id="room">
      ${rooms.map((r: any) => `<option value="${r.id}">${r.id}</option>`).join("")}
    </select><br><br>
    <label for="session">Available Sessions:</label><br>
    <select name="session_id" id="session">
      ${sessions.map((s: any) => `<option value="${s.id}">${s.id}</option>`).join("")}
    </select><br><br>
    <label for="content">Transcript Content:</label><br>
    <textarea name="content" rows="10" cols="50"></textarea><br><br>
    <button type="submit">Create Transcript</button>
  </form>
</body>
</html>`;

  res.send(html);
});

app.post("/debug/transcript_maker", async (req, res) => {
  const { room_id, session_id, content } = req.body;

  try {
    const sessionId = SessionId.create(session_id);
    await putSessionTranscriptData(sessionId, {
      segments: [{ text: content, role: "Doctor", startMs: 0, endMs: 0 }],
      audioFragments: [],
    });
    
    const aiResult = await diagnosticAgent(content);

    console.log("AI Extraction:", aiResult.extraction);
    console.log("AI ICD:", aiResult.icd);
    console.log("AI Summary:", aiResult.summary);

    res.send(`<script>alert("Transcript created successfully!"); window.location.href = "/debug/transcript_maker";</script>`);
  } catch (error) {
    res.send(`<script>alert("Error: ${error}"); window.location.href = "/debug/transcript_maker";</script>`);
  }
});

app.get("/api/rooms", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.sub;
    if (!userId) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const rooms = await getRoomsForUser(UserId.create(userId));
    res.json({ rooms });
  } catch (error) {
    console.error("Failed to get rooms:", error);
    res.status(500).json({ error: "Failed to get rooms" });
  }
});

app.get("/api/sessions", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const { clinician, patient } = req.query;
  
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.sub;
    if (!userId) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const userIdObj = UserId.create(userId);
    const sessions = await getSessionsForUser(
      userIdObj, 
      clinician as string || undefined, 
      patient as string || undefined
    );

    // Transform sessions to match frontend expected format
    const transformedSessions = sessions.map((session: any) => ({
      id: session.id,
      doctorName: session.clinician_name,
      date: session.created_at,
      roomId: session.room_id,
      active: session.active,
      patientName: session.patient_name,
    }));

    res.json({ sessions: transformedSessions });
  } catch (error) {
    console.error("Failed to get sessions:", error);
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

app.post("/create_room", async (req, res) => {
  const { patient, clinician } = req.query;

  if (!patient || typeof patient !== "string") {
    res.status(400).json({ error: "patient query parameter required" });
    return;
  }

  if (!clinician || typeof clinician !== "string") {
    res.status(400).json({ error: "clinician query parameter required" });
    return;
  }

  const patientId = UserId.create(patient);
  const clinicianId = UserId.create(clinician);

  const result = await sockMan.createRoom(patientId, clinicianId);
  
  res.json({ roomId: result.roomId.toString() });
});

app.post("/create_session", async (req, res) => {
  const { room, creator } = req.query;

  if (!room || typeof room !== "string") {
    res.status(400).json({ error: "room query parameter required" });
    return;
  }

  if (!creator || typeof creator !== "string") {
    res.status(400).json({ error: "creator query parameter required" });
    return;
  }

  const roomId = RoomId.create(room);
  const creatorId = UserId.create(creator);

  const sent = await sockMan.initiateSessionInvite(roomId, creatorId);

  if (!sent) {
    res.status(400).json({ error: "Room not found or users not connected" });
    return;
  }

  res.json({ status: "invite_sent" });
});

app.get("/api/session/:sessionId/active", async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ error: "sessionId parameter required" });
    return;
  }

  try {
    const active = await isSessionActive(SessionId.create(sessionId));
    const roomId = await getRoomIdFromSession(SessionId.create(sessionId));
    res.json({ active, roomId: roomId?.toString() || null });
  } catch (error) {
    console.error("Failed to check session active:", error);
    res.status(500).json({ error: "Failed to check session status" });
  }
});

app.get("/api/session/:sessionId/transcript", async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ error: "sessionId parameter required" });
    return;
  }

  try {
    const sessionIdObj = SessionId.create(sessionId);
    
    // First check if session is active in SockMan
    const sessionRuntime = sockMan.getSessionRuntime(sessionIdObj);
    console.log(`[Transcript API] Session ${sessionId} runtime check:`, {
      hasRuntime: !!sessionRuntime,
      segmentCount: sessionRuntime?.transcriptSegments?.length || 0,
      isRecording: sessionRuntime?.recording || false
    });
    
    if (sessionRuntime) {
      // Always return active session transcript if runtime exists, even if empty
      const transcript = sessionRuntime.transcriptSegments.map(segment => ({
        text: segment.text,
        role: segment.role,
        isFinal: segment.isFinal,
        startMs: segment.startMs,
      }));

      console.log(`[Transcript API] Returning active transcript for session ${sessionId}: ${transcript.length} segments`);
      res.json({ transcript });
      return;
    }
    
    // If no active session runtime, check if session exists in database
    console.log(`[Transcript API] No active runtime for session ${sessionId}, checking if session exists...`);
    const sessionActive = await isSessionActive(sessionIdObj);
    
    if (!sessionActive) {
      console.log(`[Transcript API] Session ${sessionId} not found or not active, returning empty array`);
      res.json({ transcript: [] });
      return;
    }
    
    // Session exists but no runtime (not recording yet), return empty array
    console.log(`[Transcript API] Session ${sessionId} exists but no runtime (not recording yet), returning empty array`);
    res.json({ transcript: [] });
  } catch (error) {
    console.error("Failed to fetch session transcript:", error);
    // If any other error occurs, return empty array
    console.log(`[Transcript API] Error fetching transcript for session ${sessionId}, returning empty array`);
    res.json({ transcript: [] });
  }
});

app.get("/api/session/:sessionId/details", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { sessionId } = req.params;
  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ error: "sessionId parameter required" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    const userId = payload.sub;
    if (!userId) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const sessionIdObj = SessionId.create(sessionId);
    const userIdObj = UserId.create(userId);
    const access = await userCanAccessSession(userIdObj, sessionIdObj);
    if (!access) {
      const roomIdMaybe = await getRoomIdFromSession(sessionIdObj);
      if (!roomIdMaybe) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      res.status(403).json({ error: "Forbidden: you do not have access to this session" });
      return;
    }

    const roomId = access.roomId;

    let transcriptData: any = null;
    try {
      transcriptData = await getSessionTranscriptData(sessionIdObj);
    } catch (e) {
      transcriptData = null;
    }

    let recordingUrl: string | null = null;
    try {
      const recordingPath = `room-${roomId}/session-${sessionId}/recording-full.wav`;
      recordingUrl = await createSignedAssetUrl(recordingPath, 60 * 60);
    } catch {
      recordingUrl = null;
    }

    let audioFragments: Array<{ id: string; startMs: number; endMs: number; filename: string; url: string | null }> = [];
    if (transcriptData?.audioFragments?.length) {
      audioFragments = await Promise.all(
        transcriptData.audioFragments.map(async (frag: any) => {
          const fragmentPath = `room-${roomId}/session-${sessionId}/${frag.filename}`;
          try {
            const url = await createSignedAssetUrl(fragmentPath, 60 * 60);
            return { ...frag, url };
          } catch {
            return { ...frag, url: null };
          }
        })
      );
    }

    res.json({
      roomId,
      sessionId,
      transcriptData,
      recordingUrl,
      audioFragments,
    });
  } catch (error) {
    console.error("Failed to fetch session details:", error);
    res.status(500).json({ error: "Failed to fetch session details" });
  }
});

app.post("/api/session/:sessionId/end", async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ error: "sessionId parameter required" });
    return;
  }

  try {
    const sessionIdObj = SessionId.create(sessionId);
    
    // Check if session is active in SockMan
    const sessionRuntime = sockMan.getSessionRuntime(sessionIdObj);
    
    if (sessionRuntime) {
      // End active session through SockMan (this will save transcript and update database)
      console.log(`[End Session] Ending active session ${sessionId} through SockMan`);
      
      // Stop recording if active
      if (sessionRuntime.recording) {
        sockMan.stopDeepgram(sessionIdObj);
      }
      
      // End session and save data
      await sockMan.endSessionAndSaveRecording(sessionIdObj);
      
      // Notify other participant
      const sockets = sockMan.getSessionSockets(sessionIdObj);
      if (sockets) {
        const otherSocket = sockets.clinicianUserId === req.body.userId ? sockets.patient : sockets.clinician;
        if (otherSocket.readyState === WebSocket.OPEN) {
          otherSocket.send(JSON.stringify({ 
            type: "session_ended", 
            sessionId: sessionId,
            endedBy: req.body.userId,
            endedByName: req.body.userName || "Doctor"
          }));
        }
      }
      
      res.json({ success: true, message: "Session ended successfully" });
    } else {
      // Session might be orphaned (active in DB but no SockMan runtime)
      console.log(`[End Session] Session ${sessionId} not found in SockMan, checking if orphaned...`);
      
      // Try to end it in the database directly
      try {
        await endSession(sessionIdObj);
        console.log(`[End Session] Ended orphaned session ${sessionId} in database`);
        res.json({ success: true, message: "Orphaned session ended successfully" });
      } catch (dbError) {
        console.error(`[End Session] Failed to end orphaned session ${sessionId}:`, dbError);
        res.status(404).json({ error: "Session not found or already ended" });
      }
    }
  } catch (error) {
    console.error(`[End Session] Failed to end session ${sessionId}:`, error);
    res.status(500).json({ error: "Failed to end session" });
  }
});

app.get("/api/rooms/:roomId/active", async (req, res) => {
  const { roomId } = req.params;

  if (!roomId || typeof roomId !== "string") {
    res.status(400).json({ error: "roomId parameter required" });
    return;
  }

  try {
    const sessionId = await getActiveSession(RoomId.create(roomId));
    res.json({ active: sessionId !== null, sessionId: sessionId?.toString() || null });
  } catch (error) {
    console.error("Failed to check room active:", error);
    res.status(500).json({ error: "Failed to check room status" });
  }
});

const server = createServer(app);
createSockManWebSocketServer(sockMan, server);

export { sockMan };

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`WebSocket endpoint: ws://localhost:${port}/ws?userId={user_id}`);
});
