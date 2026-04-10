import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type { Recipe } from '../types/recipe';
import DEFAULT_FACE_IMAGE from '../assets/images/noimg_face.png';
import { Copy, Trash2, Edit, Share2, MoreVertical, X, LayoutGrid, List, FileText } from 'lucide-react';
import logoImg from '../assets/images/logo01.webp';

interface Props {
    onNavigateToPost: (recipeToEdit?: Recipe) => void;
}

export const History = ({ onNavigateToPost }: Props) => {
    const navigate = useNavigate();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'card' | 'tile'>(() => {
        return (localStorage.getItem('makelabo_gallery_viewMode') as 'card' | 'tile') || 'card';
    });

    useEffect(() => {
        localStorage.setItem('makelabo_gallery_viewMode', viewMode);
    }, [viewMode]);

    const [longPressedRecipe, setLongPressedRecipe] = useState<Recipe | null>(null);
    const longPressTimer = useRef<any | null>(null);

    const fetchRecipes = async () => {
        try {
            const res = await axios.get('/recipes/all');
            const formatted = res.data.map((r: any) => ({
                id: String(r.id),
                overallData: {
                    title: r.title,
                    date: r.date,
                    rating: 3,
                    weather: 'sunny',
                    tags: r.scene_tag ? r.scene_tag.split(',') : [],
                    memo: r.description || ''
                },
                slides: r.images.map((img: any) => ({
                    id: String(img.id),
                    image: img.image_path,
                    isThumbnail: img.is_thumbnail,
                    isMakeMap: img.is_make_map,
                    pins: (() => {
                        const pinMap = new Map<string, any>();
                        img.items.forEach((it: any) => {
                            const key = `${it.x_position}-${it.y_position}-${it.is_default_pin}-${it.pin_label}`;
                            if (!pinMap.has(key)) {
                                pinMap.set(key, {
                                    id: String(it.id),
                                    x: it.x_position,
                                    y: it.y_position,
                                    label: it.pin_label,
                                    isDefault: it.is_default_pin,
                                    items: []
                                });
                            }
                            if (it.cosmetic_master) {
                                pinMap.get(key).items.push({
                                    id: String(it.cosmetic_master.id),
                                    isFromDictionary: true,
                                    brand: it.cosmetic_master.brand,
                                    name: it.cosmetic_master.name,
                                    usageMemo: it.pin_memo,
                                    masterMemo: it.cosmetic_master.memo,
                                    category: it.cosmetic_master.category,
                                    texture: it.cosmetic_master.texture,
                                    colorNumber: it.cosmetic_master.color_number,
                                    hex: it.cosmetic_master.color_hex,
                                    image_url: it.cosmetic_master.image_url,
                                    imageUrl: it.cosmetic_master.image_url,
                                    pccsTone: it.cosmetic_master.pccs_tone,
                                    pccsHue: it.cosmetic_master.pccs_hue,
                                });
                            }
                        });
                        return Array.from(pinMap.values());
                    })()
                }))
            }));
            setRecipes(formatted);
        } catch (e) {
            console.error("Failed to fetch recipes from backend", e);
            const savedData = localStorage.getItem('mua_recipes');
            if (savedData) setRecipes(JSON.parse(savedData));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecipes();
    }, []);


    const handleTouchStart = (recipe: Recipe) => {
        longPressTimer.current = setTimeout(() => {
            setLongPressedRecipe(recipe);
        }, 600);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleDelete = async (recipeId: string) => {
        if (!window.confirm("このレシピを削除してもよろしいですか？")) return;
        try {
            await axios.delete(`/recipes/${recipeId}`);
            setRecipes(recipes.filter(r => r.id !== recipeId));
            setLongPressedRecipe(null);
        } catch (e) {
            alert("削除に失敗しました。");
        }
    };

    const handleDuplicate = async (recipe: Recipe) => {
        try {
            const payload = {
                title: `${recipe.overallData.title} (コピー)`,
                description: recipe.overallData.memo,
                scene_tag: recipe.overallData.tags.join(','),
                date: new Date().toISOString().split('T')[0],
                images: recipe.slides.map(s => ({
                    image_path: s.image,
                    is_thumbnail: s.isThumbnail,
                    is_make_map: s.isMakeMap,
                    items: s.pins.map(p => ({
                        x_position: p.x,
                        y_position: p.y,
                        pin_memo: p.items?.[0]?.usageMemo || "",
                        is_default_pin: p.isDefault || false,
                        pin_label: p.label || null,
                        name: p.items?.[0]?.name || null,
                        brand: p.items?.[0]?.brand || null,
                        memo: p.items?.[0]?.masterMemo || null
                    }))
                }))
            };
            await axios.post("/recipes/", payload);
            fetchRecipes();
            setLongPressedRecipe(null);
            alert("レシピをコピーしました！");
        } catch (e) {
            alert("コピーに失敗しました。");
        }
    };

    const handleShare = (recipe: Recipe) => {
        if (navigator.share) {
            navigator.share({
                title: recipe.overallData.title,
                text: recipe.overallData.memo,
                url: window.location.href,
            }).catch(console.error);
        } else {
            alert("提供されているブラウザでは共有機能がサポートされていません。");
        }
        setLongPressedRecipe(null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-300">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-4"></div>
                <p className="text-sm font-bold">データを読み込み中...</p>
            </div>
        );
    }

    if (recipes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">
                    💄
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">研究データがまだありません</h2>
                <p className="text-slate-500 mb-8 max-w-xs">
                    最初のメイクアップを記録して、あなただけのレシピ帳を作りましょう！
                </p>
                <button
                    onClick={() => onNavigateToPost()}
                    className="px-10 py-4 bg-pink-500 text-white rounded-full font-bold shadow-lg shadow-pink-100 hover:bg-pink-600 hover:scale-105 active:scale-95 transition-all"
                >
                    メイクを記録する
                </button>
            </div>
        );
    }

    // 共通のカラー抽出ロジック
    const getRecipeColors = (recipe: Recipe) => {
        const colors: { hex: string, cat: string, pccs?: string }[] = [];
        const seenMatches = new Set<string>();

        recipe.slides.forEach(s => {
            s.pins.forEach(p => {
                p.items.forEach(it => {
                    const cleanCat = it.category?.trim() || "未分類";
                    // ベース系・ライン系・コントゥアリングは色合いの参考にならないため除外
                    const excludeCats = ["ベース", "アイライナー", "アイブロウ", "マスカラ", "コントゥアリング"];
                    if (excludeCats.includes(cleanCat) || !it.hex) return;

                    const hexStr = it.hex || "#FFFFFF";
                    const key = `${hexStr}-${cleanCat}`;
                    if (!seenMatches.has(key)) {
                        colors.push({
                            hex: hexStr,
                            cat: cleanCat,
                            pccs: it.pccsTone ? `${it.pccsTone}${it.pccsHue}` : undefined
                        });
                        seenMatches.add(key);
                    }
                });
            });
        });
        return colors;
    };

    return (
        <div className={`mx-auto ${viewMode === 'tile' ? 'w-full max-w-none' : 'p-4'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className={`flex items-center justify-between ${viewMode === 'tile' ? 'p-4 pb-2' : 'mb-8'}`}>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                    <img src={logoImg} alt="logo" className="w-6 object-contain" />
                    MakeLabo Recipes
                </h2>

                <div className="flex bg-slate-100/80 p-0.5 rounded-xl shadow-inner mb-2">
                    <button
                        onClick={() => setViewMode('card')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white text-pink-500 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                        aria-label="カード表示"
                    >
                        <List size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('tile')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'tile' ? 'bg-white text-pink-500 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                        aria-label="タイル表示"
                    >
                        <LayoutGrid size={18} />
                    </button>
                </div>
            </div>

            <div className={`grid ${viewMode === 'tile' ? 'grid-cols-3 gap-0' : 'grid-cols-1 gap-6'}`}>
                {recipes.map((recipe) => {
                    const thumbnailSlide = recipe.slides.find(s => s.isThumbnail) || recipe.slides[0];
                    const displayImage = thumbnailSlide?.image || DEFAULT_FACE_IMAGE;

                    if (viewMode === 'tile') {
                        return (
                            <div
                                key={recipe.id}
                                onClick={() => {
                                    if (!longPressedRecipe) navigate(`/recipe/${recipe.id}`, { state: { recipe } });
                                }}
                                onMouseDown={() => handleTouchStart(recipe)}
                                onMouseUp={handleTouchEnd}
                                onMouseLeave={handleTouchEnd}
                                onTouchStart={() => handleTouchStart(recipe)}
                                onTouchEnd={handleTouchEnd}
                                className={`aspect-square relative cursor-pointer overflow-hidden bg-slate-200 group ${longPressedRecipe?.id === recipe.id ? 'ring-4 ring-pink-500 z-10' : ''}`}
                            >
                                <img
                                    src={displayImage}
                                    alt={recipe.overallData?.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                                {/* カラーチップ (画像の上に配置) */}
                                <div className="absolute bottom-1 right-1 flex flex-wrap justify-end gap-[2px] pointer-events-none p-0.5 z-10">
                                    {getRecipeColors(recipe).slice(0, 5).map((c, i) => (
                                        <div
                                            key={i}
                                            className="w-2.5 h-2.5 rounded-full shadow-sm border border-white/80"
                                            style={{ backgroundColor: c.hex }}
                                            title={`${c.cat}: ${c.pccs || c.hex}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={recipe.id}
                            onClick={() => {
                                if (!longPressedRecipe) navigate(`/recipe/${recipe.id}`, { state: { recipe } });
                            }}
                            onMouseDown={() => handleTouchStart(recipe)}
                            onMouseUp={handleTouchEnd}
                            onMouseLeave={handleTouchEnd}
                            onTouchStart={() => handleTouchStart(recipe)}
                            onTouchEnd={handleTouchEnd}
                            className={`bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border border-slate-100 flex h-40 group relative ${longPressedRecipe?.id === recipe.id ? 'ring-4 ring-pink-500/20' : ''}`}
                        >
                            <div className="w-32 h-full flex-shrink-0 relative overflow-hidden">
                                <img
                                    src={displayImage}
                                    alt={recipe.overallData?.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>

                            <div className="flex-1 p-4 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-pink-600 transition-colors">
                                        {recipe.overallData?.title || "無題のレシピ"}
                                    </h3>

                                    {/* メモの冒頭表示 */}
                                    {recipe.overallData?.memo && (
                                        <p className="text-[11px] font-medium text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                            {recipe.overallData.memo}
                                        </p>
                                    )}

                                    {/* カラーチップの表示 (すべてのコスメ) */}
                                    <div className="flex items-center gap-1.5 mt-3">
                                        {getRecipeColors(recipe).slice(0, 8).map((c, i) => (
                                            <div
                                                key={i}
                                                className="w-3.5 h-3.5 rounded-full border border-white shadow-sm ring-1 ring-black/5"
                                                style={{ backgroundColor: c.hex }}
                                                title={`${c.cat}: ${c.pccs || c.hex}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex flex-wrap gap-1.5">
                                        {(recipe.overallData?.tags || []).slice(0, 2).map((tag, idx) => (
                                            <span key={idx} className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-bold rounded-full uppercase tracking-wider">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-300 font-sans">{recipe.overallData?.date}</span>
                                </div>
                            </div>

                            {/* モバイル用メニューボタン */}
                            <button
                                className="absolute top-2 right-2 p-2 text-slate-300 hover:text-pink-500"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLongPressedRecipe(recipe);
                                }}
                            >
                                <MoreVertical size={18} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* コンテキストメニュー（中央ポップアップ方式） */}
            {longPressedRecipe && (
                <div
                    className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4"
                    onClick={() => { setLongPressedRecipe(null); }}
                >
                    <div
                        className="w-full max-w-xs bg-white rounded-3xl shadow-2xl py-2 animate-in zoom-in-95 duration-200 border border-slate-100 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-4 py-2 border-b border-slate-50 mb-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Recipe Actions</p>
                        </div>

                        <button
                            onClick={() => { onNavigateToPost(longPressedRecipe); setLongPressedRecipe(null); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                        >
                            <Edit size={16} /> 編集
                        </button>

                        <button
                            onClick={() => handleDuplicate(longPressedRecipe)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                        >
                            <Copy size={16} /> 複製 (コピー)
                        </button>

                        <button
                            onClick={() => handleShare(longPressedRecipe)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                        >
                            <Share2 size={16} /> 共有
                        </button>

                        <div className="h-[1px] bg-slate-50 my-1 mx-2"></div>

                        <button
                            onClick={() => handleDelete(longPressedRecipe.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <Trash2 size={16} /> 削除
                        </button>

                        <button
                            onClick={() => setLongPressedRecipe(null)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:bg-slate-50 transition-colors"
                        >
                            <X size={16} /> 閉じる
                        </button>
                    </div>
                </div>
            )}

            {/* Readmeボタン (モバイル環境で常に表示) */}
            <button
                onClick={() => navigate('/readme')}
                className="fixed bottom-[140px] right-6 lg:hidden bg-slate-800 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold z-40 hover:scale-105 active:scale-95 transition-transform"
            >
                <FileText size={18} />
                About App
            </button>

            {/* 新規作成ボタン */}
            <button
                onClick={() => onNavigateToPost()}
                className="fixed bottom-[68px] right-6 w-14 h-auto aspect-square bg-pink-500 text-white rounded-full shadow-[0_8px_30px_rgb(236,72,153,0.4)] flex items-center justify-center text-3xl hover:bg-pink-600 hover:scale-110 active:scale-95 transition-all z-40 group"
            >
                <span className="transition-transform duration-300 group-hover:rotate-90">＋</span>
            </button>
        </div>
    );
};
