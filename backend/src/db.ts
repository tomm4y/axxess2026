import { Pool } from "pg";
import "dotenv/config";
import { UserId, RoomId } from "./types";

const password = process.env.SUPABASE_DB_PASSWORD;
const connectionString = `postgresql://postgres.ajdzgecxzrryyiwznqku:${password}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;

export const pool = new Pool({ connectionString });

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
