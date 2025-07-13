import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in .env");
}

// 連接 Supabase 資料庫（注意：使用的是 PostgreSQL 連線字串）
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Supabase PostgreSQL 預設使用 SSL
  },
});

export const db = drizzle(pool, { schema });
