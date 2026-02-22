import crypto from "crypto";
import type { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { SessionId } from "./types";

export type Role = "Doctor" | "Patient";

export type TranscriptWord = {
  word: string;
  startMs: number;
  endMs: number;
  confidence?: number;
  speakerId?: string;
};

export type TranscriptSegment = {
  startMs: number;
  endMs: number;
  speakerId: string | null;
  role: Role | null;
  text: string;
  isFinal: boolean;
  confidence?: number;
  words?: TranscriptWord[];
};

export type S2TConfig = {
  port: number;
  deepgramApiKey: string;
  maxSessionMinutes: number;
  audio: {
    encoding: "linear16";
    sampleRate: 16000;
    channels: 1;
  };
  deepgram: {
    model: string;
    language: string;
  };
};

export type Logger = {
  info: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

type DeepgramConn = ReturnType<S2TService["connectDeepgramLive"]>;

type SessionRuntime = {
  deepgram: DeepgramConn | null;
  clients: Set<WebSocket>;
  speakerMap: Record<string, Role>;
  transcriptSegments: TranscriptSegment[];
  firstSpeakerSeen: string | null;
};

export class S2TService {
  private readonly runtimes = new Map<string, SessionRuntime>();

  constructor(
    public readonly config: S2TConfig,
    private readonly logger: Logger
  ) {}

  getRuntime(sessionId: SessionId): SessionRuntime | null {
    return this.runtimes.get(sessionId.toString()) ?? null;
  }

  getConnectedClients(sessionId: SessionId): WebSocket[] {
    const rt = this.runtimes.get(sessionId.toString());
    return rt ? Array.from(rt.clients) : [];
  }

  hasActiveConnection(sessionId: SessionId): boolean {
    const rt = this.runtimes.get(sessionId.toString());
    return rt !== undefined && rt !== null && rt.clients.size > 0;
  }

  attachClient(sessionId: SessionId, ws: WebSocket): void {
    const key = sessionId.toString();
    let rt = this.runtimes.get(key);
    if (!rt) {
      rt = {
        deepgram: null,
        clients: new Set(),
        speakerMap: {},
        transcriptSegments: [],
        firstSpeakerSeen: null,
      };
      this.runtimes.set(key, rt);
    }
    rt.clients.add(ws);
  }

  detachClient(sessionId: SessionId, ws: WebSocket): void {
    const key = sessionId.toString();
    const rt = this.runtimes.get(key);
    if (!rt) return;

    rt.clients.delete(ws);

    if (rt.clients.size === 0) {
      try {
        rt.deepgram?.close();
      } catch {
        // ignore
      }
      rt.deepgram = null;
      this.runtimes.delete(key);
    }
  }

  broadcastToSession(sessionId: SessionId, message: unknown): void {
    const rt = this.runtimes.get(sessionId.toString());
    if (!rt) return;
    const json = JSON.stringify(message);
    for (const ws of rt.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    }
  }

  setSpeakerMap(sessionId: SessionId, mapping: Record<string, Role>): void {
    const rt = this.runtimes.get(sessionId.toString());
    if (!rt) return;
    rt.speakerMap = { ...rt.speakerMap, ...mapping };
    rt.transcriptSegments = rt.transcriptSegments.map((seg) => ({
      ...seg,
      role: seg.speakerId ? rt!.speakerMap[seg.speakerId] ?? null : null,
    }));
  }

  autoMapSpeakers(sessionId: SessionId): void {
    const rt = this.runtimes.get(sessionId.toString());
    if (!rt || !rt.firstSpeakerSeen) {
      throw new Error("No speaker detected yet");
    }
    const first = rt.firstSpeakerSeen;
    const other = first === "speaker_0" ? "speaker_1" : "speaker_0";
    this.setSpeakerMap(sessionId, { [first]: "Doctor", [other]: "Patient" });
  }

  startDeepgram(sessionId: SessionId): void {
    const key = sessionId.toString();
    let rt = this.runtimes.get(key);
    if (!rt) {
      rt = {
        deepgram: null,
        clients: new Set(),
        speakerMap: {},
        transcriptSegments: [],
        firstSpeakerSeen: null,
      };
      this.runtimes.set(key, rt);
    }
    if (rt.deepgram) return;

    const deepgram = this.connectDeepgramLive((event) => {
      const sessionRt = this.runtimes.get(key);
      if (!sessionRt) return;

      if (event.type === "result") {
        const segment = this.segmentFromDeepgram(event.result);
        if (!segment) return;

        const role = segment.speakerId ? sessionRt.speakerMap[segment.speakerId] ?? null : null;
        const payload = { ...segment, role };
        this.broadcastToSession(sessionId, { type: "transcript", payload });

        if (segment.isFinal) {
          if (!sessionRt.firstSpeakerSeen && segment.speakerId) {
            sessionRt.firstSpeakerSeen = segment.speakerId;
          }
          sessionRt.transcriptSegments.push({ ...segment, role });
        }
        return;
      }

      if (event.type === "utterance_end") {
        const last = sessionRt.transcriptSegments[sessionRt.transcriptSegments.length - 1];
        if (last) {
          this.broadcastToSession(sessionId, { type: "utterance", payload: last });
        }
        return;
      }

      if (event.type === "metadata") {
        this.broadcastToSession(sessionId, { type: "ready" });
        return;
      }

      if (event.type === "error") {
        this.broadcastToSession(sessionId, { type: "error", message: event.message, details: event.raw });
      }
    });

    rt.deepgram = deepgram;
  }

  forwardAudio(sessionId: SessionId, audio: WebSocket.RawData): void {
    const rt = this.runtimes.get(sessionId.toString());
    if (!rt?.deepgram?.ws || rt.deepgram.ws.readyState !== WebSocket.OPEN) return;
    rt.deepgram.ws.send(audio);
  }

  stopDeepgram(sessionId: SessionId): void {
    const rt = this.runtimes.get(sessionId.toString());
    if (!rt?.deepgram) return;
    try {
      rt.deepgram.close();
    } catch {
      // ignore
    }
    rt.deepgram = null;
  }

  private parseSpeakerId(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  private dominantSpeakerIdFromWords(words?: { speaker?: unknown }[]): string | null {
    if (!words || words.length === 0) return null;
    const counts = new Map<number, number>();
    for (const w of words) {
      const speaker = this.parseSpeakerId(w.speaker);
      if (speaker === null) continue;
      counts.set(speaker, (counts.get(speaker) ?? 0) + 1);
    }
    let best: { speaker: number; count: number } | null = null;
    for (const [speaker, count] of counts.entries()) {
      if (!best || count > best.count) best = { speaker, count };
    }
    if (!best) return null;
    return best.speaker <= 0 ? "speaker_0" : "speaker_1";
  }

  private segmentFromDeepgram(dg: {
    transcript: string;
    isFinal: boolean;
    confidence?: number;
    words?: any[];
  }): TranscriptSegment | null {
    const text = dg.transcript?.trim();
    if (!text) return null;

    const speakerId = this.dominantSpeakerIdFromWords(dg.words);

    let startMs = Date.now();
    let endMs = startMs;
    const words = Array.isArray(dg.words) ? dg.words : undefined;
    if (words && words.length > 0) {
      const first = words[0];
      const last = words[words.length - 1];
      if (typeof first?.start === "number") startMs = Math.round(first.start * 1000);
      if (typeof last?.end === "number") endMs = Math.round(last.end * 1000);
    }

    return {
      startMs,
      endMs,
      speakerId,
      role: null,
      text,
      isFinal: dg.isFinal,
      confidence: dg.confidence,
      words: words?.map((w) => ({
        word: w.word,
        startMs: Math.round((w.start ?? 0) * 1000),
        endMs: Math.round((w.end ?? 0) * 1000),
        confidence: typeof w.confidence === "number" ? w.confidence : undefined,
        speakerId: (() => {
          const sp = this.parseSpeakerId(w.speaker);
          if (sp === null) return undefined;
          return sp <= 0 ? "speaker_0" : "speaker_1";
        })(),
      })),
    };
  }

  private connectDeepgramLive(
    onEvent: (event:
      | { type: "result"; result: { transcript: string; isFinal: boolean; confidence?: number; words?: any[] } }
      | { type: "utterance_end" }
      | { type: "metadata"; raw: unknown }
      | { type: "warning"; raw: unknown }
      | { type: "error"; message: string; raw?: unknown }
      | { type: "closed"; code: number; reason: string }) => void
  ) {
    const url = new URL("wss://api.deepgram.com/v1/listen");

    url.searchParams.set("model", this.config.deepgram.model);
    url.searchParams.set("language", this.config.deepgram.language);
    url.searchParams.set("punctuate", "true");
    url.searchParams.set("smart_format", "true");
    url.searchParams.set("diarize", "true");
    url.searchParams.set("interim_results", "true");
    url.searchParams.set("utterances", "true");

    url.searchParams.set("encoding", this.config.audio.encoding);
    url.searchParams.set("sample_rate", String(this.config.audio.sampleRate));
    url.searchParams.set("channels", String(this.config.audio.channels));

    const ws = new WebSocket(url.toString(), {
      headers: {
        Authorization: `Token ${this.config.deepgramApiKey}`,
      },
    });

    ws.on("open", () => {
      onEvent({ type: "metadata", raw: { type: "Open" } });
    });

    ws.on("message", (data) => {
      try {
        const text = typeof data === "string" ? data : data.toString("utf8");
        const msg = JSON.parse(text) as any;

        if (msg?.type === "Metadata") {
          onEvent({ type: "metadata", raw: msg });
          return;
        }
        if (msg?.type === "Warning") {
          onEvent({ type: "warning", raw: msg });
          return;
        }
        if (msg?.type === "Error") {
          onEvent({ type: "error", message: msg?.message ?? "Deepgram error", raw: msg });
          return;
        }
        if (msg?.type === "UtteranceEnd") {
          onEvent({ type: "utterance_end" });
          return;
        }

        const transcript: string | undefined = msg?.channel?.alternatives?.[0]?.transcript;
        if (typeof transcript === "string") {
          const alt = msg.channel.alternatives[0];
          onEvent({
            type: "result",
            result: {
              transcript,
              isFinal: Boolean(msg?.is_final ?? msg?.speech_final ?? false),
              confidence: typeof alt?.confidence === "number" ? alt.confidence : undefined,
              words: Array.isArray(alt?.words) ? alt.words : undefined,
            },
          });
        }
      } catch (err) {
        onEvent({ type: "error", message: "Failed to parse Deepgram message", raw: String(err) });
      }
    });

    ws.on("close", (code, reason) => {
      onEvent({ type: "closed", code, reason: reason.toString() });
    });

    ws.on("error", (err) => {
      onEvent({ type: "error", message: "Deepgram websocket error", raw: String(err) });
    });

    const keepAlive = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "KeepAlive" }));
      }
    }, 10_000);
    keepAlive.unref();

    return {
      ws,
      close: () => {
        clearInterval(keepAlive);
        try {
          ws.close();
        } catch {
          // ignore
        }
      },
    };
  }
}

function parseWsUrl(reqUrl: string): { sessionId: string } {
  const url = new URL(reqUrl, "http://localhost");
  const sessionId = url.searchParams.get("sessionId") ?? "";
  return { sessionId };
}

function sendJson(ws: WebSocket, message: unknown): void {
  ws.send(JSON.stringify(message));
}

export function createS2TWebSocketServer(service: S2TService, httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    try {
      if (!req.url?.startsWith("/ws")) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    const { sessionId } = parseWsUrl(req.url ?? "/ws");

    if (!sessionId) {
      sendJson(ws, { type: "error", message: "sessionId query parameter required" });
      try {
        ws.close(1008, "missing sessionId");
      } catch {
        // ignore
      }
      return;
    }

    const sessionIdObj = SessionId.create(sessionId);

    try {
      service.attachClient(sessionIdObj, ws);
      sendJson(ws, { type: "connected", sessionId });

      const maxDurationMs = service.config.maxSessionMinutes * 60_000;
      const maxTimer = setTimeout(() => {
        sendJson(ws, { type: "error", message: "Max session duration reached" });
        try {
          ws.close(1000, "max duration");
        } catch {
          // ignore
        }
      }, maxDurationMs);
      maxTimer.unref();

      ws.on("message", (data, isBinary) => {
        try {
          if (!isBinary) {
            const text = typeof data === "string" ? data : data.toString("utf8");
            let parsed: any;
            try {
              parsed = JSON.parse(text);
            } catch {
              sendJson(ws, { type: "error", message: "Invalid JSON" });
              return;
            }

            if (parsed.type === "start") {
              if (
                (parsed.sampleRate && parsed.sampleRate !== service.config.audio.sampleRate) ||
                (parsed.channels && parsed.channels !== service.config.audio.channels) ||
                (parsed.format && parsed.format !== service.config.audio.encoding)
              ) {
                sendJson(ws, {
                  type: "error",
                  message: "Audio format mismatch",
                  details: {
                    expected: service.config.audio,
                    received: parsed,
                  },
                });
                return;
              }

              service.startDeepgram(sessionIdObj);
              return;
            }

            if (parsed.type === "stop") {
              service.stopDeepgram(sessionIdObj);
              const rt = service.getRuntime(sessionIdObj);
              sendJson(ws, {
                type: "stopped",
                finalTranscriptSummary: {
                  sessionId,
                  segmentCount: rt?.transcriptSegments.length ?? 0,
                },
              });
              return;
            }

            return;
          }

          service.forwardAudio(sessionIdObj, data);
        } catch (err) {
          sendJson(ws, {
            type: "error",
            message: "WS message handler error",
            details: String(err),
          });
        }
      });

      ws.on("close", () => {
        clearTimeout(maxTimer);
        service.detachClient(sessionIdObj, ws);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "WebSocket error";
      sendJson(ws, { type: "error", message });
      try {
        ws.close(1008, message);
      } catch {
        // ignore
      }
    }
  });

  return wss;
}
