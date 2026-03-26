import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Edit2, X, MessageCircle, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { MakeupCanvas } from '../components/post/MakeupCanvas';
import type { Recipe, PinItem, PinCosmeticItem } from '../types/recipe';
import DEFAULT_FACE_IMAGE from '../assets/images/noimg_face.png';
import { getDefaultCosmeImage } from '../utils/imageUtils';

export const RecipeDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [recipe, setRecipe] = useState<Recipe | null>(location.state?.recipe || null);
    const [loading, setLoading] = useState(!location.state?.recipe);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [showPins, setShowPins] = useState(true);
    const [selectedPin, setSelectedPin] = useState<PinItem | null>(null);
    const [expandedItemIdx, setExpandedItemIdx] = useState<number | null>(null);

    useEffect(() => {
        if (location.state?.recipe) return;
        const fetchRecipe = async () => {
            try {
                const res = await axios.get(`/recipes/${id}`);
                const r = res.data;
                const formatted: Recipe = {
                    id: String(r.id),
                    overallData: {
                        title: r.title,
                        date: r.date,
                        rating: 3,
                        weather: 'sunny',
                        tags: r.scene_tag ? r.scene_tag.split(',') : [],
                        memo: r.description || '',
                        condition: r.condition || 'normal'
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
                                        brand: it.cosmetic_master.brand,
                                        name: it.cosmetic_master.name,
                                        usageMemo: it.pin_memo,
                                        masterMemo: it.cosmetic_master.memo,
                                        category: it.cosmetic_master.category,
                                        texture: it.cosmetic_master.texture,
                                        colorNumber: it.cosmetic_master.color_number,
                                        imageUrl: it.cosmetic_master.image_url,
                                        hex: it.cosmetic_master.color_hex,
                                        pccsTone: it.cosmetic_master.pccs_tone,
                                        pccsHue: it.cosmetic_master.pccs_hue,
                                    });
                                }
                            });
                            return Array.from(pinMap.values());
                        })()
                    }))
                };
                setRecipe(formatted);
            } catch (e) {
                console.error("Failed to fetch recipe", e);
            } finally {
                setLoading(false);
            }
        };
        fetchRecipe();
    }, [id]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
    );

    if (!recipe) return (
        <div className="p-8 text-center">
            <p className="text-slate-500 mb-4">レシピが見つかりませんでした。</p>
            <button onClick={() => navigate('/')} className="text-pink-500 font-bold">galleryへ戻る</button>
        </div>
    );

    const currentSlide = recipe.slides[activeSlideIndex];
    const filteredPins = currentSlide?.pins.filter(p => {
        if (!p.isDefault) return true;
        return p.items && p.items.length > 0 && p.items.some(i => i.brand || i.name);
    }) || [];

    const handleEdit = () => {
        navigate('/post', { state: { initialData: recipe } });
    };

    // 画像エリアのクリック: ピンのクリックと分離する
    const handleImageAreaClick = () => {
        if (selectedPin) {
            // ピン詳細が開いている場合は閉じる（トグルしない）
            setSelectedPin(null);
            setExpandedItemIdx(null);
        } else {
            // ピン詳細が開いていない場合のみトグル
            setShowPins(!showPins);
        }
    };

    const handlePinSelect = (pinId: string) => {
        const pin = filteredPins.find(p => p.id === pinId);
        if (pin) {
            setSelectedPin(pin);
            setExpandedItemIdx(null);
        }
    };

    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-20 font-sans relative">
            {/* ヘッダー */}
            <div className="bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm flex items-center justify-between sticky top-0 z-30">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-black text-slate-800 tracking-tight">Recipe Detail</h1>
                <button onClick={handleEdit} className="p-2 -mr-2 text-pink-500 hover:bg-pink-50 rounded-full transition-colors">
                    <Edit2 size={20} />
                </button>
            </div>

            <div>
                {/* メインビュー - フル幅・角なし */}
                <div className="relative overflow-hidden bg-white aspect-[3/4] w-full">
                    <div onClick={handleImageAreaClick} className="w-full h-full cursor-pointer">
                        <MakeupCanvas
                            imageUrl={currentSlide?.image || DEFAULT_FACE_IMAGE}
                            pins={showPins ? filteredPins : []}
                            onAddPin={() => { }}
                            onSelectPin={handlePinSelect}
                            onMovePin={() => { }}
                            selectedPinId={selectedPin?.id || null}
                        />
                    </div>

                    {/* ピン表示切替インジケーター */}
                    <div className="absolute top-4 left-4 z-10 pointer-events-none">
                        <div className="bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2 text-white text-[10px] font-bold">
                            {showPins ? <Eye size={12} /> : <EyeOff size={12} />}
                            {showPins ? "Pins ON" : "Pins OFF"}
                        </div>
                    </div>

                    {/* ピンタップ時: 画像の下部にコスメ情報をオーバーレイ（最小限・背景ブラーなし） */}
                    {selectedPin && (
                        <div
                            className="absolute bottom-0 left-0 right-0 z-20 animate-in slide-in-from-bottom-4 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white/95 rounded-t-3xl shadow-2xl px-4 pt-4 pb-3 max-h-[55%] overflow-y-auto">
                                {/* ヘッダー */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-5 bg-pink-500 rounded-full"></div>
                                        <span className="font-black text-slate-700 text-xs tracking-tight uppercase">
                                            {selectedPin.label || "Used Items"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedPin(null); setExpandedItemIdx(null); }}
                                        className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* アイテム一覧 */}
                                <div className="space-y-2">
                                    {selectedPin.items.map((item, idx) => (
                                        <div key={idx} className="rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden transition-all">
                                            {/* アイテムサマリ行 */}
                                            <div
                                                className="flex gap-3 p-3 cursor-pointer active:bg-pink-50/50 transition-colors"
                                                onClick={() => setExpandedItemIdx(expandedItemIdx === idx ? null : idx)}
                                            >
                                                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-white">
                                                    <img src={item.imageUrl || getDefaultCosmeImage(item.category)} alt={item.name} className="w-full h-full object-contain" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[8px] font-black text-pink-400 uppercase tracking-tight truncate">{item.brand}</div>
                                                    <div className="text-[12px] font-bold text-slate-800 leading-snug truncate">{item.name}</div>
                                                    {item.colorNumber && (
                                                        <div className="text-[9px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                                                            {item.hex && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.hex }}></div>}
                                                            {item.colorNumber}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center text-slate-300">
                                                    {expandedItemIdx === idx ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </div>
                                            </div>

                                            {/* 展開された詳細（インライン） */}
                                            {expandedItemIdx === idx && (
                                                <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3 animate-in fade-in duration-200">
                                                    {/* カテゴリー & テクスチャ */}
                                                    <div className="flex gap-2 flex-wrap">
                                                        {item.category && (
                                                            <span className="text-[9px] font-black text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full uppercase">{item.category}</span>
                                                        )}
                                                        {item.texture && (
                                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{item.texture}</span>
                                                        )}
                                                        {item.pccsTone && item.pccsHue && (
                                                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                                                                <div
                                                                    className="w-2 h-2 rounded-full shadow-inner"
                                                                    style={{ backgroundColor: item.hex }}
                                                                ></div>
                                                                <span className="text-[9px] font-bold text-slate-500 uppercase">
                                                                    {item.pccsTone}-{item.pccsHue}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* コスメ自体のメモ */}
                                                    {item.masterMemo && (
                                                        <div>
                                                            <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Product Info</div>
                                                            <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">{item.masterMemo}</p>
                                                        </div>
                                                    )}

                                                    {/* 塗り方メモ */}
                                                    {item.usageMemo && (
                                                        <div className="bg-pink-50/80 border border-pink-100 rounded-xl p-2.5">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <MessageCircle size={10} className="text-pink-400" />
                                                                <span className="text-[8px] font-black text-pink-400 uppercase tracking-widest">Technique</span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-600 italic leading-relaxed">「{item.usageMemo}」</p>
                                                        </div>
                                                    )}

                                                    {/* アイテムを編集するボタン */}
                                                    <button
                                                        onClick={() => navigate('/cosme', {
                                                            state: {
                                                                editData: item,
                                                                returnPath: `/recipe/${recipe.id}`
                                                            }
                                                        })}
                                                        className="w-full py-2 text-[10px] font-black text-pink-500 bg-white border border-pink-200 rounded-xl hover:bg-pink-50 transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <Edit2 size={11} /> このアイテムを編集する
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 space-y-6">
                    {/* スライドインジケーター - 画像の外に出して見やすく */}
                    {recipe.slides.length > 1 && (
                        <div className="flex justify-center gap-2 mb-2">
                            {recipe.slides.map((_, idx) => (
                                <div
                                    key={idx}
                                    onClick={(e) => { e.stopPropagation(); setActiveSlideIndex(idx); }}
                                    className={`h-1.5 rounded-full transition-all cursor-pointer ${activeSlideIndex === idx ? 'w-8 bg-pink-400' : 'w-2 bg-slate-200'}`}
                                />
                            ))}
                        </div>
                    )}

                    {/* 基本情報 */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm space-y-4">
                        <div>
                            <div className="text-[10px] font-black text-pink-500 uppercase tracking-[0.2em] mb-1">Recipe Title</div>
                            <h2 className="text-xl font-black text-slate-800 leading-tight">
                                {recipe.overallData.title || "無題のレシピ"}
                            </h2>
                        </div>

                        <div className="flex items-center justify-between py-2 border-y border-slate-50">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                <span className="font-sans uppercase">{recipe.overallData.date}</span>
                            </div>
                            <div className="flex gap-2">
                                {recipe.overallData.tags.map((tag: string, i: number) => (
                                    <span key={i} className="text-[10px] font-bold text-slate-400 px-2 py-0.5 bg-slate-50 rounded-full">#{tag}</span>
                                ))}
                            </div>
                        </div>

                        {recipe.overallData.memo && (
                            <div>
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Diary / Memo</div>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    {recipe.overallData.memo}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
