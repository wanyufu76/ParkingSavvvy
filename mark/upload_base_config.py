import os
import base64
import numpy as np
from io import BytesIO
from supabase import create_client

# 替換為你自己的 Supabase 連線資訊
SUPABASE_URL = "https://polqjhuklxclnvgpjckf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbHFqaHVrbHhjbG52Z3BqY2tmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4MTA5NywiZXhwIjoyMDY3ODU3MDk3fQ.tA_l_KmEsm3YlnPfohlwaYiOG3fnTrbZRlJGUCpkWnk"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def npy_to_base64(path):
    """把 .npy 檔轉成 base64 字串"""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode('utf-8')

def img_to_base64(path):
    """把影像檔轉成 base64 字串"""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode('utf-8')

def upload_config(area_id):
    base_image_path = "base_config/base_image.jpg"
    h_base_path = "base_config/H_base.npy"
    src_pts_path = "base_config/src_pts.npy"

    data = {
        "area_id": area_id,
        "base_image_b64": img_to_base64(base_image_path),
        "h_base_b64": npy_to_base64(h_base_path),
        "src_pts_b64": npy_to_base64(src_pts_path)
    }

    # 先檢查是否已存在
    existing = supabase.table("base_configs").select("id").eq("area_id", area_id).execute().data
    if existing:
        supabase.table("base_configs").update(data).eq("area_id", area_id).execute()
        print(f"更新成功：{area_id}")
    else:
        supabase.table("base_configs").insert(data).execute()
        print(f"新增成功：{area_id}")

if __name__ == "__main__":
    upload_config("right")  # ❗請換成你要的地點名稱