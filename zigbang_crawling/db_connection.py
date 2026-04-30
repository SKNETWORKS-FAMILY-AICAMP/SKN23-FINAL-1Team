import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

def db_connection():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    ROOT_DIR = os.path.dirname(BASE_DIR)
    load_dotenv(os.path.join(ROOT_DIR, ".env"))

    RUN_ENV = os.getenv("ENV", "SERVER")

    if RUN_ENV == "LOCAL":
        DB_HOST = "127.0.0.1"
        DB_PORT = "15432"

    else:
        DB_HOST = os.getenv("DB_HOST")
        DB_PORT = os.getenv("DB_PORT")

    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_NAME = os.getenv("DB_NAME")

    db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(db_url)

    return engine

if __name__ == "__main__":
    "DB 연결 확인용 코드입니다."
    engine = db_connection()
    print(engine)
    try:
        with engine.connect() as connection:
            print("DB 연결 성공")
    except Exception as e:
        print(f"DB 연결 실패: {e}")
    finally:
        engine.dispose()
    