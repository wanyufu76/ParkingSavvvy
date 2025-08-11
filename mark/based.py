import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import numpy as np
import cv2
import os
from upload_base_config import upload_config  # ✅ 引用你原本的上傳函式

def mark_image(photo_path, output_dir="base_config"):
    os.makedirs(output_dir, exist_ok=True)
    base_img_path = os.path.join(output_dir, "base_image.jpg")
    H_save_path = os.path.join(output_dir, "H_base.npy")
    src_pts_path = os.path.join(output_dir, "src_pts.npy")

    img = mpimg.imread(photo_path)
    fig, ax = plt.subplots()
    ax.imshow(img)
    ax.set_title("左鍵順時針標 4 點，右鍵刪除最後一點，Enter 完成")
    points = []
    order_text = ["左上", "右上", "右下", "左下"]

    def onclick(event):
        nonlocal points
        if event.xdata is None or event.ydata is None:
            return
        if event.button == 1 and len(points) < 4:  # 左鍵
            points.append((event.xdata, event.ydata))
            ax.plot(event.xdata, event.ydata, 'ro')
            ax.text(event.xdata+10, event.ydata-10,
                    f"{len(points)}({order_text[len(points)-1]})",
                    color='red', fontsize=10)
            fig.canvas.draw()
        elif event.button == 3 and points:  # 右鍵刪掉最後一個
            points.pop()
            ax.clear()
            ax.imshow(img)
            for idx, (px, py) in enumerate(points):
                ax.plot(px, py, 'ro')
                ax.text(px+10, py-10,
                        f"{idx+1}({order_text[idx]})",
                        color='red', fontsize=10)
            fig.canvas.draw()

    fig.canvas.mpl_connect('button_press_event', onclick)
    print(f"📌 標記：{os.path.basename(photo_path)}（左鍵標點 / 右鍵刪除 / Enter 完成）")
    plt.show(block=True)

    if len(points) != 4:
        print("⚠️ 沒有標滿 4 點，跳過這張")
        return

    # 轉成 float32
    src_pts = np.array(points, dtype=np.float32)
    dst_pts = np.array([[0,0],[1,0],[1,1],[0,1]], dtype=np.float32)

    # 計算 Homography
    H, _ = cv2.findHomography(src_pts, dst_pts)
    H /= H[2, 2]

    # 儲存檔案
    cv2.imwrite(base_img_path, cv2.cvtColor((img*255).astype(np.uint8), cv2.COLOR_RGB2BGR))
    np.save(H_save_path, H)
    np.save(src_pts_path, src_pts)
    print("✅ 已儲存 base_image.jpg、H_base.npy、src_pts.npy")

    # 交給舊版函式處理上傳
    area_id = input("請輸入此底圖的區域名稱（area_id，例如 A01 或 right）：")
    upload_config(area_id)

if __name__ == "__main__":
    path = input("請輸入單張圖片或資料夾路徑：").strip('"')

    if os.path.isfile(path):
        # 單張模式
        mark_image(path)

    elif os.path.isdir(path):
        # 批次模式
        image_files = [f for f in os.listdir(path) if f.lower().endswith((".jpg",".jpeg",".png"))]
        if not image_files:
            print("⚠️ 資料夾中沒有可用的圖片")
        else:
            print(f"🔹 找到 {len(image_files)} 張圖片，將依序開啟標記並上傳")
            for idx, filename in enumerate(sorted(image_files)):
                print(f"\n=== [{idx+1}/{len(image_files)}] 開始標記 {filename} ===")
                photo_path = os.path.join(path, filename)
                mark_image(photo_path)
            print("\n🎉 批次標點與上傳完成！")
    else:
        print("❌ 輸入的路徑不存在，請確認後重新執行")