# infer_location.py
import clip
import torch
from PIL import Image
import os
from torchvision.transforms import Compose, Resize, CenterCrop, ToTensor, Normalize

clip_model, clip_preprocess = clip.load("ViT-B/32", device="cuda" if torch.cuda.is_available() else "cpu")
clip_device = "cuda" if torch.cuda.is_available() else "cpu"

def get_clip_feature(img_path):
    image = clip_preprocess(Image.open(img_path)).unsqueeze(0).to(clip_device)
    with torch.no_grad():   
        feature = clip_model.encode_image(image)
    return feature / feature.norm(dim=-1, keepdim=True)

def infer_location_clip(query_path, processed_images_dir="processed_images"):
    query_feature = get_clip_feature(query_path)
    max_sim = -1
    best_location = None

    for fname in os.listdir(processed_images_dir):
        if not fname.endswith("_output.jpg"):
            continue
        location = fname.replace("_output.jpg", "")  # 例如 A01_output.jpg → A01
        base_img_path = os.path.join(processed_images_dir, fname)
        try:
            base_feature = get_clip_feature(base_img_path)
            sim = (query_feature @ base_feature.T).item()
            print(f"📊 CLIP 相似度 {location}: {sim:.4f}")
            if sim > max_sim:
                max_sim = sim
                best_location = location
        except Exception as e:
            print(f"⚠️ 無法處理 {fname}：{e}")
            continue

    return best_location
