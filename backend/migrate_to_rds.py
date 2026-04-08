import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models

SQLITE_URL = "sqlite:///./mua_recipe.db"
RDS_URL = os.environ.get("DATABASE_URL")

if not RDS_URL:
    print("Error: 環境変数 DATABASE_URL が設定されていません。")
    print("一時的に以下のようにPowerShellで設定してから実行してください:")
    print("$env:DATABASE_URL=\"postgresql://<user>:<password>@<endpoint>:5432/<dbname>\"")
    exit(1)

print("Starting Migration from SQLite to PostgreSQL...")

sqlite_engine = create_engine(SQLITE_URL)
rds_engine = create_engine(RDS_URL)

SqliteSession = sessionmaker(bind=sqlite_engine)
RdsSession = sessionmaker(bind=rds_engine)

sqlite_db = SqliteSession()
rds_db = RdsSession()

print("Creating tables in RDS...")
models.Base.metadata.create_all(bind=rds_engine)

def migrate_table(model_class):
    print(f"Migrating {model_class.__tablename__}...")
    items = sqlite_db.query(model_class).all()
    # Detach objects from SQLite session
    for item in items:
        sqlite_db.expunge(item)
    
    # Add to Postgres session
    if items:
        rds_db.add_all(items)
        rds_db.commit()
    print(f"  -> Migrated {len(items)} items.")

try:
    # 外部キー制約のある親テーブルから順にコピーする
    migrate_table(models.User)
    migrate_table(models.CosmeticMaster)
    migrate_table(models.Recipe)
    migrate_table(models.RecipeImage)
    migrate_table(models.Item)
    print("Migration completed successfully!")
except Exception as e:
    rds_db.rollback()
    print(f"Migration failed: {str(e)}")
finally:
    sqlite_db.close()
    rds_db.close()
