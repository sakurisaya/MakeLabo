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


# --- 画像関係 ---
class RecipeImageCreate(BaseModel):
    image_path: str
    is_thumbnail: bool = False
    is_make_map: bool = False # 追加
    items: List[CosmeticCreate] = [] # 画像ごとにアイテムを持つ

class RecipeImageRead(BaseModel):
    id: int
    image_path: str
    is_thumbnail: bool
    class Config:
        from_attributes = True

# コスメ入力用
class CosmeticCreate(BaseModel):
    category: str
    name: str
    brand: str
    texture: str
    color_hex: str
    transparency: int
    image_url: Optional[str] = None
    x_position: Optional[float] = None
    y_position: Optional[float] = None
    pin_memo: Optional[str] = None
    is_default_pin: bool = False 
    pin_label: Optional[str] = None 
    

# アイテム表示用
class CosmeticRead(BaseModel):
    id: int
    category: str
    name: str
    brand: str
    pccs_tone: str
    pccs_hue: int
    color_hex: str
    texture: str
    x_position: Optional[float] = None
    y_position: Optional[float] = None
    pin_memo: Optional[str] = None
    
    class Config:
        from_attributes = True # これを入れるとDBモデルをそのまま変換できます
        

        
# 日記（レシピ）入力用
class RecipeCreate(BaseModel):
    title: str
    description: str
    scene_tag: str
    date: Optional[datetime.date] = None
    images: List[RecipeImageCreate] = []
    is_public: bool = False
    images: List[RecipeImageCreate] # 画像（とその中のアイテム）のリスト
    # コスメのリストを一緒に受け取る
    items: List[CosmeticCreate]
    
    

# 日記（レシピ）表示用
class RecipeRead(BaseModel):
    id: int
    author_id: int
    is_public: bool
    title: str
    description: str
    scene_tag: str
    date: datetime.date
    images: List[RecipeImageRead] = []
    items: List[CosmeticRead] # ここに紐付いたアイテムが入る

    class Config:
        from_attributes = True
        
# schemas.py の一番最後に追加
RecipeRead.model_rebuild()
RecipeCreate.model_rebuild()
CosmeticRead.model_rebuild()
