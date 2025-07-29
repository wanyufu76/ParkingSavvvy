"""
偵測機車與車牌 ➜ 配對 ➜ Homography 投影到【底圖像素座標】
輸出 <影像檔名>_result.json，供 auto_process.py 上傳
"""
import cv2, json, os, sys, numpy as np
from scipy.optimize import linear_sum_assignment
from ultralytics import YOLO
from group_configs import group_latlng_map

# 如果你的 H 目標點是在 (-1, -1) ~ (+1, +1) ，請設 True ; 若是 (0,0)-(1,1) 請設 False
USE_RANGE_MINUS1_TO_1 = True

# ------------ 主函式 ------------
def run_detection_and_draw(img_path: str, base_cfg_dir: str, ocr_json_path: str):

    # 1. 讀 Homography & 歸一化
    H = np.load(os.path.join(base_cfg_dir, "H_base.npy")).astype(float)
    if H[2, 2] == 0:
        raise ValueError("H[2,2] = 0，Homography 無效")
    H /= H[2, 2]

    # 2. YOLO 偵測
    img = cv2.imread(img_path)
    model_motor = YOLO("yolov8m.pt")
    model_plate = YOLO(r"C:\Users\CGM\Desktop\best_weight\plate.pt")
    mot, plate = model_motor(img,  verbose=False)[0], model_plate(img, verbose=False)[0]

    m_boxes = [b.tolist() for b,c in zip(mot.boxes.xyxy.cpu(), mot.boxes.cls.cpu()) if int(c)==3]
    p_boxes = plate.boxes.xyxy.cpu().tolist()
    if not m_boxes or not p_boxes:
        print("⚠️ 影像中無機車或車牌，跳過")
        return

    mid = lambda b: ((b[0]+b[2])/2, (b[1]+b[3])/2)
    m_cent, p_cent = [mid(b) for b in m_boxes], [mid(b) for b in p_boxes]

    # 3. 匈牙利配對
    D = np.linalg.norm(np.expand_dims(m_cent,1)-np.expand_dims(p_cent,0), axis=-1)
    rows, cols = linear_sum_assignment(D)
    matches = [(i,j) for i,j in zip(rows, cols) if D[i,j] < 1000]
    if not matches:
        print("⚠️ 無配對成功機車")
        return

    # 4. 根據 location 取底圖尺寸
    loc_tag = os.path.basename(base_cfg_dir).replace("base_config_", "")
    cfg = next(c for c in group_latlng_map.values() if loc_tag in c["area_names"])
    W, H_img = cfg["img_width"], cfg["img_height"]

    # 5. 投影並換算為像素
    # xn, yn 範圍 -1~+1，中央 (0,0)
    def norm_to_px(xn: float, yn: float):
        x = (xn + 1) / 2 * W           # -1 → 0 , +1 → W
        y = (1 - yn) / 2 * H_img       # +1 → 0 , -1 → H_img
        return float(x), float(y)

    px_pos = []
    for i,_ in matches:
        cx, cy = m_cent[i]
        xn, yn = cv2.perspectiveTransform(
            np.array([[[cx, cy]]], dtype=np.float32), H
        )[0, 0]
        x_px, y_px = norm_to_px(xn, yn)
        px_pos.append((x_px, y_px))

    # 6. 讀 OCR
    ocr_data = json.load(open(ocr_json_path, encoding="utf-8"))

    # 7. 組 result list
    results = []
    for idx, (x_px, y_px) in enumerate(px_pos):
        cx, cy = m_cent[matches[idx][0]]
        best_txt, best_d = "未知", float("inf")
        for e in ocr_data:
            ex, ey = e["center"]
            d = np.hypot(ex - cx, ey - cy)
            if d < best_d and e["conf"] > 0.7:
                best_d, best_txt = d, e["text"]

        results.append(
            dict(
                motor_index=idx,
                real_x=x_px,          # ← 像素
                real_y=y_px,          # ← 像素
                plate_text=best_txt,
                match_distance=best_d,
                location=loc_tag,
            )
        )

    # 8. 輸出 JSON
    out_path = img_path + "_result.json"
    json.dump(results, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"✅ 產生 {out_path}  ({len(results)} 筆)")

# ------------ CLI ------------
if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("用法: python based_mark.py <image> <base_config_dir> <ocr_json>")
        sys.exit(1)
    run_detection_and_draw(*sys.argv[1:])