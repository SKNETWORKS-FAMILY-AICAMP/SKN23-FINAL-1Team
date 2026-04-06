# 직방 매물 수집 데이터 컬럼 정의서 (RECOM_FEATURES)

본 문서는 `zigbang_crawler_seoul.py`를 통해 수집되는 서울 지역 매물 데이터의 최종 스키마 정보를 정의합니다. 모든 필드는 ML/DL 분석 및 데이터베이스(DB) 적재에 최적화된 구조를 가집니다.

## 📌 데이터 수집 및 관리 원칙
1. **스키마 고정 (Fixed Schema):** 실행 시마다 컬럼의 수나 순서가 변경되지 않아 DB 적재(Bulk Insert)에 적합합니다.
2. **정보 손실 제로 (Zero Loss):** 분석용으로 가공된 Boolean 피처 외에도 중개사가 입력한 원문 전체를 `_raw` 컬럼에 보존합니다.
3. **ML 친화적 구조:** 텍스트 데이터(Title, Raw)와 수치 데이터(Distance), 범주형 데이터(Boolean)를 명확히 구분하여 전처리 효율을 높였습니다.

---

## 1. 기본 정보 (Core Metadata)
| 영문 컬럼명 | 설명 | 비고 |
| :--- | :--- | :--- |
| **item_id** | 매물 고유 번호 (itemId) | Primary Key |
| **status** | 매물 상태 (ACTIVE / INACTIVE) | |
| **url** | 직방 상세 페이지 URL | |
| **address** | 전체 주소 (Full Text) | |
| **address_jibun** | 지번 주소 | |
| **title** | 매물 홍보 제목 | **NLP/임베딩 활용 추천** |
| **deposit / rent** | 보증금 / 월세 | 단위: 만원 |
| **manage_cost** | 관리비 | 단위: 만원 |
| **service_type** | 건물 유형 (원룸, 오피스텔 등) | |
| **room_type** | 방 구조 (오픈형, 분리형 등) | |
| **area_m2** | 전용 면적 (m²) | |
| **floor / all_floors** | 해당 층 / 전체 층 | |
| **lat / lng** | 위도 / 경도 | |
| **image_thumbnail** | 대표 이미지 주소 | |
| **first_crawled_at** | 시스템 최초 발견 시각 | 히스토리 추적용 |
| **crawled_at** | 최종 업데이트 시각 | |

---

## 2. ML 전처리용 가공 피처 (Boolean Features)
이 섹션의 필드들은 모델이 즉시 학습에 사용할 수 있도록 `True/False`로 제공됩니다.

### 🚚 배송권 정보 (Delivery)
*   `is_coupang` (쿠팡 로켓배송/프레시)
*   `is_ssg` (SSG 쓱배송/새벽배송)
*   `is_marketkurly` (마켓컬리 샛별배송)
*   **배달앱:** `is_baemin` (배민1), `is_yogiyo` (요기요 익스프레스)

### 📍 핵심 생활권 정보 (Amenities Top 4)
*   `is_subway_area` (역세권)
*   `is_convenient_area` (슬세권 - 상권 인근)
*   `is_park_area` (공세권 - 숲/공원 인근)
*   `is_school_area` (학세권 - 교육 시설 인근)

### 🏠 내부 옵션 유무 (Internal Options)
*   가전: `has_air_conditioner`, `has_refrigerator`, `has_washing_machine`, `has_gas_stove`, `has_induction`, `has_microwave`
*   가구: `has_desk`, `has_bed`, `has_closet`, `has_shoe_rack`

---

## 3. 원문 데이터 보존 (Raw Text Data)
중개사가 등록한 원문 텍스트입니다. 가공 피처 외의 추가 키워드를 추출할 때 사용합니다. 구분자는 파이프(`|`)를 사용합니다.

| 컬럼명 | 설명 | 예시 |
| :--- | :--- | :--- |
| **amenities_raw** | 모든 "~세권" 키워드 원문 | `더블역세권|슬세권|숲세권` |
| **distributions_raw** | 모든 배송 업체명 원문 | `쿠팡|배달의 민족|SSG` |
| **options_raw** | 모든 내부 옵션 원문 | `에어컨|세탁기|스타일러` |

---

## 4. 인프라 상세 정보 (POI - Infrastructure)
주요 시설까지의 직선 거리를 담고 있습니다. (`_exists`: 존재 여부, `_distance`: 거리(m))
*   대상 시설: `subway`, `pharmacy`, `convenience`, `bus`, `mart`, `laundry`, `cafe`

---

## 5. 상세 건축 정보 (Architecture Details)
*   `approve_date`: 건물 사용 승인일 (준공 년도 추정 가능)
*   `bathroom_count`: 욕실 개수
*   `residence_type`: 건축물 용도 구분 (다세대주택, 단독주택 등)
*   `elevator`: 엘리베이터 설치 여부
*   `room_direction`: 방의 향 (남향, 서향 등)
*   `movein_date`: 입주 가능일 또는 시기

---
*최종 업데이트: 2026-04-06 (Architectural Schema Finalized)*
