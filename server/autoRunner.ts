import chokidar from "chokidar";
import { spawn } from "child_process";
import path from "path";
import type { Server as IOServer } from "socket.io";

const UPLOADS_DIR = path.resolve("uploads");
const AUTO_PY = path.resolve("mark/auto_process.py");

export function initAutoRunner(io: IOServer) {
  let running = false;

  const runPipeline = () => {
    if (running) return;
    running = true;

    const p = spawn("python", [AUTO_PY], { stdio: "inherit" });
    p.on("exit", (code) => {
      running = false;
      if (code === 0) io.emit("redPoints:updated");
    });
  };

  chokidar
    .watch(UPLOADS_DIR, { ignoreInitial: true })
    .on("add", (f) => /\.(jpe?g|png)$/i.test(f) && runPipeline());

  console.log("👂 autoRunner watching uploads/");
}