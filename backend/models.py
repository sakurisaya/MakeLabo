from sqlalchemy import Column, Integer, String, ForeignKey, Date, Boolean,DateTime, Float
import datetime
from sqlalchemy.orm import relationship
from database import Base


# ユーザー
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String) # パスワードはそのまま保存せずハッシュ化します
    # 管理者フラグを追加
    is_admin = Column(Boolean, default=False) 
    is_active = Column(Boolean, default=True)

# 親クラス：アイテム共通
class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String)
    name = Column(String)
    brand = Column(String)
    item_type = Column(String) # 'cosmetic', 'nail', etc.
    image_url = Column(String, nullable=True) # コスメ自体の写真
    image_id = Column(Integer, ForeignKey("recipe_images.id"))
    image = relationship("RecipeImage", back_populates="items")    
    
    # 画像上の座標（%指定）
    # 画像上に「ピン」として配置可能
    x_position = Column(Float, nullable=True) 
    y_position = Column(Float, nullable=True)
    # その部位への使い方のメモ（例：「目尻に広めに」）
    pin_memo = Column(String, nullable=True)
    
    # ✨ 追加: デフォルトピン（固定部位）かどうかの判定用
    is_default_pin = Column(Boolean, default=False)
    pin_label = Column(String, nullable=True) # "Lip", "Eye", etc.

    
# 子クラス：コスメ（色彩仕様）
class Cosmetic(Item):
    texture = Column(String)      # 質感
    
    # 色彩データ（PCCS）
    pccs_tone = Column(String)    # V, b, s, dp, lt, sf, d, dk, p, ltg, g, dkg
    pccs_hue = Column(Integer)     # 1 ~ 24
    
    # 画面表示・計算用データ
    color_hex = Column(String)     # #FFFFFF
    r = Column(Integer)
    g = Column(Integer)
    b = Column(Integer)
    transparency = Column(Integer) # 透け感 (0-100)


# 日記（レシピ）
class Recipe(Base):
    __tablename__ = "recipes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    scene_tag = Column(String)
    date = Column(Date, default=datetime.date.today)
    image_url = Column(String, nullable=True) # 画像の保存先パス
    # items = relationship("Cosmetic", backref="recipe")
    images = relationship("RecipeImage", backref="recipe", cascade="all, delete-orphan")
    is_public = Column(Boolean, default=False)
    author_id = Column(Integer, ForeignKey("users.id")) #「誰の投稿か」を示す紐付け
    
class RecipeImage(Base):
    __tablename__ = "recipe_images"
    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id")) # どの日記の画像か
    image_path = Column(String) # 画像の保存先パス
    is_thumbnail = Column(Boolean, default=False) # これがTrueならサムネイル
    
    # この画像が「メイクマップ（デフォルトピンあり）」かどうか
    is_make_map = Column(Boolean, default=False)

    # 画像に紐付くアイテム（ピン）のリレーション
    items = relationship("Item", back_populates="image")