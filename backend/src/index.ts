import express from "express";
import { generateResponse } from "./openai";

const app = express();
const port = 3000;

app.get("/", async (req, res) => {
  res.send(await generateResponse([{ role: "user", content: "Hello!" }]));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
