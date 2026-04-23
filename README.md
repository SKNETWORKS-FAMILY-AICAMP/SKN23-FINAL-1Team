![alt text](Logo.png)
> # **"당신의 상상을 현실의 매물로 연결합니다"** 
> 
> LLM 기반 이미지 생성과 Vector Similarity Search를 결합한 지능형 부동산 큐레이션 서비스
---


| PM | APM | 팀원 | 팀원 |
| :---: | :---: | :---: | :---: |
| **유헌상** | **정희영** | **김도영** | **신승훈** |
| [![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/hunsang-you) | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/JUNGHEEYOUNG9090) | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/rubyheartsping) | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/seunghun92-lab) |



---
## **2. 개발배경**

---
## **3. 기술스택**
### **Modeling**
![XGBoost](https://img.shields.io/badge/XGBoost-%23333333.svg?style=for-the-badge&logo=XGBoost&logoColor=white)
![RandomForest](https://img.shields.io/badge/RandomForest-%23333333.svg?style=for-the-badge&logo=RandomForest&logoColor=white)
![LightGBM](https://img.shields.io/badge/lightgbm-%23333333.svg?style=for-the-badge&logo=,lightgbm&logoColor=white)
![CatBoost](https://img.shields.io/badge/CatBoost-%23333333.svg?style=for-the-badge&logo=CatBoost&logoColor=white)

### **Library**
![PyTorch](https://img.shields.io/badge/PyTorch-%23EE4C2C.svg?style=for-the-badge&logo=PyTorch&logoColor=white)
![Scikit-Learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white)
![Pandas](https://img.shields.io/badge/pandas-%23150458.svg?style=for-the-badge&logo=pandas&logoColor=white)
![NumPy](https://img.shields.io/badge/numpy-%23013243.svg?style=for-the-badge&logo=numpy&logoColor=white)

### **Frontend**
![React.js](https://img.shields.io/badge/react-%2361DAFB.svg?style=for-the-badge&logo=react&logoColor=white)
![Next.js](https://img.shields.io/badge/next.js-%23000000.svg?style=for-the-badge&logo=next.js&logoColor=white)
![typescript](https://img.shields.io/badge/typescript-%233178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/zustand-%2343392a.svg?style=for-the-badge&logo=react&logoColor=white)

### **Environment & Backend**
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![FastAPI](https://img.shields.io/badge/FastAPI-00584d?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![PGVector](https://img.shields.io/badge/PGVector-4444E1?style=for-the-badge&logo=pgvector&logoColor=white)

### **API**
![OpenAI](https://img.shields.io/badge/OpenAI-0081A5?style=for-the-badge&logo=openai&logoColor=white)
![RunPod](https://img.shields.io/badge/RunPod-312491?style=for-the-badge&logo=runpod&logoColor=white)

### **Infrastructure & DevOps**
![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)
![Git](https://img.shields.io/badge/git-%23F05033.svg?style=for-the-badge&logo=git&logoColor=white)
![Jenkins](https://img.shields.io/badge/jenkins-%23D24939.svg?style=for-the-badge&logo=jenkins&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Amazon EC2](https://img.shields.io/badge/Amazon_EC2-FF9900?style=for-the-badge&logo=amazonec2&logoColor=white)
![Amazon RDS](https://img.shields.io/badge/Amazon_RDS-527FFF?style=for-the-badge&logo=amazon-rds&logoColor=white)
![Amazon S3](https://img.shields.io/badge/Amazon_S3-569A31?style=for-the-badge&logo=amazon-s3&logoColor=white)

---
## **4. 프로젝트 구조**
    SKN23-FINAL-1Team/
        ├── .env.example
        ├── docker-compose.prod.yml
        ├── Jenkinsfile
        ├── README.md
        │
        ├── backend/
        │   ├── api/
        │   ├── core/
        │   ├── db/
        │   ├── models/
        │   ├── routers/
        │   ├── schemas/
        │   ├── services/
        │   ├── tests/
        │   └── utils/
        │
        ├── frontend/
        │   ├── app/
        │   │   ├── (auth)/
        │   │   ├── (main)/
        │   │   ├── api/
        │   │   └── mypage/
        │   ├── components/
        │   │   ├── common/
        │   │   ├── feature/
        │   │   ├── room-finder/
        │   │   └── ui/
        │   ├── hooks/
        │   ├── lib/
        │   ├── store/
        │   ├── styles/
        │   └── types/
        │
        ├── ml_research/
        │   └── lightGBM/
        │
        ├── zigbang_crawling/
        ├── market_price_crawling/
        └── documents/
---
## **5. 시스템 아키텍처**
![alt text](diagram.png)
![alt text](erd.png)
---
## **6. 테스트 로그 및 평가**

---
## **7. 핵심기능**
- AI 기반 주거 공간 시각화 (Text-to-Interior Generation)

- 시맨틱 이미지 매칭 추천 (Semantic Property Matching)

- AI 부동산 시세 예측 가이드 (AI Price Estimation)

- 마이페이지

    최근 본 매물, AI 생성 갤러리

---
## **8. 산출물**



