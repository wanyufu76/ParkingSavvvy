# generate_map_json.py
import json
from supabase import create_client
from group_configs import group_latlng_map

SUPABASE_URL = "https://polqjhuklxclnvgpjckf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbHFqaHVrbHhjbG52Z3BqY2tmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4MTA5NywiZXhwIjoyMDY3ODU3MDk3fQ.tA_l_KmEsm3YlnPfohlwaYiOG3fnTrbZRlJGUCpkWnk"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# def convert_latlng_to_pixel(lat, lng, group_config):
#     lat_min = group_config["lat_min"]
#     lat_max = group_config["lat_max"]
#     lng_min = group_config["lng_min"]
#     lng_max = group_config["lng_max"]
#     img_width = group_config["img_width"]
#     img_height = group_config["img_height"]

#     x = int((lng - lng_min) / (lng_max - lng_min) * img_width)
#     y = int((lat_max - lat) / (lat_max - lat_min) * img_height)
#     return x, y

def generate_json_for_location(location):
    # 1. 找 group_id
    group_id = next(
        (gid for gid, c in group_latlng_map.items() if location in c["area_names"]),
        None,
    )
    if group_id is None:
        print(f" 找不到 location={location} 對應的 group_id")
        return

    # 2. 最新圖片
    uploads = (
        supabase.table("image_uploads")
        .select("filename", "created_at")
        .eq("location", location)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not uploads.data:
        print(f" {location} 沒有任何圖片上傳紀錄")
        return

    latest_filename = uploads.data[0]["filename"]
    print(f" {location} 最新圖片：{latest_filename}")

    # 3. 取 motor_records
    records = (
        supabase.table("motor_records")
        .select("*")
        .eq("image_filename", latest_filename)
        .execute()
        .data
    )
    print(f" {location}: 抓到 {len(records)} 筆最新紀錄")

    markers = []
    for item in records:
        x_px = int(item["real_x"])
        y_px = int(item["real_y"])
        if x_px is None or y_px is None:
            continue

        markers.append(
            {
                "motor_index": item["motor_index"],
                "plate_text":  item["plate_text"],
                "pixel_x":     int(x_px),
                "pixel_y":     int(y_px),
                "location":    location,
                "group_id":    group_id,
                "image_filename": item["image_filename"],
            }
        )

    out = f"map_output_{location}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(markers, f, ensure_ascii=False, indent=2)
    print(f" {location}: 已輸出 {out}")