"""
PostgreSQL のシーケンス（自動採番カウンタ）を現在の最大IDにリセットする
移行後に新規レコードが保存できないエラーの修正
"""
import os
from sqlalchemy import create_engine, text

RDS_URL = os.environ.get("DATABASE_URL")
if not RDS_URL:
    print("Error: 環境変数 DATABASE_URL が設定されていません。")
    exit(1)

engine = create_engine(RDS_URL)

TABLES = ["users", "cosmetic_masters", "recipes", "recipe_images", "items"]

print("Resetting PostgreSQL sequences...")
with engine.connect() as conn:
    for table in TABLES:
        try:
            # テーブルの最大IDを取得してシーケンスをリセット
            sql = text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1)) FROM {table}")
            result = conn.execute(sql).scalar()
            print(f"  -> {table}: sequence reset to {result}")
        except Exception as e:
            print(f"  ERROR on {table}: {e}")
    conn.commit()

print("\n✅ Sequence reset completed! New records can now be saved.")
