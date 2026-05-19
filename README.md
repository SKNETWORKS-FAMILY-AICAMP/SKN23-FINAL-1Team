![alt text](img/Logo.png)
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
### 부동산 시장의 '언어적 한계'와 정보 비대칭

사용자가 원하는 주거 공간은 "아늑한", "개방감 있는", "빈티지한" 등 매우 추상적이고 감성적인 언어로 표현됩니다. 하지만 현재의 부동산 플랫폼은 오직 면적, 가격, 방 개수와 같은 **수치적 필터**만을 제공합니다. 이로 인해 사용자는 수천 개의 매물을 일일이 클릭하며 자신의 취항과 맞는지 확인해야 하는 수고를 겪고 있습니다.


### 시각적 구체화의 필요성 (Text-to-Image)

사람은 자신의 요구사항을 텍스트보다 **시각적 이미지**로 접했을 때 더 명확한 의사결정을 내립니다. 저희는 사용자의 모호한 설명을 LLM과 생성형 AI(GPT-IMAGE-2)를 통해 **구체적인 공간 이미지로 실체화**함으로써, 사용자가 "내가 정말로 원하는 공간"이 무엇인지 먼저 인지하도록 돕습니다.



### 상상을 현실로 연결하는 기술 (Semantic Matching)

단순한 이미지 생성을 넘어, 생성된 이미지의 특징점(Feature)을 추출하고 이를 실제 매물 데이터와 **시맨틱 매칭(Vector Similarity Search)**합니다. 이는 단순히 "비슷한 사진"을 찾는 것이 아니라, 사용자가 상상한 공간의 **'분위기'와 '구조'를 가진 실제 매물**을 연결해주는 혁신적인 검색 경험을 제공합니다.



### 데이터 기반의 합리적 선택 (Price Estimation)

감성적인 만족뿐만 아니라 경제적인 합리성까지 놓치지 않기 위해, **머신러닝 기반의 시세 예측 시스템**을 구축했습니다. 이를 통해 사용자는 취향에 맞는 집이 시장가 대비 적정한 가격인지 판단할 수 있는 객관적인 가이드를 제공받게 됩니다.


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
        ├── docker-compose.prod.yml
        ├── Jenkinsfile
        ├── README.md
        ├── .env
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
        │   ├── catboost/
        │   ├── lightGBM/
        │   ├── RandomForest/
        │   └── xgbboost/
        ├── zigbang_crawling/
        ├── market_price_crawling/
        └── documents/
---
## **5. 시스템 아키텍처**
### 5-1. WorkFlow Diagram
![alt text](img/diagram.png)

### Service Data Flow

1. **User Interaction**: Next.js 기반 프론트엔드에서 사용자 요구사항 수집 및 Zustand를 통한 상태 관리.
2. **AI Processing**: FastAPI를 통해 OpenAI API와 통신, 사용자의 요구사항을 시각화(Image Generation).
3. **Vector Search Pipeline**: 생성된 공간 이미지를 벡터화하여 PostgreSQL의 PGVector 익스텐션을 통해 수만 건의 매물 데이터와 실시간 유사도 매칭.
4. **ML Inference**: 시세 예측 모델을 통해 매물별 적정 가격 가이드 산출.
5. **Deployment**: AWS EC2와 Docker Compose를 활용한 컨테이너 기반 배포 및 Jenkins를 통한 CI/CD 구축.

### Deployment Architecture

저희 서비스는 AWS 클라우드 인프라를 기반으로 구축되었으며, Docker와 Jenkins를 활용하여 안정적인 배포 파이프라인을 유지합니다.

- **Compute**: AWS EC2에서 Frontend(Next.js) 및 Backend(FastAPI)를 컨테이너화하여 운영.
- **Storage**: 사용자 생성 이미지 및 매물 이미지는 **AWS S3**를 통해 효율적으로 관리 및 서빙.
- **Database**: **AWS RDS (PostgreSQL)**를 활용하여 데이터 정합성을 확보하고, **PGVector** 익스텐션을 통해 벡터 검색 최적화.
- **CI/CD**: GitHub Webhook - Jenkins - Docker를 연동하여 코드 수정 시 자동 빌드 및 무중단 배포(선택사항 시) 환경 구축.

### 5-2. ERD
![alt text](img/erd.png)


### 5-3. 브랜치 관리 전략

![alt text](img/브랜치전략.png)

- develop을 베이스로하여 작업단위마다 feature, fix 등의 브랜치를 생성해 작업
- 작업 완료 후, develop 브랜치에 merge 기록을 남기지 않고 깔끔하게 관리하기 위해 rebase merge 방식을 사용
- main 브랜치는 배포를 위한 브랜치로 develop 브랜치 작업을 squash merge 방식으로 관리함으로써 하나의 커밋으로 배포단위마다 어떤 이슈를 해결했는지 빠르게 파악

---
## **6. 테스트 로그 및 평가**
### 5-1. 이미지 선정
#### 설문조사
![alt text](img/조사.png)
![alt text](img/조사결과.png)
---

### 5-2. 부하테스트
`
```
매물 조회 API

| 테스트 | 동시 사용자(VU) | 총 요청 | 실패율 | 평균 응답 | p95 응답 | 결과 |
|---|---:|---:|---:|---:|---:|---|
| 검색 API | 30명 | 2,294건 | 0% | 82ms | 128ms | 통과 |
| 검색 API | 100명 | 5,715건 | 0% | 324ms | 837ms | 통과 |
| 검색 API | 120명 | 6,219건 | 0% | 515ms | 1,302ms | 통과 |
| 검색 API | 150명 | 6,695건 | 0% | 888ms | 2,298ms | 실패 |
| 검색 API | 200명 | 7,172건 | 0% | 1,543ms | 3,506ms | 실패 |

AI 이미지 생성, 1장 기준

| 테스트 | 동시 사용자(VU) | 생성 작업 | 완료 | 실패 | 완료율 | 평균 생성 시간 | p95 생성 시간 | 결과 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 이미지 생성 | 3명 | 18건 | 17건 | 0건 | 100% | 29.3초 | 36.9초 | 통과 |
| 이미지 생성 | 10명 | 57건 | 57건 | 0건 | 100% | 29.4초 | 35.1초 | 통과 |
| 이미지 생성 | 15명 | 90건 | 76건 | 11건 | 87.4% | 29.0초 | 40.1초 | 통과 |
| 이미지 생성 | 20명 | 117건 | 77건 | 39건 | 66.4% | 31.9초 | 41.1초 | 실패 |
| 이미지 생성 | 50명 | 327건 | 75건 | 243건 | 23.6% | 34.2초 | 45.1초 | 실패 |

결론

| 기능 | 안정 기준 |
|---|---|
| 매물 조회 API | 120명 동시 조회까지 안정적 |
| AI 이미지 생성 | 1장 기준 15명 동시 생성까지 기준 충족 |
| AI 이미지 생성 현재 한도 | OpenAI 20 images/min 제한 때문에 4장 생성 기준 분당 약 5명 처리 가능 |
| 큐 적용 후 기대 효과 | 실패 대신 대기열 처리로 안정성 개선 |

주의할 점은 이미지 생성 테스트는 1명당 1장 생성 기준이었다는 점입니다. 실제 서비스처럼 1명당 4장을 생성하면 외부 API 사용량은 4배가 됩니다.
````
## **7. 핵심기능**

### 1. AI 기반 주거 공간 시각화 & 시맨틱 이미지 매칭 추천 (Text-to-Interior Generation & Semantic Property Matching)
![alt text](img/온보딩_gif_v1.gif)

###  2. AI 부동산 시세 예측 가이드 (AI Price Estimation)
![alt text](img/시세예측1.png)
![alt text](img/시세예측2.png)

---
## **8. 회고**



