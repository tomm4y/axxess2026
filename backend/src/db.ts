import { Pool } from "pg";
import "dotenv/config";

const password = process.env.SUPABASE_DB_PASSWORD;
const connectionString = `postgresql://postgres.ajdzgecxzrryyiwznqku:${password}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;

export const pool = new Pool({ connectionString });

export async function getUserByUuid(uuid: string): Promise<object | null> {
  const result = await pool.query('select * from users where id = $1', [uuid]);
  return result.rows[0] ?? null;
}
