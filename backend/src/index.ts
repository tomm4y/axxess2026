import express from "express";
import { getUserByUuid, getUserByEmail, getUserData, getAllSessionsDebug, getSessionsByRoom } from "./db";
import { RoomId } from "./types";

const app = express();
const port = 3000;

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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
