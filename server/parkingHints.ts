// server/parkingHints.ts
import { createClient } from "@supabase/supabase-js";
import type { Request, Response } from "express";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_KEY!; // 跟 .env 一致
const supabase = createClient(url, key, { auth: { persistSession: false } });

export async function getParkingHints(req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from("area_availability")   // 這是我們在 DB 建的 view
      .select("*");

    if (error) throw error;
    res.json(data ?? []);
  } catch (e: any) {
    res.status(500).json({ message: e?.message ?? String(e) });
  }
}