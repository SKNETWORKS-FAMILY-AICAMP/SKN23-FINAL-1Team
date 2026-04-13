# ----------------------------------------------------------------------
# 임베딩 과정 전 패딩 함수 
# ----------------------------------------------------------------------

import numpy as np
from PIL import Image

def pad_image(image):
    w, h = image.size
    max_size = max(w, h)
    padded = Image.new("RGB", (max_size, max_size), (128, 128, 128))  # 회색
    padded.paste(image, ((max_size - w) // 2, (max_size - h) // 2))
    return padded