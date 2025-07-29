import os
import io
import sys
import base64
import numpy as np
from supabase import create_client, Client

# 🚨 替換成你自己的 Supabase 連線資訊
SUPABASE_URL = "https://polqjhuklxclnvgpjckf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbHFqaHVrbHhjbG52Z3BqY2tmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI4MTA5NywiZXhwIjoyMDY3ODU3MDk3fQ.tA_l_KmEsm3YlnPfohlwaYiOG3fnTrbZRlJGUCpkWnk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def decode_and_save(b64_str, save_path, is_npy=False):
    binary_data = base64.b64decode(b64_str)
    if is_npy:
        npy_obj = np.load(io.BytesIO(binary_data), allow_pickle=True)
        np.save(save_path, npy_obj)
    else:
        with open(save_path, "wb") as f:
            f.write(binary_data)

def download_base_config(area_id, save_dir="base_config"):
    """
    從 Supabase 下載指定區域的 base config 並儲存到指定資料夾
    """
    os.makedirs(save_dir, exist_ok=True)
    print(f" 正在查詢區域：{area_id} 的 base config...")

    response = supabase.table("base_configs").select("*").eq("area_id", area_id).limit(1).execute()
    data = response.data

    if not data:
        print(" 查無此區域的 base config 設定")
        return False

    config = data[0]

    decode_and_save(config["base_image_b64"], os.path.join(save_dir, "base_image.jpg"))
    decode_and_save(config["h_base_b64"], os.path.join(save_dir, "H_base.npy"), is_npy=True)
    decode_and_save(config["src_pts_b64"], os.path.join(save_dir, "src_pts.npy"), is_npy=True)

    print(f" 已成功下載並儲存 base_config 到資料夾：{save_dir}")
    return True

# 🧪 測試：可自行修改 area 與路徑
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print(" 請輸入區域名稱（area_id）")
        sys.exit(1)

    area = sys.argv[1]
    save_dir = f"base_config_{area}"
    download_base_config(area, save_dir)