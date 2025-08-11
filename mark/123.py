import json
from supabase import create_client

SUPABASE_URL = "https://polqjhuklxclnvgpjckf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbHFqaHVrbHhjbG52Z3BqY2tmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4MTA5NywiZXhwIjoyMDY3ODU3MDk3fQ.tA_l_KmEsm3YlnPfohlwaYiOG3fnTrbZRlJGUCpkWnk"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

IMG_WIDTH = 4032
IMG_HEIGHT = 3024

def sync_coords_to_base_configs():
    # 1️⃣ 讀取 parking_sub_spots
    sub_spots = supabase.table("parking_sub_spots").select("label,coords").execute().data
    if not sub_spots:
        print("⚠️ parking_sub_spots 沒有資料")
        return

    for row in sub_spots:
        area_id = row["label"]           # eg: "A01"
        coords_json = row["coords"]      # jsonb 格式

        # 2️⃣ 解析 coords
        if isinstance(coords_json, str):
            coords = json.loads(coords_json)
        else:
            coords = coords_json

        lat_list = [c["lat"] for c in coords]
        lng_list = [c["lng"] for c in coords]

        lat_min, lat_max = min(lat_list), max(lat_list)
        lng_min, lng_max = min(lng_list), max(lng_list)

        # 3️⃣ 更新或新增 base_configs
        update_data = {
            "area_id": area_id,
            "img_width": IMG_WIDTH,
            "img_height": IMG_HEIGHT,
            "lat_min": lat_min,
            "lat_max": lat_max,
            "lng_min": lng_min,
            "lng_max": lng_max,
            "coords": json.dumps(coords, ensure_ascii=False),
        }

        existing = supabase.table("base_configs").select("id").eq("area_id", area_id).execute().data
        if existing:
            supabase.table("base_configs").update(update_data).eq("area_id", area_id).execute()
            print(f"🔄 已更新 {area_id}")
        else:
            supabase.table("base_configs").insert(update_data).execute()
            print(f"✅ 已新增 {area_id}")

if __name__ == "__main__":
    sync_coords_to_base_configs()