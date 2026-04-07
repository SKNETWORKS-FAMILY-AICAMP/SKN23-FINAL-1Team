# 🏠 직방 매물 데이터베이스 테이블 명세서 (DB Table Specification) - v2.2

본 문서는 직방 크롤링 스크립트(`zigbang_crawler_seoul.py`)가 수집하는 모든 필드를 반영한 PostgreSQL 데이터베이스 설계서입니다.

---

## 1. 개요 (Overview)

- **목적**: 직방 매물 정보, 인프라 분석 데이터, S3 이미지 경로 및 벡터 임베딩 저장
- **DBMS**: PostgreSQL (with `pgvector` & `PostGIS` extensions)
- **주요 특징**:
  - `items`: 매물의 핵심 거래 정보 및 **공간 정보(GEOGRAPHY)** 저장
  - `item_features`: 가전 옵션(12종), 인프라 거리(7종), 배달/권역 정보(9종) 저장
  - `item_images` & `item_image_embeddings`: 멀티미디어 및 AI 검색 지원

---

## 2. 테이블 상세 명세

### 2.1. `items` (매물 기본 및 거래 정보)

매물의 핵심 정체성과 가격 정보를 저장합니다.

| 컬럼명 (Field)       | 타입 (Type)                | Nullable | Key | 설명                             |
| :------------------- | :------------------------- | :------: | :-: | :------------------------------- |
| `item_id`          | `INT`                    |    No    | PK | 직방 매물 고유 ID                |
| `status`           | `VARCHAR(20)`            |    No    |  -  | 상태 (`ACTIVE`, `INACTIVE`)  |
| `title`            | `VARCHAR(255)`           |   Yes   |  -  | 매물 제목                        |
| `url`              | `TEXT`                   |   Yes   |  -  | 직방 상세 페이지 URL             |
| `address`          | `VARCHAR(255)`           |    No    |  -  | 상세 주소 (지번/도로명 통합)     |
| `deposit`          | `INT`                    |    No    |  -  | 보증금 또는 매매가               |
| `rent`             | `INT`                    |    No    |  -  | 월세 (전세/매매 시 0)            |
| `manage_cost`      | `INT`                    |   Yes   |  -  | 월 관리비                        |
| `service_type`     | `VARCHAR(50)`            |   Yes   |  -  | 서비스 타입 (원룸, 빌라 등)      |
| `room_type`        | `VARCHAR(50)`            |   Yes   |  -  | 방 구조 (원룸, 투룸 등)          |
| `floor`            | `VARCHAR(20)`            |   Yes   |  -  | 해당 층                          |
| `all_floors`       | `VARCHAR(20)`            |   Yes   |  -  | 전체 층                          |
| `area_m2`          | `DECIMAL(10, 2)`         |   Yes   |  -  | 전용 면적 (m²)                  |
| `lat`              | `DECIMAL(10, 8)`         |    No    |  -  | 위도                             |
| `lng`              | `DECIMAL(11, 8)`         |    No    |  -  | 경도                             |
| `geom`             | `GEOGRAPHY(POINT, 4326)` |    No    |  -  | **PostGIS 공간 정보 컬럼** |
| `geohash`          | `VARCHAR(20)`            |   Yes   |  -  | 검색 최적화용 지오해시           |
| `image_thumbnail`  | `TEXT`                   |   Yes   |  -  | 대표 썸네일 URL                  |
| `first_crawled_at` | `TIMESTAMP`              |    No    |  -  | 최초 수집 일시                   |
| `updated_at`       | `TIMESTAMP`              |    No    |  -  | 최종 업데이트 일시               |

---

### 2.2. `item_features` (상세 옵션 및 분석 피처)

크롤링 시 추출된 모든 세부 정보를 담습니다. (`items`와 1:1 관계)

| 분류                  | 컬럼명 (Field)                                               | 타입              | 설명                                                 |
| :-------------------- | :----------------------------------------------------------- | :---------------- | :--------------------------------------------------- |
| **기본 시설**   | `has_parking`                                              | `BOOLEAN`       | 주차 가능 여부 (전처리 완료)                         |
|                       | `parking_count`                                            | `DECIMAL(4, 2)` | 세대당 주차 대수 (숫자만 추출)                       |
|                       | `has_elevator`                                             | `BOOLEAN`       | 엘리베이터 유무                                      |
|                       | `bathroom_count`                                           | `INT`           | 화장실 개수                                          |
|                       | `residence_type`                                           | `VARCHAR(50)`   | 주거 형태 (아파트, 오피스텔 등)                      |
|                       | `room_direction`                                           | `VARCHAR(20)`   | 방 향 (남향, 동향 등)                                |
|                       | `movein_date`                                              | `DATE`          | 입주 가능일 (전처리: 즉시 입주 -> 수집일, 날짜 추출) |
|                       | `approve_date`                                             | `DATE`          | 건물 승인일                                          |
| **가전 옵션**   | `has_air_con`, `has_fridge`, `has_washer`              | `BOOLEAN`       | 에어컨, 냉장고, 세탁기                               |
|                       | `has_gas_stove`, `has_induction`, `has_microwave`      | `BOOLEAN`       | 가스레인지, 인덕션, 전자레인지                       |
|                       | `has_desk`, `has_bed`, `has_closet`, `has_shoe_rack` | `BOOLEAN`       | 책상, 침대, 옷장, 신발장                             |
| **인프라 거리** | `dist_subway`, `dist_pharmacy`, `dist_conv`            | `INT`           | 지하철, 약국, 편의점 거리(m)                         |
| (단위: m)             | `dist_bus`, `dist_mart`, `dist_laundry`, `dist_cafe` | `INT`           | 버스, 마트, 세탁소, 카페 거리(m)                     |
| **배달/세권**   | `is_coupang`, `is_ssg`, `is_marketkurly`               | `BOOLEAN`       | 쿠팡, SSG, 마켓컬리 새벽배송                         |
|                       | `is_baemin`, `is_yogiyo`                                 | `BOOLEAN`       | 배달의 민족, 요기요 가능 여부                        |
|                       | `is_subway_area`, `is_convenient_area`                   | `BOOLEAN`       | 역세권, 슬세권 여부                                  |
|                       | `is_park_area`, `is_school_area`                         | `BOOLEAN`       | 공세권, 학세권 여부                                  |
| **RAW**         | `options_raw`, `amenities_raw`                           | `TEXT`          | 추출 전 원본 데이터                                  |

---

### 2.3. `item_images` (이미지 경로)

| 컬럼명      | 타입        | Key | 설명                    |
| :---------- | :---------- | :-: | :---------------------- |
| `id`      | `SERIAL`  | PK | 이미지 고유 ID          |
| `item_id` | `INT`     | FK | `items.item_id` 참조  |
| `s3_url`  | `TEXT`    |  -  | AWS S3 업로드 전체 경로 |
| `is_main` | `BOOLEAN` |  -  | 대표 이미지 여부        |

---

### 2.4. `item_image_embeddings` (벡터 데이터)

| 컬럼명         | 타입            | Key | 설명                    |
| :------------- | :-------------- | :-: | :---------------------- |
| `id`         | `SERIAL`      | PK | 고유 ID                 |
| `image_id`   | `INT`         | FK | `item_images.id` 참조 |
| `embedding`  | `vector(512)` |  -  | 이미지 벡터 (CLIP 등)   |
| `model_name` | `VARCHAR(50)` |  -  | 임베딩 모델 명          |

---

## 3. 주요 인덱스

1. `idx_items_spatial`: `items USING GIST (geom)` (**공간 검색 최적화**)
2. `idx_items_price`: `items(deposit, rent)` (가격 필터링)
3. `idx_embeddings_v`: `item_image_embeddings(embedding)` (유사도 검색)

---

## 4. SQL 쿼리 (DDL)

```sql
-- 1. 확장 활성화 (이미지 검색용 vector, 공간 정보용 postgis)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. items (매물 기본 정보)
CREATE TABLE items (
    item_id BIGINT PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    title VARCHAR(255),
    url TEXT,
    address VARCHAR(255) NOT NULL,
    deposit BIGINT NOT NULL DEFAULT 0,
    rent INT NOT NULL DEFAULT 0,
    manage_cost INT,
    service_type VARCHAR(50),
    room_type VARCHAR(50),
    floor VARCHAR(20),
    all_floors VARCHAR(20),
    area_m2 DECIMAL(10, 2),
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    geom GEOGRAPHY(POINT, 4326),           -- PostGIS 공간 정보 컬럼
    geohash VARCHAR(20),
    image_thumbnail TEXT,
    first_crawled_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. item_features (상세 옵션 및 분석 데이터)
CREATE TABLE item_features (
    item_id BIGINT PRIMARY KEY REFERENCES items(item_id) ON DELETE CASCADE,
    has_parking BOOLEAN DEFAULT FALSE,
    parking_count DECIMAL(4, 2) DEFAULT 0.0,
    has_elevator BOOLEAN DEFAULT FALSE,
    bathroom_count INT,
    residence_type VARCHAR(50),
    room_direction VARCHAR(20),
    movein_date DATE,
    approve_date DATE,
    -- 가전 옵션
    has_air_con BOOLEAN DEFAULT FALSE,
    has_fridge BOOLEAN DEFAULT FALSE,
    has_washer BOOLEAN DEFAULT FALSE,
    has_gas_stove BOOLEAN DEFAULT FALSE,
    has_induction BOOLEAN DEFAULT FALSE,
    has_microwave BOOLEAN DEFAULT FALSE,
    has_desk BOOLEAN DEFAULT FALSE,
    has_bed BOOLEAN DEFAULT FALSE,
    has_closet BOOLEAN DEFAULT FALSE,
    has_shoe_rack BOOLEAN DEFAULT FALSE,
    -- 인프라 거리 (m)
    dist_subway INT,
    dist_pharmacy INT,
    dist_conv INT,
    dist_bus INT,
    dist_mart INT,
    dist_laundry INT,
    dist_cafe INT,
    -- 배달 및 세권 정보
    is_coupang BOOLEAN DEFAULT FALSE,
    is_ssg BOOLEAN DEFAULT FALSE,
    is_marketkurly BOOLEAN DEFAULT FALSE,
    is_baemin BOOLEAN DEFAULT FALSE,
    is_yogiyo BOOLEAN DEFAULT FALSE,
    is_subway_area BOOLEAN DEFAULT FALSE,
    is_convenient_area BOOLEAN DEFAULT FALSE,
    is_park_area BOOLEAN DEFAULT FALSE,
    is_school_area BOOLEAN DEFAULT FALSE,
    -- 원본 데이터
    options_raw TEXT,
    amenities_raw TEXT
);

-- 4. item_images (S3 이미지 경로)
CREATE TABLE item_images (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    s3_url TEXT NOT NULL,
    is_main BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. item_image_embeddings (벡터 데이터)
CREATE TABLE item_image_embeddings (
    id SERIAL PRIMARY KEY,
    image_id INT NOT NULL REFERENCES item_images(id) ON DELETE CASCADE,
    embedding vector(512) NOT NULL, -- CLIP 등 모델 차원에 맞춰 조정
    model_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. 인덱스 생성
CREATE INDEX idx_items_spatial ON items USING GIST (geom);
CREATE INDEX idx_items_price ON items (deposit, rent);
CREATE INDEX idx_embeddings_v ON item_image_embeddings USING hnsw (embedding vector_cosine_ops);
```

---

*작성자: Gemini CLI & heartsping*
*최종 수정일: 2026-04-07*
