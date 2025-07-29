import cv2
import numpy as np
import os

# ========== 載入圖像 ==========
photo_path = r"C:\Users\admin\Desktop\Ting\mark\right.jpg"  
img = cv2.imread(photo_path)
clone = img.copy()

# ========== 儲存路徑 ==========
os.makedirs("base_config", exist_ok=True)
base_img_path = os.path.join("base_config", "base_image.jpg")
H_save_path = os.path.join("base_config", "H_base.npy")
src_pts_path = os.path.join("base_config", "src_pts.npy")  

# ========== 點選四點 ==========
points = []

print("📌 請依照順時針依序點選四個基準點（例如停車格邊角或場景中固定點）")
cv2.namedWindow("Select Points")

def mouse_callback(event, x, y, flags, param):
    global points, img
    if event == cv2.EVENT_LBUTTONDOWN and len(points) < 4:
        points.append((x, y))
        cv2.circle(img, (x, y), 6, (0, 0, 255), -1)
        cv2.putText(img, str(len(points)), (x + 10, y - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

cv2.setMouseCallback("Select Points", mouse_callback)

while True:
    cv2.imshow("Select Points", img)
    key = cv2.waitKey(1) & 0xFF
    if key == 13 and len(points) == 4:
        break
    elif key == 27:  # ESC 重設
        img = clone.copy()
        points = []

cv2.destroyAllWindows()

# ========== 計算與儲存 Homography ==========
src_pts = np.array(points, dtype=np.float32)
dst_pts = np.array([
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1]
], dtype=np.float32)

H, _ = cv2.findHomography(src_pts, dst_pts)

# ========== 儲存 ==========
cv2.imwrite(base_img_path, clone)
np.save(H_save_path, H)
np.save(src_pts_path, src_pts)

print("✅ 已儲存 base_image.jpg、H_base.npy、src_pts.npy")