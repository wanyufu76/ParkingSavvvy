// server/utils/processImage.ts
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

interface BaseMapEntry {
  base: string;
  output: string;
}

const baseMap: Record<string, BaseMapEntry> = {
  left: { base: "base_A01.jpg", output: "A01_output.jpg" },
  mid: { base: "base_A02.jpg", output: "A02_output.jpg" },
  right: { base: "base_A03.jpg", output: "A03_output.jpg" },
};

export async function processImage(location: string, safeFilename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!baseMap[location]) {
      return reject(new Error(`❌ Unknown location: ${location}`));
    }

    const processedPath = path.join("processed_images", baseMap[location].output);
    const basePath = fs.existsSync(processedPath)
      ? processedPath
      : path.join("base_images", baseMap[location].base);

    const inputPath = path.join("uploads", safeFilename);
    const outputPath = path.join("processed_images", baseMap[location].output);

    console.log(`🔧 執行融合：python sift_v1.py ${basePath} ${inputPath} ${outputPath}`);

    const python = spawn("python", ["sift_v1.py", basePath, inputPath, outputPath]);

    python.stdout.on("data", (data: Buffer) => {
      console.log(`融合 stdout: ${data.toString()}`);
    });

    python.stderr.on("data", (data: Buffer) => {
      console.error(`融合 stderr: ${data.toString()}`);
    });

    python.on("close", (code: number | null) => {
      if (code === 0) {
        console.log("融合成功 ✅");
        resolve(outputPath);
      } else {
        reject(new Error(`融合失敗 ❌ code=${code}`));
      }
    });
  });
}
