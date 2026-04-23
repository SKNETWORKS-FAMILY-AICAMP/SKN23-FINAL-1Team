import torch
import open_clip
from PIL import Image
import io
import os

MODEL_TYPE = 'ViT-B-32'
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECKPOINT_PATH = os.path.join(os.path.dirname(BACKEND_DIR), 'ml_research', 'model', 'ViT-B-32.pt')
 
class EmbeddingService:
    _model = None
    _preprocess = None

    @classmethod
    def _load_model(cls):
        if cls._model is None:
            print(f"[*] CLIP 모델 로딩 중... (Path: {CHECKPOINT_PATH})")
            pretrained = CHECKPOINT_PATH if os.path.exists(CHECKPOINT_PATH) else 'laion2b_s34b_b79k'

            model, _, preprocess = open_clip.create_model_and_transforms(
                MODEL_TYPE,
                pretrained=pretrained,
                device='cpu'
            )
            model.eval()
            cls._model = model
            cls._preprocess = preprocess
            print("[*] CLIP 모델 로드 완료!")

    @classmethod
    def get_image_embedding(cls, image_data: bytes) -> list:
        """
        이미지 바이너리 데이터를 받아서 CLIP 임베딩(리스트) 반환
        """
        cls._load_model()

        try:
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
            image_input = cls._preprocess(image).unsqueeze(0).to('cpu')

            with torch.no_grad():
                image_features = cls._model.encode_image(image_input)
                image_features /= image_features.norm(dim=-1, keepdim=True)

            return image_features[0].cpu().numpy().tolist()

        except Exception as e:
            print(f"[!] 임베딩 추출 중 에러 발생: {e}")
            return None