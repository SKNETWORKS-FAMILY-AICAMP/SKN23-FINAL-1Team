import os
import math
from io import BytesIO

import pandas as pd
import psycopg2
from psycopg2 import sql
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

st.set_page_config(
    page_title="데이터베이스 조회 프로그램",
    page_icon="📊",
    layout="wide",
)

DEFAULT_TABLES = [
    "items",
    "items_features",
    "item_images",
    "item_image_embeddings",
    "users",
]

PAGE_SIZE_OPTIONS = [20, 50, 100, 200]


def get_db_config():
    return {
        "host": os.getenv("DB_HOST", "127.0.0.1"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "dbname": os.getenv("DB_NAME", "postgres"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", ""),
    }


def get_connection():
    return psycopg2.connect(**get_db_config())


@st.cache_data(ttl=60)
def load_tables():
    query = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    """
    with get_connection() as conn:
        df = pd.read_sql(query, conn)
    return df["table_name"].tolist()


@st.cache_data(ttl=60)
def load_columns(table_name: str):
    query = """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        ORDER BY ordinal_position
    """
    with get_connection() as conn:
        df = pd.read_sql(query, conn, params=[table_name])
    return df


def is_text_type(data_type: str) -> bool:
    return data_type in {
        "character varying",
        "text",
        "character",
        "uuid",
    }


def is_numeric_type(data_type: str) -> bool:
    return data_type in {
        "smallint",
        "integer",
        "bigint",
        "numeric",
        "real",
        "double precision",
    }


def is_date_type(data_type: str) -> bool:
    return data_type in {
        "date",
        "timestamp without time zone",
        "timestamp with time zone",
    }


def build_where_clause(filters, columns_df):
    conditions = []
    params = []

    for _, row in columns_df.iterrows():
        col = row["column_name"]
        data_type = row["data_type"]

        if data_type == "boolean":
            value = filters.get(col)
            if value == "TRUE":
                conditions.append(sql.SQL("{} = TRUE").format(sql.Identifier(col)))
            elif value == "FALSE":
                conditions.append(sql.SQL("{} = FALSE").format(sql.Identifier(col)))

        elif is_text_type(data_type):
            keyword = filters.get(col)
            if keyword:
                conditions.append(
                    sql.SQL("{} ILIKE %s").format(sql.Identifier(col))
                )
                params.append(f"%{keyword}%")

        elif is_numeric_type(data_type):
            min_value = filters.get(f"{col}__min")
            max_value = filters.get(f"{col}__max")

            if min_value not in (None, ""):
                conditions.append(
                    sql.SQL("{} >= %s").format(sql.Identifier(col))
                )
                params.append(min_value)

            if max_value not in (None, ""):
                conditions.append(
                    sql.SQL("{} <= %s").format(sql.Identifier(col))
                )
                params.append(max_value)

        elif is_date_type(data_type):
            start_date = filters.get(f"{col}__start")
            end_date = filters.get(f"{col}__end")

            if start_date:
                conditions.append(
                    sql.SQL("{} >= %s").format(sql.Identifier(col))
                )
                params.append(start_date)

            if end_date:
                conditions.append(
                    sql.SQL("{} <= %s").format(sql.Identifier(col))
                )
                params.append(end_date)

    return conditions, params


def fetch_table_data(table_name, columns_df, filters, sort_column, sort_order, page, page_size):
    where_conditions, params = build_where_clause(filters, columns_df)

    base_query = sql.SQL("SELECT * FROM {}").format(sql.Identifier(table_name))
    count_query = sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table_name))

    if where_conditions:
        where_sql = sql.SQL(" WHERE ") + sql.SQL(" AND ").join(where_conditions)
        base_query += where_sql
        count_query += where_sql

    if sort_column:
        order_sql = sql.SQL(" ORDER BY {} {}").format(
            sql.Identifier(sort_column),
            sql.SQL("ASC" if sort_order == "ASC" else "DESC"),
        )
        base_query += order_sql

    offset = (page - 1) * page_size
    base_query += sql.SQL(" LIMIT %s OFFSET %s")
    final_params = params + [page_size, offset]

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(count_query, params)
            total_count = cur.fetchone()[0]

        df = pd.read_sql(base_query, conn, params=final_params)

    return df, total_count


def run_select_query(query_text: str):
    stripped = query_text.strip().lower()
    if not stripped.startswith("select"):
        raise ValueError("SELECT 쿼리만 실행할 수 있습니다.")

    forbidden = ["insert ", "update ", "delete ", "drop ", "alter ", "truncate ", "create "]
    if any(word in stripped for word in forbidden):
        raise ValueError("조회용 프로그램이므로 SELECT 외 쿼리는 허용되지 않습니다.")

    with get_connection() as conn:
        return pd.read_sql(query_text, conn)


def to_csv_bytes(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False).encode("utf-8-sig")


st.title("데이터베이스 조회 프로그램")
st.caption("공개 스키마(public)의 테이블 데이터를 조회하는 프로그램")

tab1, tab2 = st.tabs(["테이블 조회", "직접 SQL 조회"])

with tab1:
    try:
        all_tables = load_tables()
    except Exception as e:
        st.error(f"테이블 목록 조회 실패: {e}")
        st.stop()

    candidate_tables = [t for t in DEFAULT_TABLES if t in all_tables]
    display_tables = candidate_tables if candidate_tables else all_tables

    col_left, col_right = st.columns([1, 3])

    with col_left:
        selected_table = st.selectbox("테이블 선택", display_tables)

        try:
            columns_df = load_columns(selected_table)
        except Exception as e:
            st.error(f"컬럼 조회 실패: {e}")
            st.stop()

        sort_column = st.selectbox(
            "정렬 컬럼",
            [""] + columns_df["column_name"].tolist(),
        )
        sort_order = st.radio("정렬 방향", ["DESC", "ASC"], horizontal=True)
        page_size = st.selectbox("페이지 크기", PAGE_SIZE_OPTIONS, index=1)

        st.markdown("### 검색 조건")
        filters = {}

        for _, row in columns_df.iterrows():
            col = row["column_name"]
            data_type = row["data_type"]

            with st.expander(f"{col} ({data_type})", expanded=False):
                if data_type == "boolean":
                    filters[col] = st.selectbox(
                        f"{col} 값",
                        ["ALL", "TRUE", "FALSE"],
                        key=f"filter_{col}",
                    )
                elif is_text_type(data_type):
                    filters[col] = st.text_input(
                        f"{col} 포함 검색",
                        key=f"filter_{col}",
                    )
                elif is_numeric_type(data_type):
                    min_col, max_col = st.columns(2)
                    with min_col:
                        filters[f"{col}__min"] = st.text_input(
                            f"{col} 최소",
                            key=f"filter_{col}_min",
                        )
                    with max_col:
                        filters[f"{col}__max"] = st.text_input(
                            f"{col} 최대",
                            key=f"filter_{col}_max",
                        )
                elif is_date_type(data_type):
                    start_col, end_col = st.columns(2)
                    with start_col:
                        filters[f"{col}__start"] = st.text_input(
                            f"{col} 시작",
                            placeholder="2026-01-01",
                            key=f"filter_{col}_start",
                        )
                    with end_col:
                        filters[f"{col}__end"] = st.text_input(
                            f"{col} 종료",
                            placeholder="2026-12-31",
                            key=f"filter_{col}_end",
                        )

    with col_right:
        page = st.number_input("페이지", min_value=1, value=1, step=1)

        try:
            df, total_count = fetch_table_data(
                table_name=selected_table,
                columns_df=columns_df,
                filters=filters,
                sort_column=sort_column or None,
                sort_order=sort_order,
                page=page,
                page_size=page_size,
            )
        except Exception as e:
            st.error(f"데이터 조회 실패: {e}")
            st.stop()

        total_pages = max(1, math.ceil(total_count / page_size))

        st.markdown(
            f"""
            **조회 결과**  
            - 테이블: `{selected_table}`  
            - 전체 건수: `{total_count}`  
            - 현재 페이지: `{page} / {total_pages}`
            """
        )

        st.dataframe(df, use_container_width=True, hide_index=True)

        st.download_button(
            label="현재 조회 결과 CSV 다운로드",
            data=to_csv_bytes(df),
            file_name=f"{selected_table}_page_{page}.csv",
            mime="text/csv",
        )

with tab2:
    st.markdown("### 직접 SQL 조회")
    st.caption("SELECT 쿼리만 허용됩니다.")

    default_sql = """SELECT *
FROM items
LIMIT 50;"""

    query_text = st.text_area(
        "SQL 입력",
        value=default_sql,
        height=200,
    )

    if st.button("SQL 실행"):
        try:
            sql_df = run_select_query(query_text)
            st.success(f"조회 성공: {len(sql_df)}건")
            st.dataframe(sql_df, use_container_width=True, hide_index=True)

            st.download_button(
                label="SQL 결과 CSV 다운로드",
                data=to_csv_bytes(sql_df),
                file_name="sql_result.csv",
                mime="text/csv",
            )
        except Exception as e:
            st.error(f"SQL 실행 실패: {e}")