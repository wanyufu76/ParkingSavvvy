import json
import numpy as np
from supabase import create_client

SUPABASE_URL = "https://polqjhuklxclnvgpjckf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbHFqaHVrbHhjbG52Z3BqY2tmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4MTA5NywiZXhwIjoyMDY3ODU3MDk3fQ.tA_l_KmEsm3YlnPfohlwaYiOG3fnTrbZRlJGUCpkWnk"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def reorder_box_points(points):
    """
    自動調整四邊形點的順序：
    1. 保證 p0→p1 為最長邊
    2. 順時針排序
    points: list of [x, y] (像素座標)
    """
    points = np.array(points)
    
    # 計算所有邊長
    dists = {}
    for i in range(4):
        for j in range(i+1, 4):
            dists[(i,j)] = np.linalg.norm(points[i] - points[j])
    
    # 找出最長邊
    (i,j), _ = max(dists.items(), key=lambda x: x[1])

    # 以 i 為 p0，j 為 p1
    other = [k for k in range(4) if k not in (i,j)]
    
    # 計算叉積以判斷順時針或逆時針
    vec01 = points[j] - points[i]
    vec02 = points[other[0]] - points[i]
    cross = np.cross(vec01, vec02)
    if cross < 0:
        other.reverse()

    # 返回重排序後的四點
    return [points[i], points[j], points[other[0]], points[other[1]]]

def latlng_to_pixel(lat, lng, box_info):
    """經緯度轉底圖像素座標"""
    x = (lng - box_info["lng_min"]) / (box_info["lng_max"] - box_info["lng_min"]) * box_info["img_width"]
    y = (box_info["lat_max"] - lat) / (box_info["lat_max"] - box_info["lat_min"]) * box_info["img_height"]
    return x, y


def align_points_to_box(points, box_points):
    """
    將紅點平行於藍框長邊整齊化
    points: N x 2 array
    box_points: 4 x 2 array (順時針)
    """
    p0, p1, p2, p3 = box_points
    L = p1 - p0   # 長邊向量
    S = p3 - p0   # 短邊向量
    L2 = np.dot(L, L)
    S2 = np.dot(S, S)

    uv = []
    for X in points:
        u = np.dot(X - p0, L) / L2
        v = np.dot(X - p0, S) / S2
        uv.append([u, v])
    uv = np.array(uv)

    # 對齊短邊方向
    v_avg = np.mean(uv[:, 1])
    uv_aligned = np.column_stack([uv[:, 0], np.full(len(points), v_avg)])

    # 還原像素座標
    aligned_points = np.array([p0 + u*L + v*S for u, v in uv_aligned])
    return aligned_points


def generate_json_for_location(location):
    """產生單一地區的整齊化紅點 JSON"""

    # 1️⃣ 找最新圖片
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

    # 2️⃣ 取 motor_records
    records = (
        supabase.table("motor_records")
        .select("*")
        .eq("image_filename", latest_filename)
        .execute()
        .data
    )
    print(f" {location}: 抓到 {len(records)} 筆最新紀錄")

    # 3️⃣ 取藍框與底圖資訊（直接從 DB 讀）
    box_data = (
        supabase.table("parking_boxes")
        .select("*")
        .eq("label", location)
        .limit(1)
        .execute()
        .data
    )
    if not box_data:
        print(f"⚠️ 找不到 {location} 的藍框與底圖資訊，無法整齊化紅點")
        return

    box_info = box_data[0]
    coords = json.loads(box_info["coords"])
    box_points = np.array(
        [latlng_to_pixel(c["lat"], c["lng"], box_info) for c in coords],
        dtype=float
    )

    # 4️⃣ 處理紅點
    points = []
    markers = []
    for item in records:
        x_px = item.get("real_x")
        y_px = item.get("real_y")
        if x_px is None or y_px is None:
            continue
        points.append([x_px, y_px])
        markers.append({
            "motor_index": item["motor_index"],
            "plate_text":  item["plate_text"],
            "pixel_x":     int(x_px),
            "pixel_y":     int(y_px),
            "location":    location,
            "image_filename": item["image_filename"],
        })

    # 5️⃣ 紅點整齊化
    if points:
        aligned_pts = align_points_to_box(np.array(points, dtype=float), box_points)
        for i, p in enumerate(aligned_pts):
            markers[i]["pixel_x"] = int(p[0])
            markers[i]["pixel_y"] = int(p[1])

    # 6️⃣ 產出 JSON
    out = f"map_output_{location}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(markers, f, ensure_ascii=False, indent=2)
    print(f" {location}: 已輸出 {out}")