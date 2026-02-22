import { createServer } from "http";
import express from "express";
import { getUserByUuid, getUserByEmail, getUserData, getAllSessionsDebug, getSessionsByRoom, getAllRoomsDebug, putSessionTranscript } from "./db";
import { RoomId, SessionId } from "./types";
import { S2TService, createS2TWebSocketServer } from "./deepgram";
import "dotenv/config";

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
if (!deepgramApiKey) {
  throw new Error("DEEPGRAM_API_KEY environment variable is required");
}

const logger = {
  info: (obj: unknown, msg?: string) => console.log(msg ?? "", obj),
  error: (obj: unknown, msg?: string) => console.error(msg ?? "", obj),
};

const s2tService = new S2TService(
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

const server = createServer(app);
createS2TWebSocketServer(s2tService, server);

export { s2tService };

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`WebSocket endpoint: ws://localhost:${port}/ws?sessionId={session_id}`);
});
