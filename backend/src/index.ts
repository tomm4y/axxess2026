import express from "express";
import { getUserByUuid } from "./db";

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/debug/user", async (req, res) => {
  const { uuid } = req.query;
  if (!uuid || typeof uuid !== "string") {
    res.status(400).json({ error: "uuid query parameter required" });
    return;
  }
  const user = await getUserByUuid(uuid);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ id: user.toString() });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
