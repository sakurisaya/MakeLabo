from pydantic import BaseModel, ConfigDict
from typing import List, Optional
import datetime

# --- ユーザー用スキーマ ---

# 共通項目
class UserBase(BaseModel):
    username: str
    is_admin: bool = False

# 作成時（パスワードが必要）
class UserCreate(UserBase):
    password: str

# 読み取り時（IDを返し、パスワードは隠す）
class UserRead(UserBase):
    id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True) # SQLAlchemyと連携


# --- コスメマスタ用 ---
class CosmeticMasterBase(BaseModel):
    category: str
    name: str
    brand: str
    texture: str
    color_hex: str
    transparency: int
    image_url: Optional[str] = None

class CosmeticMasterCreate(CosmeticMasterBase):
    pass

class CosmeticMasterRead(CosmeticMasterBase):
    id: int
    pccs_tone: str
    pccs_hue: int
    r: int
    g: int
    b: int
    model_config = ConfigDict(from_attributes=True)

# --- アイテム（ピン）用 ---
class ItemBase(BaseModel):
    x_position: Optional[float] = None
    y_position: Optional[float] = None
    pin_memo: Optional[str] = None
    is_default_pin: bool = False 
    pin_label: Optional[str] = None 

class ItemCreate(ItemBase):
    # 既存のCosmeticMasterを選択する場合はIDを、新規登録する場合はマスタ情報を送る
    cosmetic_master_id: Optional[int] = None
    # 新規登録用（オプション）
    category: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None
    texture: Optional[str] = None
    color_hex: Optional[str] = None
    transparency: Optional[int] = 100
    image_url: Optional[str] = None

class ItemRead(ItemBase):
    id: int
    cosmetic_master: Optional[CosmeticMasterRead] = None
    model_config = ConfigDict(from_attributes=True)

# --- 画像関係 ---
class RecipeImageCreate(BaseModel):
    image_path: str
    is_thumbnail: bool = False
    is_make_map: bool = False
    items: List[ItemCreate] = [] # 画像ごとにアイテムを持つ

class RecipeImageRead(BaseModel):
    id: int
    image_path: str
    is_thumbnail: bool
    is_make_map: bool
    items: List[ItemRead] = []
    model_config = ConfigDict(from_attributes=True)

# --- 日記（レシピ）用 ---
class RecipeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    scene_tag: Optional[str] = None
    date: Optional[datetime.date] = None
    # is_public を削除
    images: List[RecipeImageCreate] = []

class RecipeRead(BaseModel):
    id: int
    author_id: int
    title: str
    description: Optional[str] = None
    scene_tag: Optional[str] = None
    date: datetime.date
    images: List[RecipeImageRead] = []

    model_config = ConfigDict(from_attributes=True)

# 循環参照などの解決
RecipeRead.model_rebuild()
RecipeCreate.model_rebuild()
