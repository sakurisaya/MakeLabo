from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./mua_recipe.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ここで Base を定義します（models.pyでこれを使います）
Base = declarative_base()

def init_db():
    # ここは一旦中身を空にするか、後の手順で修正します
    Base.metadata.create_all(bind=engine)