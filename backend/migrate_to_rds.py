"""
SQLite → RDS (PostgreSQL) 完全移行スクリプト v2
オブジェクトを辞書として取り出し、新規INSERTする安全な方式
"""
import os
from sqlalchemy import create_engine, text

SQLITE_URL = "sqlite:///./mua_recipe.db"
RDS_URL = os.environ.get("DATABASE_URL")

if not RDS_URL:
    print("Error: 環境変数 DATABASE_URL が設定されていません。")
    exit(1)

print("Starting Migration (v2) from SQLite to PostgreSQL...")
sqlite_engine = create_engine(SQLITE_URL)
rds_engine = create_engine(RDS_URL)

# ----- Step 1: RDSにテーブルを作成 -----
# modelsを直接使わず、SQLiteからテーブル定義をリフレクトして移植する
print("\n[Step 1] Creating tables in RDS via SQLAlchemy models...")
import models
models.Base.metadata.create_all(bind=rds_engine)
print("  -> Tables created (or already exist).")

# ----- Step 2: 各テーブルのデータをコピー -----
# 移行する順番: 外部キー制約を考慮（親テーブルを先に）
TABLES = ["users", "cosmetic_masters", "recipes", "recipe_images", "items"]

with sqlite_engine.connect() as src, rds_engine.connect() as dst:
    for table in TABLES:
        print(f"\n[Step 2] Migrating table: {table}...")
        
        # SQLiteから全件取得
        try:
            rows = src.execute(text(f"SELECT * FROM {table}")).fetchall()
        except Exception as e:
            print(f"  WARNING: Could not read '{table}' from SQLite: {e}. Skipping.")
            continue
        
        if not rows:
            print(f"  -> No data in '{table}'. Skipping.")
            continue
        
        # PostgreSQL側のデータは一度消してからInsert（重複防止）
        try:
            dst.execute(text(f"DELETE FROM {table}"))
        except Exception as e:
            print(f"  WARNING: Could not clear '{table}' in RDS: {e}")
        
        # 辞書形式でInsert（1行ずつ独立したトランザクションで処理）
        col_names = rows[0]._fields
        success_count = 0
        for row in rows:
            row_dict = dict(zip(col_names, row))
            
            # SQLite の 0/1 整数値を Python の bool に変換（PostgreSQL bool型対応）
            for key, val in row_dict.items():
                if isinstance(val, int) and key in ("is_default_pin", "is_admin", "is_thumbnail", "is_make_map", "is_active"):
                    row_dict[key] = bool(val)
            
            placeholders = ", ".join([f":{c}" for c in col_names])
            cols = ", ".join(col_names)
            sql = text(f"INSERT INTO {table} ({cols}) VALUES ({placeholders})")
            try:
                dst.execute(sql, row_dict)
                dst.commit()   # 1件ごとにコミット（エラー時に他の行を巻き込まない）
                success_count += 1
            except Exception as e:
                dst.rollback() # 失敗行だけをロールバックして次の行へ
                print(f"  ERROR inserting row {row_dict.get('id', '?')}: {e}")
        
        print(f"  -> Migrated {success_count} / {len(rows)} rows.")

print("\n✅ Migration v2 completed!")
