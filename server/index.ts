import express, { type Request, Response, NextFunction } from "express";
import path from "path";                         // ★ 新增
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import "dotenv/config";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  "/uploads",
  express.static(
    // 假設影片實體存放在專案根目錄的 uploads 資料夾
    path.join(path.resolve(), "uploads")
  )
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  // 其他 API 與業務路由
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // 僅在 dev 啟動 Vite；prod 走預建靜態
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app); // 這裡通常會把前端 dist 靜態檔掛進來
  }

 
  const port = 5000;
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
})();
