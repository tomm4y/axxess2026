import { createServer } from "http";
import express from "express";
import cors from "cors";
import { getUserByUuid, getUserByEmail, getUserData, getAllSessionsDebug, getSessionsByRoom, getAllRoomsDebug, putSessionTranscript, getRoomsByPatient, getOrCreateRoom } from "./db";
import { RoomId, SessionId, UserId } from "./types";
import { SockMan, createSockManWebSocketServer } from "./deepgram";
import authRouter from "./auth";
import "dotenv/config";

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
    await putSessionTranscript(sessionId, content);
    res.send(`<script>alert("Transcript created successfully!"); window.location.href = "/debug/transcript_maker";</script>`);
  } catch (error) {
    res.send(`<script>alert("Error: ${error}"); window.location.href = "/debug/transcript_maker";</script>`);
  }
});

app.get("/get_patient_clinicians", async (req, res) => {
  const { patient } = req.query;
  
  if (!patient || typeof patient !== "string") {
    res.status(400).json({ error: "patient query parameter required" });
    return;
  }

  const userId = UserId.create(patient);
  const rooms = await getRoomsByPatient(userId);
  res.json({ rooms: rooms.map(r => r.toString()) });
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

const server = createServer(app);
createSockManWebSocketServer(sockMan, server);

export { sockMan };

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`WebSocket endpoint: ws://localhost:${port}/ws?userId={user_id}`);
});
