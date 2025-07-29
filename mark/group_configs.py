# 定義每張地圖圖像對應的經緯度範圍、圖檔大小、地圖檔案名稱、以及對應地區名稱（location）
group_latlng_map = {
    1: {
        "image": "left2.jpg",  # 實際地圖底圖圖檔（你要放在前端底圖資料夾內）
        "lat_min": 25.011869,
        "lat_max": 25.011957,
        "lng_min": 121.540503,
        "lng_max": 121.540588,
        "img_width": 1477,   # 實際底圖像素寬度
        "img_height": 1108,   # 實際底圖像素高度
        "area_names": ["left", "group1"]  # 對應 Supabase 裡的 location 值
    },
    2: {
        "image": "mid.jpg",  # 實際地圖底圖圖檔（你要放在前端底圖資料夾內）
        "lat_min": 25.011773,
        "lat_max": 25.011862,
        "lng_min": 121.540578,
        "lng_max": 121.540663,
        "img_width": 1477,   # 實際底圖像素寬度
        "img_height": 1108,   # 實際底圖像素高度
        "area_names": ["mid", "group1"]  # 對應 Supabase 裡的 location 值
    },
    3: {
        "image": "right.jpg",  # 實際地圖底圖圖檔（你要放在前端底圖資料夾內）
        "lat_min": 25.011683,
        "lat_max": 25.011743,
        "lng_min": 121.540651,
        "lng_max": 121.540736,
        "img_width": 1477,   # 實際底圖像素寬度
        "img_height": 1108,   # 實際底圖像素高度
        "area_names": ["right", "group1"]  # 對應 Supabase 裡的 location 值
    },
}