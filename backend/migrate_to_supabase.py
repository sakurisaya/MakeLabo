"""
AWS RDS(スナップショット復元後) → Supabase 完全移行スクリプト
"""
import os
from sqlalchemy import create_engine, text
import models

# ユーザー入力または環境変数から取得
OLD_RDS_URL = "postgresql://postgres:XjsZYQRTvHkNw2p@makelabo-db01.c5so4kq62c21.ap-northeast-1.rds.amazonaws.com:5432/postgres"
NEW_SUPABASE_URL = "postgresql://postgres:cg2NH%#mF$&eD/$@db.zlqnkqbptiszrcbnabqs.supabase.co:5432/postgres"

if not OLD_RDS_URL:
    print("Error: OLD_RDS_URL が設定されていません。復元したRDSのエンドポイントを指定してください。")
    exit(1)

print("Starting Migration from restored AWS RDS to Supabase...")
rds_engine = create_engine(OLD_RDS_URL)
# SupabaseはSSL必須なことが多いので sslmode=require を付けるか、Supabase側で許可するか。デフォルトで繋がるはず。
supabase_engine = create_engine(NEW_SUPABASE_URL)

# ----- Step 1: Supabaseにテーブルを作成 -----
print("\n[Step 1] Creating tables in Supabase via SQLAlchemy models...")
models.Base.metadata.create_all(bind=supabase_engine)
print("  -> Tables created (or already exist).")

# ----- Step 2: 各テーブルのデータをコピー -----
# 外部キー制約を考慮した順番
TABLES = ["users", "cosmetic_masters", "recipes", "recipe_images", "items"]

with rds_engine.connect() as src, supabase_engine.connect() as dst:
    for table in TABLES:
        print(f"\n[Step 2] Migrating table: {table}...")
        
        # RDSから全件取得
        try:
            rows = src.execute(text(f"SELECT * FROM {table}")).fetchall()
        except Exception as e:
            print(f"  WARNING: Could not read '{table}' from RDS: {e}. Skipping.")
            continue
        
        if not rows:
            print(f"  -> No data in '{table}'. Skipping.")
            continue
        
        # Supabase側のデータは一度消してからInsert
        try:
            dst.execute(text(f"DELETE FROM {table}"))
            dst.commit()
        except Exception as e:
            print(f"  WARNING: Could not clear '{table}' in Supabase: {e}")
            dst.rollback()
        
        # Insert
        col_names = rows[0]._fields
        success_count = 0
        for row in rows:
            row_dict = dict(zip(col_names, row))
            
            placeholders = ", ".join([f":{c}" for c in col_names])
            cols = ", ".join(col_names)
            sql = text(f"INSERT INTO {table} ({cols}) VALUES ({placeholders})")
            try:
                dst.execute(sql, row_dict)
                dst.commit()
                success_count += 1
            except Exception as e:
                dst.rollback()
                print(f"  ERROR inserting row {row_dict.get('id', '?')}: {e}")
        
        print(f"  -> Migrated {success_count} / {len(rows)} rows.")

print("\n✅ Migration to Supabase completed safely!")
