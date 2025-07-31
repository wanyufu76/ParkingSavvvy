import cv2
import numpy as np
import sys
import os

def replace_region_with_visible_mask_feature_matching(base_img_path, target_img_path):
    base_img = cv2.imread(base_img_path, cv2.IMREAD_COLOR)
    target_img = cv2.imread(target_img_path, cv2.IMREAD_COLOR)

    if base_img is None or target_img is None:
        raise FileNotFoundError("讀取影像失敗，請確認檔案路徑。")

    sift = cv2.SIFT_create(nfeatures=500, nOctaveLayers=5, contrastThreshold=0.05, edgeThreshold=8)

    base_gray = cv2.cvtColor(base_img, cv2.COLOR_BGR2GRAY)
    target_gray = cv2.cvtColor(target_img, cv2.COLOR_BGR2GRAY)

    kp1, des1 = sift.detectAndCompute(base_gray, None)
    kp2, des2 = sift.detectAndCompute(target_gray, None)

    bf = cv2.BFMatcher(normType=cv2.NORM_L2, crossCheck=True)
    matches = bf.match(des1, des2)
    good = list(matches)

    if len(good) < 4:
        print(f"匹配點不足（只有 {len(good)} 個）")
        return None

    src_pts = np.float32([kp1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst_pts = np.float32([kp2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    M, _ = cv2.findHomography(dst_pts, src_pts, cv2.RANSAC, 1.0)
    h, w, _ = base_img.shape
    warped_target = cv2.warpPerspective(target_img, M, (w, h))

    diff = cv2.absdiff(warped_target, base_img)
    gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray_diff, 1, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.blur(mask, (35, 35))

    warped_gray = cv2.cvtColor(warped_target, cv2.COLOR_BGR2GRAY)
    black_mask = (warped_gray == 0)
    result = base_img.copy()
    final_mask = (mask > 0) & (~black_mask)
    result[final_mask] = warped_target[final_mask]

    return result

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("用法: python sift_v1.py base_img.jpg upload_img.jpg output_img.jpg")
        sys.exit(1)

    base_img_path = sys.argv[1]
    target_img_path = sys.argv[2]
    output_img_path = sys.argv[3]

    result_img = replace_region_with_visible_mask_feature_matching(base_img_path, target_img_path)

    if result_img is not None:
        cv2.imwrite(output_img_path, result_img)
        print(f"處理完成：{output_img_path}")
    else:
        print("融合失敗")
        sys.exit(1)
