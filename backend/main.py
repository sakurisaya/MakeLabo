import datetime
import io
import os
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional

import database
import models
import schemas
from color_utils import find_closest_pccs, hex_to_rgb
from constants import DEFAULT_PIN_LABELS
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from passlib.context import CryptContext
from PIL import Image
from sqlalchemy import func
from sqlalchemy.orm import Session

# --- 1. 定数・パス・セキュリティ設定 ---

# アプリの保存先などを絶対パスで定義（どこから起動しても動くように）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "images")
os.makedirs(UPLOAD_DIR, exist_ok=True) # フォルダがなければ作成

# JWT（トークン）認証用の設定
# 本番環境では SECRET_KEY を複雑なランダム文字列に変更してください
SECRET_KEY = "your-super-secret-key-change-it-for-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # トークンの有効期限（24時間）

# パスワードのハッシュ化（生パスワードを保存しない仕組み）
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# OAuth2のトークン受け渡しルールを定義（開発用に auto_error=False を設定）
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# データベースのテーブルを初期化（まだなければ作成）
database.init_db()


# --- 2. ユーザー初期化 & ライフサイクル ---

def create_initial_users(db: Session):
    """
    アプリ起動時に固定のアカウント (master, test1) を自動で作成。
    既に存在する場合は何もしない。
    """
    # 1. 閲覧用の master (見本データ作成用)
    if not db.query(models.User).filter(models.User.username == "master").first():
        db.add(models.User(
            username="master",
            hashed_password=pwd_context.hash("master1234"),
            is_admin=True
        ))
        print("Account created: user=master, pass=master1234")
    
    # 2. 実際に操作を試すための test1
    if not db.query(models.User).filter(models.User.username == "test1").first():
        db.add(models.User(
            username="test1",
            hashed_password=pwd_context.hash("test1234"),
            is_admin=False
        ))
        print("Account created: user=test1, pass=test1234")
    
    db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリが起動・終了する際の特殊イベントを管理"""
    # DATABASE_URL が設定されていない（＝ローカル環境の）時のみ見本データを作成
    if not os.getenv("DATABASE_URL"):
        db = database.SessionLocal()
        try:
            create_initial_users(db)
        finally:
            db.close()
    else:
        print("Running in Production (External DB). Skipping default user creation.")
    yield

# FastAPIアプリのインスタンス生成
app = FastAPI(lifespan=lifespan)

# CORS制限の解除（フロントエンドとバックエンドが通信できるように許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                         # ローカル開発用
        "https://main.d2jqhenkd2g20n.amplifyapp.com",   # Amplify本番
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- キャッシュ無効化ミドルウェア ---
# CloudFront等のCDNやブラウザがGETリクエストを勝手に長期間キャッシュし、
# 古いデータ（増幅したり消えたりするバグの原因）を返すのを防ぎ、常に最新のDBデータを取得させます。
@app.middleware("http")
async def add_cache_control_header(request, call_next):
    response = await call_next(request)
    # APIのレスポンスに対しては強力にキャッシュを禁止
    if request.url.path.startswith("/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# 保存された画像（static/images内）をURLで公開（http://localhost:8000/static/...）
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# --- AWS ELB/ヘルスチェック用エンドポイント ---
# AWS Elastic Beanstalkのロードバランサーは、デフォルトで「/」にアクセスして
# アプリが生きているか確認（ヘルスチェック）します。これが無いとインスタンスが破棄・再起動を繰り返します。
@app.get("/")
@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- 3. 認証・DB操作の依存関係 (Dependencies) ---

def get_db():
    """リクエストごとにDB接続を確立し、終わったら自動で閉じる"""
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict):
    """ログイン成功時に、署名付きのJWTトークンを発行する"""
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    リクエストヘッダーのトークンを検証し、現在ログイン中のユーザー情報を取得する。
    トークンが無効または存在しない場合は、開発用に 'master' ユーザーを返す。
    """
    user = None
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username:
                user = db.query(models.User).filter(models.User.username == username).first()
        except JWTError:
            pass
    
    if not user:
        # トークンなし または ユーザー検証失敗時は master を返す（開発用）
        user = db.query(models.User).filter(models.User.username == "master").first()
        
    if not user:
        # 退避策
        user = db.query(models.User).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found. Please run initialization.")
            
    return user


# --- 4. エンドポイント: 認証・画像操作 ---

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """ユーザー名とPWを照合し、成功ならトークンを返す（ログイン処理）"""
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}

@app.post("/upload/")
async def upload_image(file: UploadFile = File(...)):
    """
    画像をアップロードし、サーバーに保存する。
    リサイズ（高品質なLANCZOS法）と形式の統一（JPEG）を行い、軽量化する。
    """
    file_name = f"{uuid.uuid4()}.jpg" # ファイルが重複しないようUUIDを使用
    file_path = os.path.join(UPLOAD_DIR, file_name)

    # 1. メモリに読み込む
    content = await file.read()
    img = Image.open(io.BytesIO(content))
    if img.mode != "RGB":
        img = img.convert("RGB")

    # 2. 最大サイズを1200pxに制限
    max_size = 1200
    if max(img.width, img.height) > max_size:
        ratio = max_size / max(img.width, img.height)
        img = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.Resampling.LANCZOS)

    # 3. 圧縮（quality=85）して一時保存
    img.save(file_path, "JPEG", quality=85, optimize=True)

    # 4. クラウド環境（S3バケット名が設定されている）場合、S3にアップロードして絶対URLを返す
    s3_bucket = os.getenv("S3_BUCKET_NAME")
    if s3_bucket:
        try:
            import boto3
            aws_region = os.getenv("AWS_REGION", "ap-northeast-1")
            s3_client = boto3.client('s3', region_name=aws_region)
            s3_key = f"images/{file_name}"
            
            s3_client.upload_file(
                file_path, s3_bucket, s3_key, 
                ExtraArgs={'ContentType': 'image/jpeg'}
            )
            s3_url = f"https://{s3_bucket}.s3.{aws_region}.amazonaws.com/{s3_key}"
            
            # 容量節約のためローカルの一時ファイルは削除
            try:
                os.remove(file_path)
            except:
                pass
                
            return {"image_url": s3_url}
        except Exception as e:
            print(f"S3 Upload failed: {str(e)}")

    # ローカル環境用（またはS3失敗時のフォールバック）
    return {"image_url": f"/static/images/{file_name}"}


# --- 5. エンドポイント: コスメ図鑑 & メイク日記 ---

@app.post("/cosmetics/", response_model=schemas.CosmeticMasterRead)
def create_cosmetic(cosmetic: schemas.CosmeticMasterCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    自分の持っているコスメを図鑑に登録する。
    重複（ブランド名＋商品名＋色番号＋カテゴリ＋色HEXが一致）があれば既存のものを返す。
    """
    existing = db.query(models.CosmeticMaster).filter(
        models.CosmeticMaster.brand == cosmetic.brand,
        models.CosmeticMaster.name == cosmetic.name,
        models.CosmeticMaster.color_number == cosmetic.color_number,
        models.CosmeticMaster.category == cosmetic.category,
        models.CosmeticMaster.color_hex == cosmetic.color_hex
    ).first()
    
    if existing:
        return existing

    pccs = find_closest_pccs(cosmetic.color_hex)
    rgb = hex_to_rgb(cosmetic.color_hex)
    new_cosmetic = models.CosmeticMaster(**cosmetic.model_dump(), 
                                        pccs_tone=pccs["tone"], pccs_hue=pccs["hue"],
                                        r=rgb[0], g=rgb[1], b=rgb[2])
    db.add(new_cosmetic)
    db.commit(); db.refresh(new_cosmetic)
    return new_cosmetic

@app.get("/cosmetics/", response_model=List[schemas.CosmeticMasterRead])
def read_cosmetics(db: Session = Depends(get_db)):
    """登録したコスメの一覧を取得（ID降順で新しい順）"""
    return db.query(models.CosmeticMaster).order_by(models.CosmeticMaster.id.desc()).all()

@app.get("/cosmetics/{cosmetic_id}", response_model=schemas.CosmeticMasterRead)
def read_cosmetic(cosmetic_id: int, db: Session = Depends(get_db)):
    """特定のコスメ情報を取得"""
    cosmetic = db.query(models.CosmeticMaster).filter(models.CosmeticMaster.id == cosmetic_id).first()
    if not cosmetic:
        raise HTTPException(status_code=404, detail="Cosmetic not found")
    return cosmetic

@app.put("/cosmetics/{cosmetic_id}", response_model=schemas.CosmeticMasterRead)
def update_cosmetic(cosmetic_id: int, cosmetic_update: schemas.CosmeticMasterCreate, db: Session = Depends(get_db)):
    """コスメ情報を更新"""
    db_cosmetic = db.query(models.CosmeticMaster).filter(models.CosmeticMaster.id == cosmetic_id).first()
    if not db_cosmetic:
        raise HTTPException(status_code=404, detail="Cosmetic not found")
    
    update_data = cosmetic_update.model_dump()
    # PCCSとRGBの再計算（色が変更された可能性があるため）
    pccs = find_closest_pccs(cosmetic_update.color_hex)
    rgb = hex_to_rgb(cosmetic_update.color_hex)
    update_data.update({
        "pccs_tone": pccs["tone"],
        "pccs_hue": pccs["hue"],
        "r": rgb[0], "g": rgb[1], "b": rgb[2]
    })

    for key, value in update_data.items():
        setattr(db_cosmetic, key, value)
    
    db.commit()
    db.refresh(db_cosmetic)
    return db_cosmetic

@app.delete("/cosmetics/{cosmetic_id}")
def delete_cosmetic(cosmetic_id: int, db: Session = Depends(get_db)):
    """コスメを削除（参照しているItemのcosmetic_master_idをNULLに更新してから削除）"""
    db_cosmetic = db.query(models.CosmeticMaster).filter(models.CosmeticMaster.id == cosmetic_id).first()
    if not db_cosmetic:
        raise HTTPException(status_code=404, detail="Cosmetic not found")
    
    # このコスメを参照しているItemのcosmetic_master_idをNULLに（外部キー制約を回避）
    db.query(models.Item).filter(models.Item.cosmetic_master_id == cosmetic_id).update(
        {"cosmetic_master_id": None}
    )
    db.delete(db_cosmetic)
    db.commit()
    return {"message": "Cosmetic deleted successfully"}

@app.post("/cosmetics/{cosmetic_id}/duplicate", response_model=schemas.CosmeticMasterRead)
def duplicate_cosmetic(cosmetic_id: int, db: Session = Depends(get_db)):
    """コスメを複製"""
    db_cosmetic = db.query(models.CosmeticMaster).filter(models.CosmeticMaster.id == cosmetic_id).first()
    if not db_cosmetic:
        raise HTTPException(status_code=404, detail="Cosmetic not found")
    
    # IDを除いてコピー
    new_cosmetic = models.CosmeticMaster(
        category=db_cosmetic.category,
        name=f"{db_cosmetic.name} (Copy)",
        brand=db_cosmetic.brand,
        texture=db_cosmetic.texture,
        color_number=db_cosmetic.color_number,
        memo=db_cosmetic.memo,
        image_url=db_cosmetic.image_url,
        pccs_tone=db_cosmetic.pccs_tone,
        pccs_hue=db_cosmetic.pccs_hue,
        color_hex=db_cosmetic.color_hex,
        r=db_cosmetic.r, g=db_cosmetic.g, b=db_cosmetic.b,
        transparency=db_cosmetic.transparency
    )
    db.add(new_cosmetic)
    db.commit()
    db.refresh(new_cosmetic)
    return new_cosmetic

@app.post("/recipes/", response_model=schemas.RecipeRead)
def create_recipe(recipe: schemas.RecipeCreate, db: Session = Depends(get_db), token: Optional[str] = Depends(oauth2_scheme)):
    """
    メイクレシピ（日記）を保存する。
    画像、ピン（アイテム）、コスメ情報も同時に処理。
    """
    # 開発用: トークンがない場合は 'test1' ユーザーとして扱う
    current_user = None
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username:
                current_user = db.query(models.User).filter(models.User.username == username).first()
        except:
            pass
    
    if not current_user:
         # デフォルトで master ユーザーを使用（ユーザー要望）
         current_user = db.query(models.User).filter(models.User.username == "master").first()
         if not current_user:
             # いなければ test1
             current_user = db.query(models.User).filter(models.User.username == "test1").first()
             if not current_user:
                 current_user = db.query(models.User).first()
    
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found for saving. Please run initialization.")

    try:
        # 1. レシピ本体の作成
        db_recipe = models.Recipe(
            title=recipe.title,
            description=recipe.description,
            scene_tag=recipe.scene_tag,
            date=recipe.date or datetime.date.today(),
            author_id=current_user.id
        )
        db.add(db_recipe)
        db.flush() # ID確定のために一時反映

        # 2. 各画像の作成
        for img_data in recipe.images:
            db_image = models.RecipeImage(
                recipe_id=db_recipe.id,
                image_path=img_data.image_path,
                is_thumbnail=img_data.is_thumbnail,
                is_make_map=img_data.is_make_map
            )
            db.add(db_image)
            db.flush()

            # 3. 画像に紐付くピン（アイテム）の作成
            for item_data in img_data.items:
                cosme_id = None
                if item_data.cosmetic_master_id:
                    cosme_id = item_data.cosmetic_master_id
                elif item_data.brand and item_data.name:
                    existing = db.query(models.CosmeticMaster).filter(
                        models.CosmeticMaster.brand == item_data.brand,
                        models.CosmeticMaster.name == item_data.name,
                        models.CosmeticMaster.color_number == item_data.color_number,
                        models.CosmeticMaster.category == (item_data.category or "未分類"),
                        models.CosmeticMaster.color_hex == (item_data.color_hex or "#FFFFFF")
                    ).first()
                    if existing:
                        cosme_id = existing.id
                        if item_data.memo and not existing.memo:
                            existing.memo = item_data.memo
                    else:
                        pccs = find_closest_pccs(item_data.color_hex or "#FFFFFF")
                        rgb = hex_to_rgb(item_data.color_hex or "#FFFFFF")
                        new_cosme = models.CosmeticMaster(
                            brand=item_data.brand,
                            name=item_data.name,
                            color_number=item_data.color_number,
                            memo=item_data.memo,
                            category=item_data.category or "未分類",
                            texture=item_data.texture or "未指定",
                            color_hex=item_data.color_hex or "#FFFFFF",
                            pccs_tone=pccs["tone"], pccs_hue=pccs["hue"],
                            r=rgb[0], g=rgb[1], b=rgb[2], transparency=100
                        )
                        db.add(new_cosme)
                        db.flush()
                        cosme_id = new_cosme.id

                db_item = models.Item(
                    image_id=db_image.id,
                    cosmetic_master_id=cosme_id,
                    x_position=item_data.x_position,
                    y_position=item_data.y_position,
                    pin_memo=item_data.pin_memo,
                    is_default_pin=item_data.is_default_pin,
                    pin_label=item_data.pin_label
                )
                db.add(db_item)
        
        db.commit()
        db.refresh(db_recipe)
        return db_recipe
    except Exception as e:
        db.rollback()
        print(f"ERROR DURING RECIPE SAVE: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database save error: {str(e)}")

@app.put("/recipes/{recipe_id}", response_model=schemas.RecipeRead)
def update_recipe(recipe_id: int, recipe: schemas.RecipeCreate, db: Session = Depends(get_db)):
    """
    既存のメイクレシピを上書き更新する。
    古い画像・アイテムを削除してから、新しいデータで再構築する。
    """
    db_recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    try:
        # 1. レシピ本体のフィールドを更新
        db_recipe.title = recipe.title
        db_recipe.description = recipe.description
        db_recipe.scene_tag = recipe.scene_tag
        db_recipe.date = recipe.date or db_recipe.date

        # 2. 既存の画像（とそれに紐付くアイテム）を削除
        for old_img in db_recipe.images:
            for old_item in old_img.items:
                db.delete(old_item)
            db.delete(old_img)
        db.flush()

        # 3. 新しい画像とアイテムを作成（create_recipe と同じロジック）
        for img_data in recipe.images:
            db_image = models.RecipeImage(
                recipe_id=db_recipe.id,
                image_path=img_data.image_path,
                is_thumbnail=img_data.is_thumbnail,
                is_make_map=img_data.is_make_map
            )
            db.add(db_image)
            db.flush()

            for item_data in img_data.items:
                cosme_id = None
                if item_data.cosmetic_master_id:
                    cosme_id = item_data.cosmetic_master_id
                elif item_data.brand and item_data.name:
                    existing = db.query(models.CosmeticMaster).filter(
                        models.CosmeticMaster.brand == item_data.brand,
                        models.CosmeticMaster.name == item_data.name,
                        models.CosmeticMaster.color_number == item_data.color_number,
                        models.CosmeticMaster.category == (item_data.category or "未分類"),
                        models.CosmeticMaster.color_hex == (item_data.color_hex or "#FFFFFF")
                    ).first()
                    if existing:
                        cosme_id = existing.id
                        if item_data.memo and not existing.memo:
                            existing.memo = item_data.memo
                    else:
                        pccs = find_closest_pccs(item_data.color_hex or "#FFFFFF")
                        rgb = hex_to_rgb(item_data.color_hex or "#FFFFFF")
                        new_cosme = models.CosmeticMaster(
                            brand=item_data.brand,
                            name=item_data.name,
                            color_number=item_data.color_number,
                            memo=item_data.memo,
                            category=item_data.category or "未分類",
                            texture=item_data.texture or "未指定",
                            color_hex=item_data.color_hex or "#FFFFFF",
                            pccs_tone=pccs["tone"], pccs_hue=pccs["hue"],
                            r=rgb[0], g=rgb[1], b=rgb[2], transparency=100
                        )
                        db.add(new_cosme)
                        db.flush()
                        cosme_id = new_cosme.id

                db_item = models.Item(
                    image_id=db_image.id,
                    cosmetic_master_id=cosme_id,
                    x_position=item_data.x_position,
                    y_position=item_data.y_position,
                    pin_memo=item_data.pin_memo,
                    is_default_pin=item_data.is_default_pin,
                    pin_label=item_data.pin_label
                )
                db.add(db_item)

        db.commit()
        db.refresh(db_recipe)
        return db_recipe
    except Exception as e:
        db.rollback()
        print(f"ERROR DURING RECIPE UPDATE: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database update error: {str(e)}")

@app.delete("/recipes/{recipe_id}")
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    """特定のレシピを削除する"""
    db_recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    db.delete(db_recipe)
    db.commit()
    return {"message": "Recipe deleted successfully"}

@app.get("/gallery/", response_model=List[schemas.RecipeRead])
def get_sample_gallery(db: Session = Depends(get_db)):
    """誰でも閲覧可: 見本用として master アカウントの投稿のみを抽出して返す"""
    master = db.query(models.User).filter(models.User.username == "master").first()
    if not master: return []
    return db.query(models.Recipe).filter(models.Recipe.author_id == master.id).order_by(models.Recipe.date.desc()).all()

@app.get("/recipes/all", response_model=List[schemas.RecipeRead])
def get_all_recipes(db: Session = Depends(get_db)):
    """開発用: 全てのユーザーのレシピを最新順に取得"""
    return db.query(models.Recipe).order_by(models.Recipe.date.desc()).all()

@app.get("/recipes/{recipe_id}", response_model=schemas.RecipeRead)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    """特定のレシピを1件取得"""
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe

@app.get("/my-recipes/", response_model=List[schemas.RecipeRead])
def read_my_recipes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """ログイン中の自分の投稿だけを表示"""
    return db.query(models.Recipe).filter(models.Recipe.author_id == current_user.id).order_by(models.Recipe.date.desc()).all()

@app.get("/recipes/index")
def get_recipe_index(db: Session = Depends(get_db)):
    """カレンダー・アーカイブ表示用に、年月別の投稿数を集計"""
    return db.query(func.strftime('%Y-%m', models.Recipe.date).label('month'), func.count(models.Recipe.id).label('count')).group_by('month').order_by(models.Recipe.date.desc()).all()

# --- 5. アプリケーション起設定 ---
if __name__ == "__main__":
    import uvicorn
    # EB等のクラウド環境では環境変数 PORT を優先し、ローカルでは 8000 を使用する
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)