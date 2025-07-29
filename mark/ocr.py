# ocr_module.py
import os
import json
from paddleocr import PaddleOCR
import cv2
import sys


ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)  # ✅ 用 CPU 或 GPU 執行，看環境設定

def run_ocr(image_path, save_path):
    result = ocr.ocr(image_path, cls=True)
    image = cv2.imread(image_path)
    ocr_output = []

    for idx, line in enumerate(result[0]):
        box, (text, conf) = line
        center = [(box[0][0] + box[2][0]) / 2, (box[0][1] + box[2][1]) / 2]
        ocr_output.append({
            "text": text,
            "conf": float(conf),
            "center": center
        })

    # 儲存中繼檔案
    with open(save_path, 'w', encoding='utf-8') as f:
        json.dump(ocr_output, f, indent=2, ensure_ascii=False)

    print(f"✅ OCR 結果儲存完成：{save_path}")

if __name__ == '__main__':
    img_path = sys.argv[1]
    json_path = sys.argv[2]
    run_ocr(img_path, json_path)