import os
from sqlalchemy import create_engine, text

RDS_URL = os.environ.get("DATABASE_URL")

if not RDS_URL:
    print("Error: 環境変数 DATABASE_URL が設定されていません。")
    exit(1)

print(f"Connecting to: {RDS_URL}")
try:
    engine = create_engine(RDS_URL)
    
    with engine.connect() as conn:
        # ユーザーテーブルの確認
        users = conn.execute(text("SELECT id, username FROM users LIMIT 5")).fetchall()
        print("\n--- Users (First 5) ---")
        for u in users:
            print(u)
        
        # レシピテーブルのレコード数を確認
        recipes_count = conn.execute(text("SELECT COUNT(*) FROM recipes")).scalar()
        print(f"\n--- Total Recipes: {recipes_count} ---")
        
        # コスメマスタのレコード数を確認
        cosmetics_count = conn.execute(text("SELECT COUNT(*) FROM cosmetic_master")).scalar()
        print(f"\n--- Total Cosmetics: {cosmetics_count} ---")
        
        print("\nConnection and Data Retrieval Successful!")
    
except Exception as e:
    print("Database connection or query failed:")
    print(e)
