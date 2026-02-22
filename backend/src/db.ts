import { Pool } from "pg";
import "dotenv/config";
import { UserId, RoomId, SessionId } from "./types";
import { createSessionFolder, putSessionTranscript, getSessionTranscript, TranscriptData } from "./storage";

const password = process.env.SUPABASE_DB_PASSWORD;
const connectionString = `postgresql://postgres.ajdzgecxzrryyiwznqku:${password}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;

export const pool = new Pool({ connectionString });

export async function getUserData(user: UserId): Promise<object | null> {
  const result = await pool.query("select * from users where id = $1", [user.toString()]);
  return result.rows[0] ?? null;
}

export async function getUserByUuid(uuid: string): Promise<UserId | null> {
  const result = await pool.query("select id from users where id = $1", [uuid]);
  if (!result.rows[0]) return null;
  return UserId.create(result.rows[0].id);
}

export async function getUserByEmail(email: string): Promise<UserId | null> {
  const result = await pool.query("select id from users where email = $1", [email]);
  if (!result.rows[0]) return null;
  return UserId.create(result.rows[0].id);
}

export async function createPatientUser(email: string, name: string): Promise<UserId> {
  const result = await pool.query(
    "insert into users (email, name, is_clinician) values ($1, $2, false) returning id",
    [email, name]
  );
  return UserId.create(result.rows[0].id);
}

export async function createClinicianUser(email: string, name: string): Promise<UserId> {
  const result = await pool.query(
    "insert into users (email, name, is_clinician) values ($1, $2, true) returning id",
    [email, name]
  );
  return UserId.create(result.rows[0].id);
}

export async function createUser(email: string, name: string, is_clinician: boolean): Promise<UserId> {
  const result = await pool.query(
    "insert into users (email, name, is_clinician) values ($1, $2, $3) returning id",
    [email, name, is_clinician]
  );
  return UserId.create(result.rows[0].id);
}

export async function getOrCreateRoom(clinician: UserId, patient: UserId): Promise<RoomId> {
  const clinicianStr = clinician.toString();
  const patientStr = patient.toString();
  const existing = await pool.query(
    "select id from rooms where clinician = $1 and patient = $2",
    [clinicianStr, patientStr]
  );
  if (existing.rows[0]) {
    return RoomId.create(existing.rows[0].id);
  }
  const created = await pool.query(
    "insert into rooms (clinician, patient) values ($1, $2) returning id",
    [clinicianStr, patientStr]
  );
  return RoomId.create(created.rows[0].id);
}

export async function endSession(sessionId: SessionId): Promise<void> {
  await pool.query("update sessions set active = false where id = $1", [sessionId.toString()]);
}

export async function getSessions(roomId: RoomId): Promise<SessionId[]> {
  const result = await pool.query("select id from sessions where room = $1", [roomId.toString()]);
  return result.rows.map(row => SessionId.create(row.id));
}

export async function getActiveSession(roomId: RoomId): Promise<SessionId | null> {
  const result = await pool.query(
    "select id from sessions where room = $1 and active = true",
    [roomId.toString()]
  );
  if (!result.rows[0]) return null;
  return SessionId.create(result.rows[0].id);
}

export async function isSessionActive(sessionId: SessionId): Promise<boolean> {
  const result = await pool.query(
    "select active from sessions where id = $1",
    [sessionId.toString()]
  );
  return result.rows[0]?.active === true;
}

export async function getRoomIdFromSession(sessionId: SessionId): Promise<RoomId | null> {
  const result = await pool.query(
    "select room from sessions where id = $1",
    [sessionId.toString()]
  );
  if (!result.rows[0]) return null;
  return RoomId.create(result.rows[0].room);
}

export async function endActiveSession(roomId: RoomId): Promise<void> {
  await pool.query(
    "update sessions set active = false where room = $1 and active = true",
    [roomId.toString()]
  );
}

export async function createSession(roomId: RoomId): Promise<SessionId> {
  await endActiveSession(roomId);
  const result = await pool.query(
    "insert into sessions (room, active) values ($1, true) returning id",
    [roomId.toString()]
  );
  const sessionId = SessionId.create(result.rows[0].id);
  await createSessionFolder(roomId.toString(), sessionId.toString());
  return sessionId;
}

export async function putSessionTranscriptData(sessionId: SessionId, data: TranscriptData): Promise<void> {
  const roomId = await getRoomIdFromSession(sessionId);
  if (!roomId) throw new Error("Session not found");
  await putSessionTranscript(roomId.toString(), sessionId.toString(), data);
}

export async function getSessionTranscriptData(sessionId: SessionId): Promise<TranscriptData> {
  const roomId = await getRoomIdFromSession(sessionId);
  if (!roomId) throw new Error("Session not found");
  return await getSessionTranscript(roomId.toString(), sessionId.toString());
}

export async function getAllSessionsDebug(activeOnly?: boolean): Promise<object[]> {
  if (activeOnly) {
    const result = await pool.query("select * from sessions where active = true");
    return result.rows;
  }
  const result = await pool.query("select * from sessions");
  return result.rows;
}

export async function getSessionsForUser(userId: UserId, clinicianId?: string, patientId?: string): Promise<object[]> {
  let query = `
    SELECT s.*, 
           u_clinician.name as clinician_name,
           u_patient.name as patient_name,
           r.id as room_id
    FROM sessions s
    JOIN rooms r ON s.room = r.id
    JOIN users u_clinician ON r.clinician = u_clinician.id
    JOIN users u_patient ON r.patient = u_patient.id
    WHERE (r.clinician = $1 OR r.patient = $1)
  `;
  
  const params: any[] = [userId.toString()];
  
  // Add additional filters if provided
  if (clinicianId) {
    query += ` AND r.clinician = $${params.length + 1}`;
    params.push(clinicianId);
  }
  
  if (patientId) {
    query += ` AND r.patient = $${params.length + 1}`;
    params.push(patientId);
  }
  
  query += ` ORDER BY s.created_at DESC`;
  
  const result = await pool.query(query, params);
  return result.rows;
}

export async function getSessionsByRoom(roomId: RoomId, activeOnly?: boolean): Promise<SessionId[]> {
  if (activeOnly) {
    const result = await pool.query(
      "select id from sessions where room = $1 and active = true",
      [roomId.toString()]
    );
    return result.rows.map(row => SessionId.create(row.id));
  }
  const result = await pool.query("select id from sessions where room = $1", [roomId.toString()]);
  return result.rows.map(row => SessionId.create(row.id));
}

export async function getAllRoomsDebug(): Promise<object[]> {
  const result = await pool.query("select * from rooms");
  return result.rows;
}

export async function getRoomsByPatient(patient: UserId): Promise<RoomId[]> {
  const result = await pool.query("select id from rooms where patient = $1", [patient.toString()]);
  return result.rows.map(row => RoomId.create(row.id));
}

export async function getRoomById(roomId: RoomId): Promise<{ id: string; clinician: string; patient: string } | null> {
  const result = await pool.query("select id, clinician, patient from rooms where id = $1", [roomId.toString()]);
  if (!result.rows[0]) return null;
  return {
    id: result.rows[0].id,
    clinician: result.rows[0].clinician,
    patient: result.rows[0].patient,
  };
}

export async function getRoomsByClinician(clinician: UserId): Promise<RoomId[]> {
  const result = await pool.query("select id from rooms where clinician = $1", [clinician.toString()]);
  return result.rows.map(row => RoomId.create(row.id));
}

export async function getRoomsForUser(userId: UserId): Promise<object[]> {
  const result = await pool.query(
    "select * from rooms where clinician = $1 or patient = $1",
    [userId.toString()]
  );
  return result.rows;
}

export async function getSessionsByPatient(patient: UserId): Promise<SessionId[]> {
  const rooms = await getRoomsByPatient(patient);
  const result = await pool.query("select id from sessions where room = any($1)", [rooms.map(r => r.toString())]);
  return result.rows.map(row => SessionId.create(row.id));
}

export async function getSessionsByClinician(clinician: UserId): Promise<SessionId[]> {
  const rooms = await getRoomsByClinician(clinician);
  const result = await pool.query("select id from sessions where room = any($1)", [rooms.map(r => r.toString())]);
  return result.rows.map(row => SessionId.create(row.id));
}
  
  
