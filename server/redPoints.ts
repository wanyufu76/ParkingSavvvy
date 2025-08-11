import { Express, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";

export function registerRedPointsRoutes(app: Express) {
  app.get("/api/red-points", async (req: Request, res: Response) => {
    try {
      const location = req.query.location as string | undefined;

      // 1️⃣ 找出所有 map_output_*.json
      const files = (await fs.readdir(process.cwd()))
        .filter((f) => f.startsWith("map_output_") && f.endsWith(".json"));

      const merged: any[] = [];

      for (const f of files) {
        try {
          const content = await fs.readFile(path.join(process.cwd(), f), "utf-8");
          const jsonData = JSON.parse(content);

          // 2️⃣ 加上篩選
          const filtered = !location
            ? jsonData
            : jsonData.filter((pt: any) => pt.location === location);

          const enriched = filtered.map((pt: any) => ({
            motor_index: pt.motor_index,
            plate_text: pt.plate_text ?? "",
            pixel_x: pt.pixel_x ?? null,
            pixel_y: pt.pixel_y ?? null,
            lat: Number(pt.lat),
            lng: Number(pt.lng),
            location: pt.location,
            image_filename: pt.image_filename,
          }));

          merged.push(...enriched);
        } catch (err) {
          console.warn(`❌ 讀檔失敗 ${f}`, err);
        }
      }

      res.json(merged);
    } catch (err) {
      console.error("❌ 載入紅點資料失敗", err);
      res.status(500).json({ error: "讀取紅點資料失敗" });
    }
  });
}