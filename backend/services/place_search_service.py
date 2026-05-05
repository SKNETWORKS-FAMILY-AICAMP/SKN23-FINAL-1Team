import os
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.room import Room
from services.seoul_places_seed import (
    SEOUL_DISTRICTS,
    SEOUL_DONGS_BY_DISTRICT,
    SEOUL_SUBWAY_STATIONS,
)

try:
    from elasticsearch import Elasticsearch
    from elasticsearch.helpers import bulk
except Exception:  # pragma: no cover - fallback when dependency is not installed
    Elasticsearch = None
    bulk = None


PLACES_INDEX = os.getenv("ELASTICSEARCH_PLACES_INDEX", "seoul_places")
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200")
SEOUL_SIDO = "서울특별시"

_index_ready = False


def _get_es_client():
    if Elasticsearch is None:
        return None
    return Elasticsearch(ELASTICSEARCH_URL, request_timeout=2)


def _normalize(value: str) -> str:
    return re.sub(r"\s+", "", value.strip().lower())


def _score_place(place: dict, query: str) -> int:
    normalized_query = _normalize(query)
    if not normalized_query:
        return 0

    values = [
        place.get("name", ""),
        place.get("display_name", ""),
        place.get("sido", ""),
        place.get("sigungu", ""),
        place.get("dong", ""),
        *(place.get("aliases") or []),
    ]

    score = 0
    for value in values:
        normalized_value = _normalize(str(value))
        if normalized_value == normalized_query:
            score = max(score, 100)
        elif normalized_value.startswith(normalized_query):
            score = max(score, 80)
        elif normalized_query in normalized_value:
            score = max(score, 50)

    return score


def _place_response(place: dict) -> dict:
    location = place.get("location") or {}
    return {
        "id": place["id"],
        "type": place["type"],
        "name": place["name"],
        "display_name": place["display_name"],
        "sido": place.get("sido"),
        "sigungu": place.get("sigungu"),
        "dong": place.get("dong"),
        "lines": place.get("lines", []),
        "lat": location.get("lat"),
        "lng": location.get("lon"),
    }


def _district_places() -> list[dict]:
    return [
        {
            "id": f"district-{slug}",
            "type": "district",
            "name": name,
            "display_name": f"서울특별시 {name}",
            "sido": "서울특별시",
            "sigungu": name,
            "dong": None,
            "aliases": [name, name.removesuffix("구"), *aliases],
            "lines": [],
            "location": {"lat": lat, "lon": lon},
            "priority": 30,
        }
        for slug, name, aliases, lat, lon in SEOUL_DISTRICTS
    ]


def _subway_places() -> list[dict]:
    places = []

    for slug, name, aliases, lines, lat, lon in SEOUL_SUBWAY_STATIONS:
        place = {
            "id": f"station-{slug}",
            "type": "subway_station",
            "name": name,
            "display_name": f"{name} {'/'.join(lines)}",
            "sido": SEOUL_SIDO,
            "sigungu": None,
            "dong": None,
            "aliases": list(dict.fromkeys([name, name.removesuffix("역"), *aliases])),
            "lines": lines,
            "priority": 20,
        }

        if lat is not None and lon is not None:
            place["location"] = {"lat": lat, "lon": lon}

        places.append(place)

    return places


def _static_dong_places() -> list[dict]:
    places = []

    for sigungu, dongs in SEOUL_DONGS_BY_DISTRICT.items():
        for dong in dongs:
            places.append(
                {
                    "id": f"dong-seoul-{sigungu}-{dong}",
                    "type": "dong",
                    "name": dong,
                    "display_name": f"{SEOUL_SIDO} {sigungu} {dong}",
                    "sido": SEOUL_SIDO,
                    "sigungu": sigungu,
                    "dong": dong,
                    "aliases": [
                        dong,
                        dong.removesuffix("동"),
                        f"{sigungu} {dong}",
                    ],
                    "lines": [],
                    "priority": 35,
                }
            )

    return places


def _parse_seoul_dong(address: str) -> tuple[str, str] | None:
    parts = address.split()
    if not parts or parts[0] not in {"서울", "서울시", "서울특별시"}:
        return None

    sigungu = next((part for part in parts if part.endswith("구")), None)
    dong = next(
        (part for part in parts if part.endswith(("동", "가")) and not part.endswith("구")),
        None,
    )

    if not sigungu or not dong:
        return None

    return sigungu, dong


def _dong_places_from_rooms(db: Session) -> list[dict]:
    rows = db.execute(
        select(Room.address, Room.lat, Room.lng).where(
            Room.status == "ACTIVE",
            Room.address.ilike("%서울%"),
        )
    ).all()

    grouped = {}
    for address, lat, lng in rows:
        parsed = _parse_seoul_dong(address or "")
        if not parsed:
            continue

        sigungu, dong = parsed
        item = grouped.setdefault(
            (sigungu, dong),
            {"count": 0, "lat_sum": 0.0, "lon_sum": 0.0},
        )
        item["count"] += 1
        item["lat_sum"] += float(lat)
        item["lon_sum"] += float(lng)

    places = []
    for (sigungu, dong), item in grouped.items():
        count = item["count"]
        places.append(
            {
                "id": f"dong-seoul-{sigungu}-{dong}",
                "type": "dong",
                "name": dong,
                "display_name": f"서울특별시 {sigungu} {dong}",
                "sido": "서울특별시",
                "sigungu": sigungu,
                "dong": dong,
                "aliases": [dong, dong.removesuffix("동"), f"{sigungu} {dong}"],
                "lines": [],
                "location": {
                    "lat": item["lat_sum"] / count,
                    "lon": item["lon_sum"] / count,
                },
                "priority": 40,
            }
        )

    return places


def build_places(db: Session) -> list[dict]:
    places = {}
    for place in [
        *_district_places(),
        *_static_dong_places(),
        *_subway_places(),
        *_dong_places_from_rooms(db),
    ]:
        places[place["id"]] = place
    return list(places.values())


def _create_index_if_needed(es) -> None:
    if es.indices.exists(index=PLACES_INDEX):
        es.indices.delete(index=PLACES_INDEX)

    es.indices.create(
        index=PLACES_INDEX,
        mappings={
            "properties": {
                "id": {"type": "keyword"},
                "type": {"type": "keyword"},
                "name": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword"}},
                },
                "display_name": {"type": "text"},
                "sido": {"type": "keyword"},
                "sigungu": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword"}},
                },
                "dong": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword"}},
                },
                "aliases": {"type": "text"},
                "lines": {"type": "keyword"},
                "location": {"type": "geo_point"},
                "priority": {"type": "integer"},
            }
        },
    )


def ensure_places_index(db: Session) -> bool:
    global _index_ready

    if _index_ready:
        return True

    es = _get_es_client()
    if es is None:
        return False

    try:
        _create_index_if_needed(es)
        actions = [
            {"_index": PLACES_INDEX, "_id": place["id"], "_source": place}
            for place in build_places(db)
        ]
        if actions and bulk is not None:
            bulk(es, actions, refresh=True)

        _index_ready = True
        return True
    except Exception as exc:
        print(f"[places] Elasticsearch unavailable, using fallback: {exc}")
        return False


def _search_places_in_memory(db: Session, query: str, limit: int) -> list[dict]:
    scored = [
        (score, place)
        for place in build_places(db)
        if (score := _score_place(place, query)) > 0
    ]
    scored.sort(key=lambda pair: (-pair[0], -pair[1].get("priority", 0), pair[1]["name"]))
    return [_place_response(place) for _, place in scored[:limit]]


def search_places(db: Session, query: str, limit: int = 10) -> list[dict]:
    clean_query = query.strip()
    if not clean_query:
        return []

    if not ensure_places_index(db):
        return _search_places_in_memory(db, clean_query, limit)

    es = _get_es_client()
    if es is None:
        return _search_places_in_memory(db, clean_query, limit)

    try:
        result = es.search(
            index=PLACES_INDEX,
            size=limit,
            query={
                "bool": {
                    "should": [
                        {"match_phrase_prefix": {"name": {"query": clean_query, "boost": 5}}},
                        {"match_phrase_prefix": {"aliases": {"query": clean_query, "boost": 4}}},
                        {"match": {"display_name": {"query": clean_query, "boost": 2}}},
                        {"term": {"sigungu.keyword": {"value": clean_query, "boost": 6}}},
                        {"term": {"dong.keyword": {"value": clean_query, "boost": 6}}},
                    ],
                    "minimum_should_match": 1,
                }
            },
            sort=[
                {"_score": {"order": "desc"}},
                {"priority": {"order": "desc"}},
                {"name.keyword": {"order": "asc"}},
            ],
        )
        return [_place_response(hit["_source"]) for hit in result["hits"]["hits"]]
    except Exception as exc:
        print(f"[places] Elasticsearch search failed, using fallback: {exc}")
        return _search_places_in_memory(db, clean_query, limit)
