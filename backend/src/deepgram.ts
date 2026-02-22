import type { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { UserId, RoomId, SessionId } from "./types";
import { getOrCreateRoom, getRoomById, createSession, endSession } from "./db";
import { putRecording } from "./storage";

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

export type SockManConfig = {
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

type DeepgramConn = ReturnType<SockMan["connectDeepgramLive"]>;

type SessionRuntime = {
  deepgram: DeepgramConn | null;
  clients: Set<WebSocket>;
  speakerMap: Record<string, Role>;
  transcriptSegments: TranscriptSegment[];
  firstSpeakerSeen: string | null;
  clinicianUserId: string;
  patientUserId: string;
  roomId: string;
  audioChunks: Buffer[];
  recording: boolean;
};

type PendingSessionInvite = {
  roomId: RoomId;
  creatorId: UserId;
  inviteeId: UserId;
  inviteeSocket: WebSocket;
  clinicianSocket: WebSocket;
  patientSocket: WebSocket;
  clinicianUserId: string;
  patientUserId: string;
  creatorSocket: WebSocket;
};

type SessionSockets = {
  clinician: WebSocket;
  patient: WebSocket;
  clinicianUserId: string;
  patientUserId: string;
  onClinicianClose?: () => void;
  onPatientClose?: () => void;
};

export class SockMan {
  private readonly unassignedSockets = new Map<string, WebSocket>();
  private readonly assignedSockets = new Map<string, SessionSockets>();
  private readonly sessionRuntimes = new Map<string, SessionRuntime>();
  private readonly pendingSessionInvites = new Map<string, PendingSessionInvite>();

  constructor(
    public readonly config: SockManConfig,
    private readonly logger: Logger
  ) {}

  hasUnassignedSocket(userId: UserId): boolean {
    const ws = this.unassignedSockets.get(userId.toString());
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }

  getUnassignedSocket(userId: UserId): WebSocket | null {
    const ws = this.unassignedSockets.get(userId.toString());
    return ws !== undefined && ws.readyState === WebSocket.OPEN ? ws : null;
  }

  registerUnassignedSocket(userId: UserId, ws: WebSocket): void {
    const key = userId.toString();
    const existing = this.unassignedSockets.get(key);
    if (existing && existing !== ws) {
      try {
        existing.close(1000, "replaced by new connection");
      } catch {
        // ignore
      }
    }
    this.unassignedSockets.set(key, ws);
    this.logger.info({ userId: key }, "Socket registered as unassigned");
  }

  unregisterSocket(userId: UserId): void {
    const key = userId.toString();
    this.unassignedSockets.delete(key);
    this.pendingSessionInvites.delete(key);
    this.logger.info({ userId: key }, "Socket unregistered");
  }

  assignSocketsToSession(sessionId: SessionId, clinicianWs: WebSocket, patientWs: WebSocket, clinicianUserId: string, patientUserId: string, roomId: string): void {
    const key = sessionId.toString();
    
    const sessionSockets: SessionSockets = {
      clinician: clinicianWs,
      patient: patientWs,
      clinicianUserId,
      patientUserId,
    };
    
    this.assignedSockets.set(key, sessionSockets);

    const handleClose = async (role: 'clinician' | 'patient') => {
      const rt = this.sessionRuntimes.get(key);
      if (rt && rt.recording) {
        await this.endSessionAndSaveRecording(SessionId.create(key));
      }
      
      const sockets = this.assignedSockets.get(key);
      if (sockets) {
        const other = role === 'clinician' ? sockets.patient : sockets.clinician;
        if (other.readyState === WebSocket.OPEN) {
          other.send(JSON.stringify({ type: "session_ended", sessionId: key }));
        }
      }
      
      this.assignedSockets.delete(key);
      this.sessionRuntimes.delete(key);
      this.logger.info({ sessionId: key }, `Session ended (${role} disconnected)`);
    };

    clinicianWs.once("close", () => handleClose('clinician'));
    patientWs.once("close", () => handleClose('patient'));

    this.logger.info({ sessionId: key }, "Sockets assigned to session");
  }

  getSessionSockets(sessionId: SessionId): SessionSockets | null {
    return this.assignedSockets.get(sessionId.toString()) ?? null;
  }

  getSessionIdForUser(userId: UserId): SessionId | null {
    const userIdStr = userId.toString();
    for (const [sessionId, sockets] of this.assignedSockets.entries()) {
      if (sockets.clinicianUserId === userIdStr || sockets.patientUserId === userIdStr) {
        return SessionId.create(sessionId);
      }
    }
    return null;
  }

  sendToUser(userId: UserId, message: unknown): boolean {
    const ws = this.getUnassignedSocket(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  broadcastToSession(sessionId: SessionId, message: unknown): void {
    const sockets = this.assignedSockets.get(sessionId.toString());
    if (!sockets) return;
    const json = JSON.stringify(message);
    if (sockets.clinician.readyState === WebSocket.OPEN) {
      sockets.clinician.send(json);
    }
    if (sockets.patient.readyState === WebSocket.OPEN) {
      sockets.patient.send(json);
    }
  }

  async createRoom(patientId: UserId, clinicianId: UserId): Promise<{ roomId: RoomId; success: boolean }> {
    const patientSocket = this.getUnassignedSocket(patientId);
    const clinicianSocket = this.getUnassignedSocket(clinicianId);

    const roomId = await getOrCreateRoom(clinicianId, patientId);
    this.logger.info({ roomId: roomId.toString(), patientId: patientId.toString(), clinicianId: clinicianId.toString() }, "Room created");

    if (patientSocket) {
      patientSocket.send(JSON.stringify({
        type: "room_created",
        roomId: roomId.toString(),
        clinicianId: clinicianId.toString(),
      }));
    }

    if (clinicianSocket) {
      clinicianSocket.send(JSON.stringify({
        type: "room_created",
        roomId: roomId.toString(),
        patientId: patientId.toString(),
      }));
    }

    return { roomId, success: true };
  }

  async initiateSessionInvite(roomId: RoomId, creatorId: UserId): Promise<boolean> {
    const room = await getRoomById(roomId);
    if (!room) {
      this.logger.info({ roomId: roomId.toString() }, "Room not found");
      return false;
    }

    const clinicianId = UserId.create(room.clinician);
    const patientId = UserId.create(room.patient);

    const clinicianSocket = this.getUnassignedSocket(clinicianId);
    const patientSocket = this.getUnassignedSocket(patientId);

    if (!clinicianSocket || !patientSocket) {
      this.logger.info({ roomId: roomId.toString() }, "Both users not connected");
      return false;
    }

    const inviteeId = creatorId.toString() === room.clinician ? patientId : clinicianId;
    const inviteeSocket = creatorId.toString() === room.clinician ? patientSocket : clinicianSocket;
    const creatorSocket = creatorId.toString() === room.clinician ? clinicianSocket : patientSocket;

    this.pendingSessionInvites.set(inviteeId.toString(), {
      roomId,
      creatorId,
      inviteeId,
      inviteeSocket,
      clinicianSocket,
      patientSocket,
      clinicianUserId: room.clinician,
      patientUserId: room.patient,
      creatorSocket,
    });

    inviteeSocket.send(JSON.stringify({
      type: "session_invite",
      roomId: roomId.toString(),
      creatorId: creatorId.toString(),
    }));

    return true;
  }

  async handleSessionInviteResponse(inviteeId: UserId, accept: boolean): Promise<SessionId | null> {
    const pending = this.pendingSessionInvites.get(inviteeId.toString());
    if (!pending) {
      this.logger.info({ inviteeId: inviteeId.toString() }, "No pending session invite found");
      return null;
    }

    this.pendingSessionInvites.delete(inviteeId.toString());

    if (!accept) {
      this.logger.info({ inviteeId: inviteeId.toString() }, "Session invite declined");
      if (pending.creatorSocket.readyState === WebSocket.OPEN) {
        pending.creatorSocket.send(JSON.stringify({ type: "session_declined", roomId: pending.roomId.toString() }));
      }
      return null;
    }

    const sessionId = await createSession(pending.roomId);
    const roomIdStr = pending.roomId.toString();

    this.assignSocketsToSession(
      sessionId, 
      pending.clinicianSocket, 
      pending.patientSocket,
      pending.clinicianUserId,
      pending.patientUserId,
      roomIdStr
    );

    this.unassignedSockets.delete(pending.inviteeId.toString());
    const creatorIdStr = pending.creatorId.toString();
    this.unassignedSockets.delete(creatorIdStr);

    const sessionStartedMessage = {
      type: "session_started",
      sessionId: sessionId.toString(),
      roomId: roomIdStr,
    };

    if (pending.clinicianSocket.readyState === WebSocket.OPEN) {
      pending.clinicianSocket.send(JSON.stringify(sessionStartedMessage));
    }
    if (pending.patientSocket.readyState === WebSocket.OPEN) {
      pending.patientSocket.send(JSON.stringify(sessionStartedMessage));
    }

    this.logger.info({ sessionId: sessionId.toString() }, "Session created and sockets assigned");

    return sessionId;
  }

  getSessionRuntime(sessionId: SessionId): SessionRuntime | null {
    return this.sessionRuntimes.get(sessionId.toString()) ?? null;
  }

  getConnectedClients(sessionId: SessionId): WebSocket[] {
    const rt = this.sessionRuntimes.get(sessionId.toString());
    return rt ? Array.from(rt.clients) : [];
  }

  hasActiveConnection(sessionId: SessionId): boolean {
    const rt = this.sessionRuntimes.get(sessionId.toString());
    return rt !== undefined && rt !== null && rt.clients.size > 0;
  }

  attachClientToRuntime(sessionId: SessionId, ws: WebSocket, userId: string): void {
    const key = sessionId.toString();
    let rt = this.sessionRuntimes.get(key);
    if (!rt) {
      rt = {
        deepgram: null,
        clients: new Set(),
        speakerMap: {},
        transcriptSegments: [],
        firstSpeakerSeen: null,
        clinicianUserId: "",
        patientUserId: "",
        roomId: "",
        audioChunks: [],
        recording: false,
      };
      this.sessionRuntimes.set(key, rt);
    }
    rt.clients.add(ws);
  }

  detachClientFromRuntime(sessionId: SessionId, ws: WebSocket): void {
    const key = sessionId.toString();
    const rt = this.sessionRuntimes.get(key);
    if (!rt) return;

    rt.clients.delete(ws);

    if (rt.clients.size === 0) {
      try {
        rt.deepgram?.close();
      } catch {
        // ignore
      }
      rt.deepgram = null;
      this.sessionRuntimes.delete(key);
    }
  }

  setSpeakerMap(sessionId: SessionId, mapping: Record<string, Role>): void {
    const rt = this.sessionRuntimes.get(sessionId.toString());
    if (!rt) return;
    rt.speakerMap = { ...rt.speakerMap, ...mapping };
    rt.transcriptSegments = rt.transcriptSegments.map((seg) => ({
      ...seg,
      role: seg.speakerId ? rt!.speakerMap[seg.speakerId] ?? null : null,
    }));
  }

  autoMapSpeakers(sessionId: SessionId): void {
    const rt = this.sessionRuntimes.get(sessionId.toString());
    if (!rt || !rt.firstSpeakerSeen) {
      throw new Error("No speaker detected yet");
    }
    const first = rt.firstSpeakerSeen;
    const other = first === "speaker_0" ? "speaker_1" : "speaker_0";
    this.setSpeakerMap(sessionId, { [first]: "Doctor", [other]: "Patient" });
  }

  startDeepgram(sessionId: SessionId): void {
    const key = sessionId.toString();
    const sockets = this.assignedSockets.get(key);
    if (!sockets) return;

    let rt = this.sessionRuntimes.get(key);
    if (!rt) {
      rt = {
        deepgram: null,
        clients: new Set([sockets.clinician, sockets.patient]),
        speakerMap: {},
        transcriptSegments: [],
        firstSpeakerSeen: null,
        clinicianUserId: sockets.clinicianUserId,
        patientUserId: sockets.patientUserId,
        roomId: "",
        audioChunks: [],
        recording: false,
      };
      this.sessionRuntimes.set(key, rt);
    }
    if (rt.deepgram) return;

    rt.recording = true;
    rt.audioChunks = [];

    const deepgram = this.connectDeepgramLive((event) => {
      const sessionRt = this.sessionRuntimes.get(key);
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
    this.logger.info({ sessionId: key }, "Recording started");
  }

  forwardAudio(sessionId: SessionId, audio: WebSocket.RawData): void {
    const rt = this.sessionRuntimes.get(sessionId.toString());
    if (!rt?.deepgram?.ws || rt.deepgram.ws.readyState !== WebSocket.OPEN) return;
    
    rt.deepgram.ws.send(audio);
    
    if (rt.recording && Buffer.isBuffer(audio)) {
      rt.audioChunks.push(audio);
    }
  }

  async endSessionAndSaveRecording(sessionId: SessionId): Promise<void> {
    const key = sessionId.toString();
    const rt = this.sessionRuntimes.get(key);
    if (!rt) return;

    rt.recording = false;

    if (rt.deepgram) {
      try {
        rt.deepgram.close();
      } catch {
        // ignore
      }
      rt.deepgram = null;
    }

    if (rt.audioChunks.length > 0 && rt.roomId) {
      try {
        const totalLength = rt.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const audioBuffer = Buffer.concat(rt.audioChunks, totalLength);
        
        const wavBuffer = this.createWavBuffer(audioBuffer, this.config.audio.sampleRate, this.config.audio.channels);
        
        await putRecording(rt.roomId, key, wavBuffer);
        this.logger.info({ sessionId: key, roomId: rt.roomId, size: wavBuffer.length }, "Recording saved");
      } catch (error) {
        this.logger.error({ error, sessionId: key }, "Failed to save recording");
      }
    }

    rt.audioChunks = [];
    
    try {
      await endSession(sessionId);
    } catch (error) {
      this.logger.error({ error, sessionId: key }, "Failed to end session in database");
    }
  }

  private createWavBuffer(audioData: Buffer, sampleRate: number, channels: number): Buffer {
    const dataSize = audioData.length;
    const fileSize = 44 + dataSize;
    
    const buffer = Buffer.alloc(44 + dataSize);
    
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * 2, 28);
    buffer.writeUInt16LE(channels * 2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    audioData.copy(buffer, 44);
    
    return buffer;
  }

  stopDeepgram(sessionId: SessionId): void {
    const rt = this.sessionRuntimes.get(sessionId.toString());
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

function parseWsUrl(reqUrl: string): { userId: string } {
  const url = new URL(reqUrl, "http://localhost");
  const userId = url.searchParams.get("userId") ?? "";
  return { userId };
}

function sendJson(ws: WebSocket, message: unknown): void {
  ws.send(JSON.stringify(message));
}

export function createSockManWebSocketServer(sockMan: SockMan, httpServer: HttpServer): WebSocketServer {
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
    const { userId } = parseWsUrl(req.url ?? "/ws");

    if (!userId) {
      sendJson(ws, { type: "error", message: "userId query parameter required" });
      try {
        ws.close(1008, "missing userId");
      } catch {
        // ignore
      }
      return;
    }

    const userIdObj = UserId.create(userId);

    try {
      sockMan.registerUnassignedSocket(userIdObj, ws);
      sendJson(ws, { type: "connected", userId });

      const maxDurationMs = sockMan.config.maxSessionMinutes * 60_000;
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

            if (parsed.type === "session_invite_response") {
              const accept = parsed.accept === true;
              sockMan.handleSessionInviteResponse(userIdObj, accept);
              return;
            }

            if (parsed.type === "start") {
              if (
                (parsed.sampleRate && parsed.sampleRate !== sockMan.config.audio.sampleRate) ||
                (parsed.channels && parsed.sampleRate !== sockMan.config.audio.channels) ||
                (parsed.format && parsed.format !== sockMan.config.audio.encoding)
              ) {
                sendJson(ws, {
                  type: "error",
                  message: "Audio format mismatch",
                  details: {
                    expected: sockMan.config.audio,
                    received: parsed,
                  },
                });
                return;
              }

              const sessionId = parsed.sessionId;
              if (!sessionId) {
                sendJson(ws, { type: "error", message: "sessionId required for start" });
                return;
              }

              sockMan.startDeepgram(SessionId.create(sessionId));
              sockMan.broadcastToSession(SessionId.create(sessionId), { type: "recording_started", sessionId });
              return;
            }

            if (parsed.type === "stop") {
              const sessionId = parsed.sessionId;
              if (sessionId) {
                sockMan.stopDeepgram(SessionId.create(sessionId));
                sockMan.broadcastToSession(SessionId.create(sessionId), { type: "recording_stopped", sessionId });
                const rt = sockMan.getSessionRuntime(SessionId.create(sessionId));
                sendJson(ws, {
                  type: "stopped",
                  finalTranscriptSummary: {
                    sessionId,
                    segmentCount: rt?.transcriptSegments.length ?? 0,
                  },
                });
              }
              return;
            }

            return;
          } else {
            // Binary audio data - find the session this user belongs to and forward
            const sessionId = sockMan.getSessionIdForUser(userIdObj);
            if (sessionId) {
              sockMan.forwardAudio(sessionId, data);
            }
          }
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
        sockMan.unregisterSocket(userIdObj);
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
