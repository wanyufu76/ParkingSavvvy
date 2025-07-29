// server/src/routes/redPoints.ts
import { Express, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";

/* ------------------------------------------------------------------ */
/* 1) 每張底圖解析度 (像素)                                           */
/* ------------------------------------------------------------------ */
const groupCfg = {
  left : { W: 1477, H: 1108 },
  mid  : { W: 1477, H: 1108 },
  right: { W: 1477, H: 1108 },
} as const;

/* ------------------------------------------------------------------ */
/* 2) 長邊兩端中心點 A / B  (自行量測後填入)                          */
/*    inwardSign : 1 代表 n 向量就是「框內」；-1 代表要反向           */
/*    offsetM    : 整條線都往內偏移多少公尺 (可各區獨立調整)          */
/* ------------------------------------------------------------------ */
type AB = { A:{lat:number,lng:number}, B:{lat:number,lng:number},
            inwardSign:1|-1, offsetM:number };
const anchor: Record<"left"|"mid"|"right", AB> = {
  left : {
    A:{lat:25.011941128,lng:121.540520691},
    B:{lat:25.011881273,lng:121.540566959},
    inwardSign: 1,    // ← 若點在框外就改成 -1
    offsetM: 1.2,     // ↙ 往內推 1.2 m
  },
  mid  : {
    A:{lat:25.011846636,lng:121.540594787},
    B:{lat:25.011785565,lng:121.540642396},
    inwardSign: 1,
    offsetM: 1.2,
  },
  right: {
    A:{lat:25.011755789,lng:121.540665530},
    B:{lat:25.011696542,lng:121.540715822},
    inwardSign: 1,    // 如果右側還在框外 👉 改成 -1 或增大 offsetM
    offsetM: 1.4,
  },
};

/* ------------------------------------------------------------------ */
/* 3) 舊 location → 新 key 對照                                       */
/* ------------------------------------------------------------------ */
const locAlias: Record<string,"left"|"mid"|"right"> = {
  left:"left", mid:"mid", right:"right",
  group1:"left", group2:"mid", group3:"right",
};

/* ------------------------------------------------------------------ */
/* 4) 將 (pixel_x,pixel_y) 轉經緯度                                   */
/* ------------------------------------------------------------------ */
const DEG_PER_M = 1 / 111_320;   // 緯度方向：1 m ≈ 1/111320°

function pxToLatLng(
  xPx:number, yPx:number, loc:"left"|"mid"|"right",
  spanMin:number, spanRange:number          // 由各區 X 範圍決定
){
  const { W, H }        = groupCfg[loc];
  const { A, B, inwardSign, offsetM } = anchor[loc];

  /* 1. 把 xPx 映射到 0~1 (留 5% 邊距) */
  const tRaw = (xPx - spanMin) / spanRange;
  const t    = 0.05 + 0.90 * Math.max(0, Math.min(1, tRaw)); // 5% padding

  /* 2. AB 線段內插 */
  const latLine = A.lat + t * (B.lat - A.lat);
  const lngLine = A.lng + t * (B.lng - A.lng);

  /* 3. 單位法向量 n (垂直 AB) */
  const dLat = B.lat - A.lat;
  const dLng = B.lng - A.lng;
  const len  = Math.hypot(dLat,dLng);
  let  nLat  = -dLng / len;
  let  nLng  =  dLat / len;
  nLat *= inwardSign;                    // 依區域方向決定內/外
  nLng *= inwardSign;

  /* 4. yPx 決定額外偏移 (0~1m) 可微調；此處固定 offsetM */
  const k = offsetM * DEG_PER_M;

  return { lat: latLine + k*nLat, lng: lngLine + k*nLng };
}

/* ------------------------------------------------------------------ */
/* 5) /api/red-points  主路由                                         */
/* ------------------------------------------------------------------ */
export function registerRedPointsRoutes(app: Express) {
  app.get("/api/red-points", async (_:Request, res:Response) => {

    /* 5-1 讀三份 JSON 合併 */
    const files = ["map_output_left.json","map_output_mid.json","map_output_right.json"];
    const merged:any[] = [];
    for(const f of files){
      try{
        merged.push(...JSON.parse(await fs.readFile(path.join(process.cwd(),f),"utf-8")));
      }catch(e){ console.warn(`❌ 讀檔失敗 ${f}`,e); }
    }

    /* 5-2 事先計算各區 pixel_x 範圍 (用來展開 X) */
    const spanInfo:Record<"left"|"mid"|"right",{min:number,range:number}> = {
      left:{min:0,range:1}, mid:{min:0,range:1}, right:{min:0,range:1},
    };
    (["left","mid","right"] as const).forEach(k=>{
      const xs = merged
        .filter(p=>locAlias[p.location]===k)
        .map(p=>Number(p.pixel_x ?? p.real_x))
        .filter(Number.isFinite);
      if(xs.length){
        const min = Math.min(...xs);
        const max = Math.max(...xs);
        spanInfo[k]={min,range:Math.max(1,max-min)};
      }
    });

    /* 5-3 轉經緯度 */
    const enriched = merged.flatMap(pt=>{
      const key = locAlias[pt.location];
      if(!key) return [];                         // skip 不認得的

      const x = Number(pt.pixel_x ?? pt.real_x);
      const y = Number(pt.pixel_y ?? pt.real_y);
      if(!Number.isFinite(x)||!Number.isFinite(y)) return [];

      const {min,range} = spanInfo[key];
      const {lat,lng}   = pxToLatLng(x,y,key,min,range);

      return [{...pt,lat,lng}];
    });

    res.json(enriched);
  });
}