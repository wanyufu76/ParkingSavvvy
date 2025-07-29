import os
import subprocess
from supabase import create_client
import time
import requests
import shutil
import json
from datetime import datetime

# === 替換為你自己的 Supabase URL / Key ===
SUPABASE_URL = "https://polqjhuklxclnvgpjckf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbHFqaHVrbHhjbG52Z3BqY2tmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4MTA5NywiZXhwIjoyMDY3ODU3MDk3fQ.tA_l_KmEsm3YlnPfohlwaYiOG3fnTrbZRlJGUCpkWnk"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# === 資料夾設定 ===
BASE_CONFIG_DIR = "base_config"
DOWNLOAD_DIR = "downloads"
os.makedirs(BASE_CONFIG_DIR, exist_ok=True)
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def get_unprocessed_images():
    res = supabase.table("image_uploads").select("*").eq("processed", False).execute()
    if not res.data:
        return []

    image_files = [
        row for row in res.data
        if row["filename"].lower().endswith((".jpg", ".jpeg", ".png"))
    ]
    return image_files

def download_image(filename):
    source_path = os.path.join(r"E:\ParkSavvy\uploads", filename)
    save_path = os.path.join(DOWNLOAD_DIR, filename)

    if not os.path.exists(source_path):
        print(f"❌ 找不到圖片：{source_path}")
        return None

    shutil.copyfile(source_path, save_path)
    print(f"✅ 已複製圖片：{filename}")
    return save_path

def check_base_config_exists(area_id):
    try:
        res = supabase.table("base_configs").select("id").eq("area_id", area_id).execute()
        return bool(res.data)
    except Exception as e:
        print(f"⚠️ 查詢 base config 發生錯誤：{e}")
        return False

def mark_as_processed(image_id):
    supabase.table("image_uploads").update({"processed": True}).eq("id", image_id).execute()

def upload_motor_records(result_path, location, filename):
    with open(result_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    records = []
    for item in data:
        record = {
            "image_filename": filename,
            "motor_index": item["motor_index"],
            "location": location,
            "x": item["x"],
            "y": item["y"],
            "plate_text": item["plate_text"],
            "match_distance": item["match_distance"],
            "created_at": datetime.now().isoformat()
        }
        records.append(record)

    if records:
        supabase.table("motor_records").insert(records).execute()
        print(f"⬆️ 已上傳 {len(records)} 筆配對資料")
    else:
        print("⚠️ 沒有配對資料可上傳")

# ====== 主流程 ======
if __name__ == "__main__":
    images = get_unprocessed_images()
    if not images:
        print("✅ 沒有新的圖片要處理")
        exit()

    for img in images:
        filename = img["filename"]
        image_id = img["id"]
        location = img["location"]
        print(f"\n🚀 處理圖片: {filename} @ {location}")

        if not check_base_config_exists(location):
            print(f"⚠️ 找不到對應 base config：{location}，跳過這張圖片")
            continue

        downloaded_path = download_image(filename)
        if downloaded_path is None:
            print("❌ 圖片下載失敗，跳過這張")
            continue

        try:
            subprocess.run(["python", "download_base_config.py", location], check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ 下載 base_config 時發生錯誤：{e}")
            continue

        img_path = os.path.abspath(downloaded_path)
        ocr_json_path = os.path.abspath(os.path.join(DOWNLOAD_DIR, f"{filename}_ocr.json"))

        try:
            subprocess.run([
                "conda", "run", "-n", "ocr_env", "python", "ocr.py",
                downloaded_path, ocr_json_path
            ], check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ OCR 辨識失敗：{e}")
            continue

        base_config_dir = f"base_config_{location}"
        try:
            subprocess.run([
                "conda", "run", "-n", "yolo_paddle", "python", "based_mark.py",
                img_path, base_config_dir, ocr_json_path
            ], check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ YOLO + Homography 處理失敗：{e}")
            continue

        result_json_path = img_path + "_result.json"
        if os.path.exists(result_json_path):
            upload_motor_records(result_json_path, location, filename)

            try:
                subprocess.run(["python", "map_plot.py", result_json_path], check=True)
            except subprocess.CalledProcessError as e:
                print(f"⚠️ 地圖畫圖失敗：{e}")

        else:
            print("❌ 找不到 result.json，無法上傳")

        mark_as_processed(image_id)

    print("\n🎉 所有圖片處理完成！")