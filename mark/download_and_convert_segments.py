# download_and_convert_segments.py

import json
import sys
from supabase import create_client
from latlng_to_pixel import convert_latlng_to_pixel

def download_and_convert_segments(supabase_url, anon_key, group_id, output_path):
    # 建立 Supabase client
    supabase = create_client(supabase_url, anon_key)

    # 從 Supabase 抓資料表 parking_shapes
    print(f"🔄 正在下載 group_id={group_id} 的 segment...")
    response = supabase.table("parking_shapes").select("*").eq("group_id", group_id).execute()
    data = response.data

    if not data:
        print("找不到資料")
        return

    # 整理每個 segment 的起點與終點
    segments = {}
    for row in data:
        seg_id = int(row["segment_order"])
        point_order = int(row["point_order"])
        lat = float(row["lat"])
        lng = float(row["lng"])

        # 經緯度轉像素
        x, y = convert_latlng_to_pixel(group_id, lat, lng)

        if seg_id not in segments:
            segments[seg_id] = {}

        if point_order == 0:
            segments[seg_id]["start"] = {"x": x, "y": y}
        elif point_order == 1:
            segments[seg_id]["end"] = {"x": x, "y": y}

    # 整理結果成 JSON 格式
    result = []
    for seg_id, pts in segments.items():
        if "start" in pts and "end" in pts:
            result.append({
                "segment_id": seg_id,
                "start": pts["start"],
                "end": pts["end"]
            })

    # 輸出到 JSON 檔案
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f" 已輸出 segment JSON 至：{output_path}")

# ===== 主程式入口 =====
if __name__ == '__main__':
    if len(sys.argv) < 5:
        print("用法：python download_and_convert_segments.py <SUPABASE_URL> <ANON_KEY> <GROUP_ID> <OUTPUT_PATH>")
        sys.exit(1)

    supabase_url = sys.argv[1]
    anon_key = sys.argv[2]
    group_id = int(sys.argv[3])
    output_path = sys.argv[4]

    download_and_convert_segments(supabase_url, anon_key, group_id, output_path)