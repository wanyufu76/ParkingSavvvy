import json
import sys
from supabase import create_client
from latlng_to_pixel import convert_latlng_to_pixel

def download_and_convert_segments(supabase_url, anon_key, group_id, output_path):
    print(f"🔄 下載 group_id={group_id} 的 segments ...")
    supabase = create_client(supabase_url, anon_key)
    resp = supabase.table("parking_shapes").select("*").eq("group_id", group_id).execute()

    rows = resp.data
    if not rows:
        print("❌ 找不到資料")
        return

    segments = {}
    for row in rows:
        seg_id = int(row["segment_order"])
        point_order = int(row["point_order"])
        lat = float(row["lat"])
        lng = float(row["lng"])

        # ⭐ 正確呼叫：group_id, lat, lng
        x_px, y_px = convert_latlng_to_pixel(group_id, lat, lng)

        segments.setdefault(seg_id, {})
        if point_order == 0:
            segments[seg_id]["start"] = {"x": x_px, "y": y_px}
        elif point_order == 1:
            segments[seg_id]["end"]   = {"x": x_px, "y": y_px}

    result = [
        {"segment_id": sid, "start": pts["start"], "end": pts["end"]}
        for sid, pts in segments.items()
        if "start" in pts and "end" in pts
    ]

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"✅ 已輸出 segment JSON：{output_path}")

# --- CLI ---
if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("用法: python download_and_convert_segments.py <URL> <KEY> <GROUP_ID> <OUT>")
        sys.exit(1)

    url, key, gid, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
    download_and_convert_segments(url, key, gid, out)