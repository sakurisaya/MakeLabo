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
# OAuth2のトークン受け渡しルールを定義
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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
    db = database.SessionLocal()
    try:
        create_initial_users(db)
    finally:
        db.close()
    yield

# FastAPIアプリのインスタンス生成
app = FastAPI(lifespan=lifespan)

# CORS制限の解除（フロントエンドとバックエンドが通信できるように許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # どのドメインからも許可（開発用）
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 保存された画像（static/images内）をURLで公開（http://localhost:8000/static/...）
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")


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

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    リクエストヘッダーのトークンを検証し、現在ログイン中のユーザー情報を取得する。
    トークンが無効なら 401エラー を返す「ガード」として機能する。
    """
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
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

    # 3. 圧縮（quality=85）して保存
    img.save(file_path, "JPEG", quality=85, optimize=True)
    return {"image_url": f"/static/images/{file_name}"}


# --- 5. エンドポイント: コスメ図鑑 & メイク日記 ---

@app.post("/cosmetics/", response_model=schemas.CosmeticMasterRead)
def create_cosmetic(cosmetic: schemas.CosmeticMasterCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    自分の持っているコスメを図鑑に登録する。
    入力された色(HEX)から PCCS(トーン・色相) や RGB値 を自動計算して保存。
    """
    pccs = find_closest_pccs(cosmetic.color_hex)
    rgb = hex_to_rgb(cosmetic.color_hex)
    new_cosmetic = models.CosmeticMaster(**cosmetic.model_dump(), 
                                        pccs_tone=pccs["tone"], pccs_hue=pccs["hue"],
                                        r=rgb[0], g=rgb[1], b=rgb[2])
    db.add(new_cosmetic)
    db.commit(); db.refresh(new_cosmetic)
    return new_cosmetic

@app.get("/gallery/", response_model=List[schemas.RecipeRead])
def get_sample_gallery(db: Session = Depends(get_db)):
    """誰でも閲覧可: 見本用として master アカウントの投稿のみを抽出して返す"""
    master = db.query(models.User).filter(models.User.username == "master").first()
    if not master: return []
    return db.query(models.Recipe).filter(models.Recipe.author_id == master.id).order_by(models.Recipe.date.desc()).all()

@app.post("/recipes/", response_model=schemas.RecipeRead)
def create_recipe(recipe: schemas.RecipeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    メイク日記（Recipe）を作成する。
    画像が「メイクマップ」の場合は、ベース・アイ・リップ等のデフォルトピンを自動生成。
    ピンに紐付くコスメを、その場で新規登録することも可能。
    """
    # 1. 日記の基本情報を保存
    new_recipe = models.Recipe(
        title=recipe.title, description=recipe.description, scene_tag=recipe.scene_tag,
        date=recipe.date if recipe.date else datetime.date.today(), author_id=current_user.id
    )
    db.add(new_recipe); db.flush() # IDを確定させる

    # 2. 画像とそこに打たれたピン情報を保存
    if recipe.images:
        for img_data in recipe.images:
            new_image = models.RecipeImage(recipe_id=new_recipe.id, image_path=img_data.image_path,
                                           is_thumbnail=img_data.is_thumbnail, is_make_map=img_data.is_make_map)
            db.add(new_image); db.flush()

            # 自動初期ピン（デフォルトピン）の生成
            if img_data.is_make_map:
                for label in DEFAULT_PIN_LABELS:
                    db.add(models.Item(image_id=new_image.id, pin_label=label, is_default_pin=True, x_position=0.0, y_position=0.0))

            # ユーザーが配置した各アイテム（ピン）の保存
            for item_data in img_data.items:
                master_id = item_data.cosmetic_master_id
                
                # 図鑑にないコスメを直接入力した場合、このタイミングで図鑑(CosmeticMaster)にも登録
                if not master_id and item_data.color_hex:
                    pccs = find_closest_pccs(item_data.color_hex); rgb = hex_to_rgb(item_data.color_hex)
                    new_m = models.CosmeticMaster(
                        category=item_data.category or "Other", name=item_data.name or "New", brand=item_data.brand or "-",
                        texture=item_data.texture or "-", color_number=item_data.color_number, memo=item_data.memo,
                        color_hex=item_data.color_hex, 
                        r=rgb[0], g=rgb[1], b=rgb[2],
                        pccs_tone=pccs["tone"], pccs_hue=pccs["hue"], transparency=item_data.transparency or 100, image_url=item_data.image_url
                    )
                    db.add(new_m); db.flush(); master_id = new_m.id
                
                # アイテム（ピン）本体の保存
                db.add(models.Item(cosmetic_master_id=master_id, image_id=new_image.id, **item_data.model_dump(exclude={"cosmetic_master_id", "category", "name", "brand", "texture", "color_number", "memo", "color_hex", "transparency", "image_url"})))
    
    db.commit(); db.refresh(new_recipe)
    return new_recipe

@app.get("/my-recipes/", response_model=List[schemas.RecipeRead])
def read_my_recipes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """ログイン中の自分の投稿だけを表示"""
    return db.query(models.Recipe).filter(models.Recipe.author_id == current_user.id).order_by(models.Recipe.date.desc()).all()

@app.get("/recipes/index")
def get_recipe_index(db: Session = Depends(get_db)):
    """カレンダー・アーカイブ表示用に、年月別の投稿数を集計"""
    return db.query(func.strftime('%Y-%m', models.Recipe.date).label('month'), func.count(models.Recipe.id).label('count')).group_by('month').order_by(models.Recipe.date.desc()).all()