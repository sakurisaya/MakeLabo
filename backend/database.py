import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# AWSの設定（環境変数）があればそれを使い、なければローカルのSQLiteを使う
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mua_recipe.db")

# PostgreSQLとSQLiteで引数が異なるための分岐
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # RDS (PostgreSQL等)用
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ここで Base を定義します（models.pyでこれを使います）
Base = declarative_base()

def init_db():
    # SQLite/PostgreSQL いずれにおいてもテーブルが存在しなければ作成する
    Base.metadata.create_all(bind=engine)