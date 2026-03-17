import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type { Recipe } from '../types/recipe';
import DEFAULT_FACE_IMAGE from '../assets/images/noimg_face.png';
import { Copy, Trash2, Edit, Share2, MoreVertical, X } from 'lucide-react';

interface Props {
    onNavigateToPost: (recipeToEdit?: Recipe) => void;
}

export const History = ({ onNavigateToPost }: Props) => {
    const navigate = useNavigate();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [longPressedRecipe, setLongPressedRecipe] = useState<Recipe | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
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
                    pins: img.items.map((it: any) => ({
                        id: String(it.id),
                        x: it.x_position,
                        y: it.y_position,
                        label: it.pin_label,
                        isDefault: it.is_default_pin,
                        items: it.cosmetic_master ? [{
                            brand: it.cosmetic_master.brand,
                            name: it.cosmetic_master.name,
                            usageMemo: it.pin_memo,
                            masterMemo: it.cosmetic_master.memo,
                            category: it.cosmetic_master.category,
                            texture: it.cosmetic_master.texture,
                            colorNumber: it.cosmetic_master.color_number,
                            hex: it.cosmetic_master.color_hex,
                        }] : []
                    }))
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

    const getWeatherIcon = (weather: string) => {
        switch (weather) {
            case 'hot': return '🌡️';
            case 'sunny': return '☀️';
            case 'cloudy': return '☁️';
            case 'rainy': return '☔';
            case 'snowy': return '⛄';
            default: return '☀️';
        }
    };

    const handleTouchStart = (recipe: Recipe, e: React.TouchEvent | React.MouseEvent) => {
        const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const y = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        longPressTimer.current = setTimeout(() => {
            setLongPressedRecipe(recipe);
            setMenuPosition({ x, y });
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

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-pink-500 rounded-full"></span>
                Makeup Recipes
            </h2>

            <div className="grid grid-cols-1 gap-6">
                {recipes.map((recipe) => {
                    const thumbnailSlide = recipe.slides.find(s => s.isThumbnail) || recipe.slides[0];
                    const displayImage = thumbnailSlide?.image || DEFAULT_FACE_IMAGE;

                    return (
                        <div
                            key={recipe.id}
                            onClick={() => {
                                if (!longPressedRecipe) navigate(`/recipe/${recipe.id}`, { state: { recipe } });
                            }}
                            onMouseDown={(e) => handleTouchStart(recipe, e)}
                            onMouseUp={handleTouchEnd}
                            onMouseLeave={handleTouchEnd}
                            onTouchStart={(e) => handleTouchStart(recipe, e)}
                            onTouchEnd={handleTouchEnd}
                            className={`bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border border-slate-100 flex h-40 md:h-48 group relative ${longPressedRecipe?.id === recipe.id ? 'ring-4 ring-pink-500/20' : ''}`}
                        >
                            <div className="w-32 md:w-40 h-full flex-shrink-0 relative overflow-hidden">
                                <img
                                    src={displayImage}
                                    alt={recipe.overallData?.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>

                            <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-pink-600 transition-colors">
                                        {recipe.overallData?.title || "無題のレシピ"}
                                    </h3>

                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center text-yellow-400">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={`text-sm ${i < (recipe.overallData?.rating || 0) ? 'opacity-100' : 'opacity-20'}`}>★</span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                            <span>{getWeatherIcon(recipe.overallData?.weather)}</span>
                                            <span className="font-sans">{recipe.overallData?.date}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-auto">
                                    {(recipe.overallData?.tags || []).slice(0, 3).map((tag, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* モバイル用メニューボタン */}
                            <button
                                className="absolute top-2 right-2 p-2 text-slate-300 hover:text-pink-500"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLongPressedRecipe(recipe);
                                    setMenuPosition({ x: e.clientX, y: e.clientY });
                                }}
                            >
                                <MoreVertical size={18} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* コンテキストメニュー (長押しまたは点々ボタン) */}
            {longPressedRecipe && menuPosition && (
                <div
                    className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[2px]"
                    onClick={() => { setLongPressedRecipe(null); setMenuPosition(null); }}
                >
                    <div
                        className="absolute bg-white rounded-2xl shadow-2xl py-2 min-w-[160px] animate-in zoom-in-95 duration-100 border border-slate-100 overflow-hidden"
                        style={{
                            left: Math.min(window.innerWidth - 180, menuPosition.x),
                            top: Math.min(window.innerHeight - 250, menuPosition.y)
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-4 py-2 border-b border-slate-50 mb-1">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Recipe Actions</p>
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

            <button
                onClick={() => onNavigateToPost()}
                className="fixed bottom-8 right-8 w-16 h-16 bg-pink-500 text-white rounded-full shadow-2xl shadow-pink-200 flex items-center justify-center text-3xl hover:bg-pink-600 hover:scale-110 active:scale-95 transition-all z-40 group"
            >
                <span className="transition-transform duration-300 group-hover:rotate-90">＋</span>
            </button>
        </div>
    );
};
