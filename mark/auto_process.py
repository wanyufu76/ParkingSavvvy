import os
import json
import shutil
import subprocess
from datetime import datetime
from supabase import create_client
from group_configs import group_latlng_map
import sys
sys.stdout.reconfigure(encoding='utf-8')

# === 替換為你自己的 Supabase URL / Key ===
SUPABASE_URL = "https://polqjhuklxclnvgpjckf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbHFqaHVrbHhjbG52Z3BqY2tmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4MTA5NywiZXhwIjoyMDY3ODU3MDk3fQ.tA_l_KmEsm3YlnPfohlwaYiOG3fnTrbZRlJGUCpkWnk"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# === 資料夾設定 ===
BASE_CONFIG_DIR = "base_config"
DOWNLOAD_DIR = "downloads"
os.makedirs(BASE_CONFIG_DIR, exist_ok=True)
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def convert_latlng_to_pixel(lat, lng, group_config):
    lat_min = group_config["lat_min"]
    lat_max = group_config["lat_max"]
    lng_min = group_config["lng_min"]
    lng_max = group_config["lng_max"]
    img_width = group_config["img_width"]
    img_height = group_config["img_height"]

    x = int((lng - lng_min) / (lng_max - lng_min) * img_width)
    y = int((lat_max - lat) / (lat_max - lat_min) * img_height)
    return x, y

def get_all_locations_from_records():
    result = supabase.table("motor_records").select("location").execute()
    all_locations = {row["location"] for row in result.data if "location" in row}
    return sorted(all_locations)

def generate_json_for_location(location):
    group_id = None
    for gid, config in group_latlng_map.items():
        if location in config["area_names"]:
            group_id = gid
            break
    if group_id is None:
        print(f" 找不到 location={location} 對應的 group_id")
        return

    group_config = group_latlng_map[group_id]
    records = supabase.table("motor_records").select("*").eq("location", location).execute().data
    print(f" {location}: 抓到 {len(records)} 筆資料")

    latest_records = {}
    for item in records:
        motor_index = item["motor_index"]
        created_at = item.get("created_at", "")
        if motor_index not in latest_records or created_at > latest_records[motor_index].get("created_at", ""):
            latest_records[motor_index] = item

    markers = []
    for item in latest_records.values():
        lat = item.get("real_y")
        lng = item.get("real_x")
        if lat is None or lng is None:
            continue

        marker = {
            "motor_index": item["motor_index"],
            "plate_text":  item["plate_text"],
            "pixel_x":     int(lng),   # ← 直接把 real_x 當像素
            "pixel_y":     int(lat),   # ← 直接把 real_y 當像素
            "location":    location,
            "group_id":    group_id,
            "image_filename": item["image_filename"]
        }
        markers.append(marker)

    output_path = f"map_output_{location}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(markers, f, ensure_ascii=False, indent=2)

    print(f" {location}: 已輸出 {output_path}")

def get_unprocessed_images():
    res = supabase.table("image_uploads").select("*").eq("processed", False).execute()
    return [row for row in res.data if row["filename"].lower().endswith((".jpg", ".jpeg", ".png"))]

def download_image(filename):
    source_path = os.path.join(r"E:\ParkSavvy\uploads", filename)
    save_path = os.path.join(DOWNLOAD_DIR, filename)
    if not os.path.exists(source_path):
        print(f" 找不到圖片：{source_path}")
        return None
    shutil.copyfile(source_path, save_path)
    print(f" 已複製圖片：{filename}")
    return save_path

def check_base_config_exists(area_id):
    try:
        res = supabase.table("base_configs").select("id").eq("area_id", area_id).execute()
        return bool(res.data)
    except Exception as e:
        print(f" 查詢 base config 發生錯誤：{e}")
        return False

def mark_as_processed(image_id):
    supabase.table("image_uploads").update({"processed": True}).eq("id", image_id).execute()

def upload_motor_records(result_path, location, filename):
    with open(result_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    #  先清除該地區的紀錄
    supabase.table("motor_records").delete().eq("location", location).execute()
    print(f"🧹 已清除 {location} 先前紀錄")

    records = []
    for item in data:
        record = {
            "image_filename": filename,
            "motor_index": item["motor_index"],
            "location": location,
            "real_x": item["real_x"],
            "real_y": item["real_y"],
            "plate_text": item["plate_text"],
            "match_distance": item["match_distance"],
            "created_at": datetime.now().isoformat()
        }
        records.append(record)

    # 插入新的資料
    if records:
        supabase.table("motor_records").insert(records).execute()
        print(f"已上傳 {len(records)} 筆配對資料")
    else:
        print(" 沒有配對資料可上傳")

# ====== 主流程 ======
if __name__ == "__main__":
    images = get_unprocessed_images()
    if not images:
        print(" 沒有新的圖片要處理")
    else:
        for img in images:
            filename = img["filename"]
            image_id = img["id"]
            location = img["location"]
            print(f"\n處理圖片: {filename} @ {location}")

            if not check_base_config_exists(location):
                print(f" 找不到對應 base config：{location}，跳過這張圖片")
                continue

            downloaded_path = download_image(filename)
            if downloaded_path is None:
                print(" 圖片下載失敗，跳過這張")
                continue

            try:
                subprocess.run(["python", r"E:\ParkSavvy\mark\download_base_config.py", location], check=True)
            except subprocess.CalledProcessError as e:
                print(f" 下載 base_config 時發生錯誤：{e}")
                continue

            img_path = os.path.abspath(downloaded_path)
            ocr_json_path = os.path.abspath(os.path.join(DOWNLOAD_DIR, f"{filename}_ocr.json"))

            try:
                subprocess.run([
                    "conda", "run", "-n", "ocr_env", "python", r"E:\ParkSavvy\mark\ocr.py",
                    downloaded_path, ocr_json_path
                ], check=True)
            except subprocess.CalledProcessError as e:
                print(f" OCR 辨識失敗：{e}")
                continue

            base_config_dir = f"base_config_{location}"
            try:
                subprocess.run([
                    "conda", "run", "-n", "yolo_paddle", "python", r"E:\ParkSavvy\mark\based_mark.py",
                    img_path, base_config_dir, ocr_json_path
                ], check=True)
            except subprocess.CalledProcessError as e:
                print(f" YOLO + Homography 處理失敗：{e}")
                continue

            result_json_path = img_path + "_result.json"
            if os.path.exists(result_json_path):
                upload_motor_records(result_json_path, location, filename)
            else:
                print("找不到 result.json，無法上傳")
            mark_as_processed(image_id)

    # === 自動產生地圖 JSON（覆蓋最新狀況）===
    print("\n 開始自動產生地圖標記 JSON...")
    for loc in get_all_locations_from_records():
        generate_json_for_location(loc)
    print("所有地區 JSON 已產生完畢！")