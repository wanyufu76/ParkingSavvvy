# latlng_to_pixel.py
from group_configs import group_latlng_map

# -------- 共享公式 --------
def _latlng_to_pixel(lat: float, lng: float, cfg: dict) -> tuple[int, int]:
    """
    內部通用：經緯度 + 該 group 的 config -> 像素 (x,y)
    """
    x = int((lng - cfg["lng_min"]) /
            (cfg["lng_max"] - cfg["lng_min"]) * cfg["img_width"])

    y = int((cfg["lat_max"] - lat) /
            (cfg["lat_max"] - cfg["lat_min"]) * cfg["img_height"])
    return x, y

# -------- 由 location 取得 group_config --------
def get_group_config_by_location(location: str) -> dict:
    for cfg in group_latlng_map.values():
        if location in cfg.get("area_names", []):
            return cfg
    raise ValueError(f" 找不到 location='{location}' 對應的 group config")

# -------- 對外 API 1：直接給 config --------
def convert_latlng_to_pixel(lat: float, lng: float, group_config: dict):
    return _latlng_to_pixel(lat, lng, group_config)

# -------- 對外 API 2：給 location --------
def convert_latlng_to_pixel_by_location(lat: float, lng: float, location: str):
    cfg = get_group_config_by_location(location)
    return _latlng_to_pixel(lat, lng, cfg)

# -------- 對外 API 3：給 group_id --------
def convert_latlng_to_pixel_by_group(lat: float, lng: float, group_id: int):
    cfg = group_latlng_map[group_id]
    return _latlng_to_pixel(lat, lng, cfg)


# ===== 測試 =====
if __name__ == "__main__":
    print(convert_latlng_to_pixel_by_location(25.011910, 121.540540, "left"))