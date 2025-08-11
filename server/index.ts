/*******************************************************************
 * 1. import 區
 *******************************************************************/
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import path from "path";
import { Server as IOServer } from "socket.io";
import { registerRoutes } from "./routes";
import { initAutoRunner } from "./autoRunner";
import { setupVite, serveStatic, log } from "./vite";
import "dotenv/config";

/*******************************************************************
 * 2. 先建 app → 再建 httpServer → 再建 socket.io
 *******************************************************************/
const app = express();

/** ✅ 在雲端（Render 等）背後都有 Proxy，開這個可拿到正確協定/IP */
app.set("trust proxy", 1);

const httpServer = http.createServer(app);
const io = new IOServer(httpServer, { cors: { origin: "*" } });

/* autoRunner 只需呼叫一次，放這裡即可 */
initAutoRunner(io);

/*******************************************************************
 * 3. 中介層 & 靜態檔
 *******************************************************************/
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/** 這些是你原本就有的靜態目錄，保留 */
app.use("/uploads", express.static(path.join(path.resolve(), "uploads")));
app.use("/processed_images", express.static(path.join(path.resolve(), "processed_images")));
app.use("/base_images", express.static(path.join(path.resolve(), "base_images")));

/** 你原本掛的 dist（保留不動） */
app.use(express.static("dist"));

/** ✅ 新增：同時把前端的打包輸出（client/dist）也掛起來（不取代、不影響上面） */
app.use(express.static(path.join(path.resolve(), "client", "dist")));

/*******************************************************************
 * 4. 其餘 API 路由 (含紅點路由) 交給 registerRoutes
 *******************************************************************/
(async () => {
  /* registerRoutes 內部已把 /api/*, * fallback 全掛到 app */
  await registerRoutes(app);

  /********************* 5. Error middleware **********************/
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
    throw err;
  });

  /********************* 6. Dev / Prod - Vite ********************/
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);     // dev 熱更新
  } else {
    serveStatic(app);                     // prod 靜態目錄（保留原有邏輯）
  }

  /********************* 7. 啟動 HTTP + WS 伺服器 *****************/
  /** ✅ 改用 Render 指定的埠號，預設 5000 */
  const PORT = Number(process.env.PORT) || 5000;

  httpServer.listen(PORT, () => {
    console.log(` HTTP + Socket.IO running on http://localhost:${PORT}`);
  });
})();
