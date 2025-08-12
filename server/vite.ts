import express, { type Express } from "express";
import fs from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer, createLogger } from "vite";
import viteConfig from "../vite.config.js"; // ← 確保 .js 副檔名
import { nanoid } from "nanoid";
import type { Server } from "http";

// 模擬 __dirname（Node ESM 環境無內建）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 建立 Vite logger（可配合自訂輸出格式）
const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false, // 不讀取外部 vite.config.ts，而是直接用匯入的物件
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1); // 出錯即終止（部署用）
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // 所有前端路由交給 Vite 處理（插入 HTML + HMR）
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      // 插入 HMR 版本參數（避免 cache）
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// 用於 production 模式部署
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "client");

  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}`);
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
