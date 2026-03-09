from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import models, schemas, database
import datetime
import uuid
import os
from typing import List, Optional
from PIL import Image
import io
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from jose import JWTError, jwt
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from constants import DEFAULT_PIN_LABELS


database.init_db()


# DBを使えるようにする
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()
        


##マスターアカウント確認
# 1. 起動時に実行する処理を定義
@asynccontextmanager
async def lifespan(app: FastAPI):
    # アプリ起動時の処理
    db = database.SessionLocal()
    try:
        # 管理者がいなければ作成
        create_first_admin(db)
    finally:
        db.close()
    yield
    # アプリ終了時の処理（あれば）

# 2. FastAPIのインスタンス化の際に lifespan を登録
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # テスト用
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. 実際の作成関数（パスワードは自分の好きなものに変えてね）
def create_first_admin(db: Session):
    # ユーザー名 "master" がいるか確認
    admin = db.query(models.User).filter(models.User.username == "master").first()
    if not admin:
        new_admin = models.User(
            username="master",
            hashed_password=get_password_hash("master1234"), # ログインに使うパスワード
            is_admin=True
        )
        db.add(new_admin)
        db.commit()
        print("🚀 Master account created: user=master, pass=master1234")

# パスワードハッシュ化の設定
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- ヘルパー関数 ---
def get_password_hash(password):
    return pwd_context.hash(password)
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# JWTの設定（トークンの秘密鍵と有効期限）
SECRET_KEY = "your-super-secret-key-change-it-for-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# ---トークン作成用の関数 ---
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ---ガードマン関数 (get_current_admin_user) ---
async def get_current_admin_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None or not user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user

# ---ログイン（トークン発行）API ---
# Swaggerの「Authorize」ボタンやフロントエンドから呼ばれます
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(OAuth2PasswordRequestForm), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# ユーザ登録
@app.post("/admin/create-user/", response_model=schemas.UserRead)
def create_new_user(
    user_in: schemas.UserCreate, 
    current_user: models.User = Depends(get_current_admin_user), # 管理者チェック
    db: Session = Depends(get_db)
):
    # ユーザー名の重複チェック
    db_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # パスワードをハッシュ化して保存
    new_user = models.User(
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        is_admin=user_in.is_admin # 管理者が作成するので、管理者権限の付与も可能
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# --- 画像保存の設定 ---
UPLOAD_DIR = "static/images"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# 静的ファイルの提供設定 (http://localhost:8000/static/... でアクセス可能に)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.post("/upload/")
async def upload_image(file: UploadFile = File(...)):
    extension = ".jpg" # 圧縮効率がいいので一律JPGにする
    file_name = f"{uuid.uuid4()}{extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    # 1. 画像をメモリ上に読み込む
    image_content = await file.read()
    img = Image.open(io.BytesIO(image_content))

    # 2. RGB形式に変換（PNGの透過やHEIC対策）
    if img.mode != "RGB":
        img = img.convert("RGB")

    # 3. リサイズ設定（例：長辺を1200pxに制限）
    max_size = 1200
    if max(img.width, img.height) > max_size:
        # アスペクト比を維持して計算
        ratio = max_size / max(img.width, img.height)
        new_size = (int(img.width * ratio), int(img.height * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS) # 高品質なリサイズ

    # 4. 圧縮して保存
    # optimize=True でファイルサイズを削減、quality=85 は見た目と軽さのベストバランス
    img.save(file_path, "JPEG", quality=85, optimize=True)

    return {"image_url": f"/static/images/{file_name}"}



# コスメを登録するAPI（POSTメソッド）
from color_utils import find_closest_pccs, hex_to_rgb # 追加

@app.post("/cosmetics/")
def create_cosmetic(cosmetic: schemas.CosmeticMasterCreate, db: Session = Depends(get_db)):
    # 自動判定ロジックの発動
    pccs = find_closest_pccs(cosmetic.color_hex)
    rgb = hex_to_rgb(cosmetic.color_hex)
    
    new_cosmetic = models.CosmeticMaster(
        category=cosmetic.category,
        name=cosmetic.name,
        brand=cosmetic.brand,
        texture=cosmetic.texture,
        pccs_tone=pccs["tone"],      # 自動計算されたトーン
        pccs_hue=pccs["hue"],        # 自動計算された色相
        color_hex=cosmetic.color_hex,
        r=rgb[0],                    # 自動抽出されたR
        g=rgb[1],                    # 自動抽出されたG
        b=rgb[2],                    # 自動抽出されたB
        transparency=cosmetic.transparency,
        image_url=cosmetic.image_url
    )
    db.add(new_cosmetic)
    db.commit()
    db.refresh(new_cosmetic)
    return new_cosmetic

# ログインさえしていれば通す
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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

@app.post("/recipes/", response_model=schemas.RecipeRead)
def create_recipe(
    recipe: schemas.RecipeCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    recipe_date = recipe.date if recipe.date else datetime.date.today()
    
    # 1. 日記（Recipe）本体を作成
    new_recipe = models.Recipe(
        title=recipe.title,
        description=recipe.description,
        scene_tag=recipe.scene_tag,
        date=recipe_date,
        author_id=current_user.id
    )
    db.add(new_recipe)
    db.flush() # IDを確定させる

    # 2. 画像（RecipeImage）とその中のアイテム（Item）の保存
    if recipe.images:
        for img_data in recipe.images:
            new_image = models.RecipeImage(
                recipe_id=new_recipe.id,
                image_path=img_data.image_path,
                is_thumbnail=img_data.is_thumbnail,
                is_make_map=img_data.is_make_map
            )
            db.add(new_image)
            db.flush()

            # デフォルトピンの生成ロジック
            # 「メイクマップ（is_make_map=True）」なら、初期状態で部位に応じたピンを作る
            if img_data.is_make_map:
                for label in DEFAULT_PIN_LABELS:
                    default_item = models.Item(
                        image_id=new_image.id,
                        pin_label=label,
                        is_default_pin=True,
                        # 初期座標はフロントで調整するが、一旦NULLまたは(0,0)等
                        x_position=0.0,
                        y_position=0.0
                    )
                    db.add(default_item)

            # 送信された既存のアイテム（ピン）を保存
            for item_data in img_data.items:
                master_id = item_data.cosmetic_master_id
                
                # アイテム作成時に一緒にコスメを新規登録する場合
                if not master_id and item_data.color_hex:
                    pccs = find_closest_pccs(item_data.color_hex)
                    rgb = hex_to_rgb(item_data.color_hex)
                    new_master = models.CosmeticMaster(
                        category=item_data.category or "Other",
                        name=item_data.name or "New Cosmetic",
                        brand=item_data.brand or "Unknown",
                        texture=item_data.texture or "None",
                        color_hex=item_data.color_hex,
                        r=rgb[0], g=rgb[1], b=rgb[2],
                        pccs_tone=pccs["tone"],
                        pccs_hue=pccs["hue"],
                        transparency=item_data.transparency or 100,
                        image_url=item_data.image_url
                    )
                    db.add(new_master)
                    db.flush()
                    master_id = new_master.id

                # アイテム（ピン）を作成または更新
                # 注意: is_default_pinで既に作成されている場合は上書きにする等の制御が必要だが、
                # ここでは新規追加として扱う
                new_item = models.Item(
                    cosmetic_master_id=master_id,
                    image_id=new_image.id,
                    x_position=item_data.x_position,
                    y_position=item_data.y_position,
                    pin_memo=item_data.pin_memo,
                    is_default_pin=item_data.is_default_pin,
                    pin_label=item_data.pin_label
                )
                db.add(new_item)
    
    db.commit()
    db.refresh(new_recipe)
    return new_recipe

@app.get("/recipes/", response_model=list[schemas.RecipeRead]) # response_modelを指定
def get_recipes(
    skip: int = 0,      # 何件飛ばすか
    limit: int = 20,    # 一度に何件取るか
    db: Session = Depends(get_db)
):
    return db.query(models.Recipe).order_by(models.Recipe.date.desc()).offset(skip).limit(limit).all()

@app.get("/recipes/index")
def get_recipe_index(db: Session = Depends(get_db)):
    # 存在する「年-月」の一覧と、その月の件数を取得する
    # 例: [{"month": "2026-02", "count": 10}, {"month": "2026-01", "count": 15}]
    index_data = db.query(
        func.strftime('%Y-%m', models.Recipe.date).label('month'),
        func.count(models.Recipe.id).label('count')
    ).group_by('month').order_by(models.Recipe.date.desc()).all()
    
    return index_data

# 1. main.pyがある場所（backendフォルダ）を基準にする
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 2. 保存先フォルダを絶対パスで指定
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "images")

# 保存先フォルダがなければ作成する（エラー防止）
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 3. 静的ファイルの設定
# directory部分を絶対パスにすることで、どこから起動しても安定します
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")


# 自分の投稿のみを閲覧する
@app.get("/my-recipes/", response_model=List[schemas.RecipeRead])
def read_my_recipes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # ログイン中の「私」を特定
):
    # 自分のIDに一致するレシピだけを、日付が新しい順に取得
    return db.query(models.Recipe)\
        .filter(models.Recipe.author_id == current_user.id)\
        .order_by(models.Recipe.date.desc())\
        .all()