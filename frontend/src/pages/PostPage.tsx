import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { MakeupCanvas } from '../components/post/MakeupCanvas';
import { PinDetailForm } from '../components/post/PinDetailForm';
import { DEFAULT_MAKEUP_PINS } from '../constants/defaultPins';
import DEFAULT_FACE_IMAGE from '../assets/images/noimg_face.png';
import { CropModal } from '../components/post/CropModal';
import { Save, ChevronLeft, Plus, Image as ImageIcon, Sparkles, MessageCircle, Tag, Trash2 } from 'lucide-react';
import type { PinItem, RecipeSlide } from '../types/recipe';

// --- 2. メインコンポーネント ---
export const PostPage = ({ onBack }: { onBack: () => void }) => {
    const location = useLocation();
    const initialData = location.state?.initialData;

    // --- 3. 状態管理 (State) ---
    const [overallData, setOverallData] = useState({
        date: initialData?.overallData?.date || new Date().toISOString().split('T')[0],
        title: initialData?.overallData?.title || '',
        rating: initialData?.overallData?.rating || 3,
        condition: initialData?.overallData?.condition || 'normal',
        weather: initialData?.overallData?.weather || 'sunny',
        memo: initialData?.overallData?.memo || '',
        tags: initialData?.overallData?.tags || [] as string[]
    });

    const [slides, setSlides] = useState<RecipeSlide[]>(() => {
        if (initialData?.slides && Array.isArray(initialData.slides)) {
            // 他の画面からのデータ（不足フィールドがある可能性）を正規化
            return initialData.slides.map((s: any, idx: number) => {
                let currentPins = Array.isArray(s.pins) ? s.pins : [];
                if (s.isMakeMap) {
                    const existingLabels = currentPins.map((p: any) => p.label).filter(Boolean);
                    const missingDefaults = DEFAULT_MAKEUP_PINS.filter(dp => !existingLabels.includes(dp.label)).map((p, index) => ({
                        id: `default-${p.part}-${idx}-${index}`,
                        x: p.x, y: p.y, items: [], isSaved: false, label: p.label, isDefault: true
                    }));
                    currentPins = [...currentPins, ...missingDefaults];
                }
                return {
                    id: s.id || `slide-${idx}-${Date.now()}`,
                    image: s.image,
                    pins: currentPins,
                    isThumbnail: !!s.isThumbnail,
                    isMakeMap: !!s.isMakeMap
                };
            });
        }
        // 初期状態では「ノーメイク顔のイラスト」と基本のピンを配置
        return [{
            id: 'slide-0',
            image: DEFAULT_FACE_IMAGE,
            pins: DEFAULT_MAKEUP_PINS.map((p, index) => ({
                id: `default-${p.part}-${index}`,
                x: p.x, y: p.y, items: [], isSaved: false, label: p.label, isDefault: true
            })),
            isThumbnail: true,
            isMakeMap: true
        }];
    });

    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [pendingImage, setPendingImage] = useState<{ url: string, action: 'REPLACE' | 'ADD', targetId?: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // インデックスやIDの整合性チェック
    useEffect(() => {
        if (selectedPinId) {
            const currentPins = slides[activeSlideIndex]?.pins || [];
            const exists = currentPins.some(p => p.id === selectedPinId);
            if (!exists) setSelectedPinId(null);
        }
    }, [activeSlideIndex, slides, selectedPinId]);

    // --- 4. ロジック関数 ---

    // スワイプ操作用ステート
    const [touchStartPos, setTouchStartPos] = useState<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartPos(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartPos) return;
        const touchEndPos = e.changedTouches[0].clientX;
        const distance = touchStartPos - touchEndPos;

        if (distance > 50 && activeSlideIndex < slides.length - 1) {
            setActiveSlideIndex(activeSlideIndex + 1);
            setSelectedPinId(null);
        } else if (distance < -50 && activeSlideIndex > 0) {
            setActiveSlideIndex(activeSlideIndex - 1);
            setSelectedPinId(null);
        }
        setTouchStartPos(null);
    };

    const handleAddPin = (slideId: string, x: number, y: number) => {
        const newId = `pin-${Date.now()}`;
        const newPin: PinItem = {
            id: newId, x, y,
            items: [{
                id: `item-${Date.now()}`,
                brand: '',
                name: '',
                usageMemo: '',
                masterMemo: '',
                saveToMyCosme: false
            }],
            isSaved: false
        };
        setSlides(prev => prev.map(s => s.id === slideId ? { ...s, pins: [...s.pins, newPin] } : s));
        setSelectedPinId(newId);
    };

    const handleUpdatePin = (slideId: string, pinId: string, data: Partial<PinItem>) => {
        if (!pinId) return;
        setSlides(prev => prev.map(slide =>
            slide.id === slideId
                ? { ...slide, pins: slide.pins.map(p => p.id === pinId ? { ...p, ...data, isSaved: true } : p) }
                : slide
        ));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, action: 'REPLACE' | 'ADD', targetId?: string) => {
        if (e.target.files && e.target.files[0]) {
            const url = URL.createObjectURL(e.target.files[0]);
            setPendingImage({ url, action, targetId });
            e.target.value = '';
        }
    };

    const handleUpdateThumbnail = (index: number) => {
        setSlides(prev => prev.map((s, idx) => ({ ...s, isThumbnail: idx === index })));
    };

    const handleDeleteSlide = (slideId: string) => {
        if (!window.confirm("この画像を削除しますか？")) return;
        
        if (slides.length === 1) {
            // 1枚のみの場合はデフォルト画像に戻す
            setSlides(prev => prev.map(s => s.id === slideId ? { ...s, image: DEFAULT_FACE_IMAGE } : s));
            return;
        }
        
        // 2枚以上の場合はスライドごと削除
        setSlides(prev => {
            const targetIndex = prev.findIndex(s => s.id === slideId);
            const newSlides = prev.filter(s => s.id !== slideId);
            if (!newSlides.some(s => s.isThumbnail) && newSlides.length > 0) {
                newSlides[0].isThumbnail = true;
            }
            setActiveSlideIndex(Math.min(targetIndex, newSlides.length - 1));
            setSelectedPinId(null);
            return newSlides;
        });
    };

    const handleCropComplete = (croppedUrl: string) => {
        if (!pendingImage) return;
        if (pendingImage.action === 'REPLACE' && pendingImage.targetId) {
            setSlides(prev => prev.map(s => s.id === pendingImage.targetId ? { ...s, image: croppedUrl } : s));
        } else if (pendingImage.action === 'ADD') {
            const newSlide: RecipeSlide = {
                id: `slide-${Date.now()}`,
                image: croppedUrl,
                pins: [],
                isThumbnail: slides.length === 0,
                isMakeMap: false
            };
            setSlides(prev => [...prev, newSlide]);
            setActiveSlideIndex(slides.length);
        }
        setPendingImage(null);
    };

    const handleSavePost = async () => {
        setIsSaving(true);
        try {
            const payload = {
                title: overallData.title,
                description: overallData.memo,
                scene_tag: overallData.tags.join(','),
                date: overallData.date,
                images: slides.map(s => ({
                    image_path: s.image,
                    is_thumbnail: s.isThumbnail,
                    is_make_map: s.isMakeMap,
                    items: s.pins.flatMap(p => (p.items || []).map(item => ({
                        cosmetic_master_id: item.isFromDictionary ? (item.cosmetic_master_id || null) : null,
                        x_position: p.x,
                        y_position: p.y,
                        pin_memo: item.usageMemo || "", // レシピ固有
                        is_default_pin: p.isDefault || false,
                        pin_label: p.label || null,
                        name: item.name || null,
                        brand: item.brand || null,
                        memo: item.masterMemo || null, // コスメ自体の特徴
                        color_number: item.colorNumber || null,
                        color_hex: item.hex || null,
                        category: item.category || null,
                        texture: item.texture || null
                    })))
                }))
            };

            const isEditing = initialData?.id;
            if (isEditing) {
                // 上書き保存
                await axios.put(`/recipes/${initialData.id}`, payload);
                alert("レシピを上書き保存しました！");
            } else {
                // 新規登録
                await axios.post("/recipes/", payload);
                alert("新しいレシピを保存しました！");
            }
            onBack();
        } catch (error) {
            console.error("Save failed:", error);
            alert("保存に失敗しました。");
        } finally {
            setIsSaving(false);
        }
    };

    const currentSlide = slides[activeSlideIndex];

    return (
        <div className="mx-auto min-h-screen bg-slate-50 pb-20 font-sans shadow-xl relative overflow-x-hidden">
            {/* ヘッダー */}
            <div className="bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm flex items-center justify-between sticky top-0 z-30">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-pink-500 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-black text-slate-800 tracking-tight">{initialData?.id ? "レシピを編集" : "レシピを作成"}</h1>
                <div className="w-10"></div>
            </div>

            {currentSlide ? (
                <div className="p-4 space-y-6">
                    {/* スライド管理 & 編集エリア */}
                    <div className="space-y-4">
                        <div className="relative group" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                            <MakeupCanvas
                                imageUrl={currentSlide.image}
                                pins={currentSlide.pins}
                                onAddPin={(x, y) => handleAddPin(currentSlide.id, x, y)}
                                onSelectPin={setSelectedPinId}
                                onMovePin={(id, x, y) => handleUpdatePin(currentSlide.id, id, { x, y })}
                                selectedPinId={selectedPinId}
                            />

                            <div className="absolute top-4 right-4 flex flex-col gap-2">
                                <button
                                    onClick={() => handleUpdateThumbnail(activeSlideIndex)}
                                    className={`w-10 h-10 backdrop-blur shadow-md rounded-full flex items-center justify-center cursor-pointer transition-all ${currentSlide.isThumbnail ? 'bg-yellow-400 text-white shadow-yellow-200' : 'bg-white/90 text-slate-400 hover:text-yellow-500'}`}
                                    title="サムネイルに設定"
                                >
                                    <Sparkles size={20} fill={currentSlide.isThumbnail ? "white" : "none"} />
                                </button>
                                <label className="w-10 h-10 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center cursor-pointer text-slate-600 hover:text-pink-500 transition-all">
                                    <ImageIcon size={20} />
                                    <input type="file" className="hidden" onChange={(e) => handleImageChange(e, 'REPLACE', currentSlide.id)} accept="image/*" />
                                </label>
                                <label className="w-10 h-10 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center cursor-pointer text-slate-600 hover:text-pink-500 transition-all">
                                    <Plus size={20} />
                                    <input type="file" className="hidden" onChange={(e) => handleImageChange(e, 'ADD')} accept="image/*" />
                                </label>
                                <button
                                    onClick={() => handleDeleteSlide(currentSlide.id)}
                                    className="w-10 h-10 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center cursor-pointer text-slate-600 hover:text-red-500 transition-all"
                                    title="画像を削除"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>

                        {/* 詳細入力（ピンが選択されている時のみ表示） */}
                        {(() => {
                            const targetPin = currentSlide.pins.find(p => p.id === selectedPinId);
                            if (selectedPinId && targetPin) {
                                return (
                                    <div className="relative z-40 px-2 pb-6 -mt-40">
                                        <div className="w-full max-w-sm mx-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-500/10 animate-in slide-in-from-bottom-5 duration-300 border border-pink-100 overflow-hidden">
                                            <PinDetailForm
                                                pin={targetPin}
                                                onChange={(data) => handleUpdatePin(currentSlide.id, targetPin.id, data)}
                                                onDelete={() => {
                                                    setSlides(prev => prev.map(s => s.id === currentSlide.id ? { ...s, pins: s.pins.filter(p => p.id !== targetPin.id) } : s));
                                                    setSelectedPinId(null);
                                                }}
                                                onClose={async () => {
                                                    // ピン入力完了時に、図鑑登録にチェックがあるアイテムを即座に保存
                                                    if (targetPin.items && targetPin.items.length > 0) {
                                                        for (const item of targetPin.items) {
                                                            if (item.saveToMyCosme && item.brand && item.name && item.category) {
                                                                try {
                                                                    await axios.post('/cosmetics/', {
                                                                        category: item.category,
                                                                        brand: item.brand,
                                                                        name: item.name,
                                                                        texture: item.texture || "未設定", // 必須項目のためデフォルト値を指定
                                                                        memo: item.masterMemo || "",
                                                                        color_number: item.colorNumber || "",
                                                                        color_hex: item.hex || "#FFFFFF",
                                                                        transparency: 100
                                                                    });
                                                                    console.log("ピン入力からマイコスメへの登録成功");
                                                                    // 保存に成功したらチェックを外し、図鑑由来として扱うよう更新（重複保存防止）
                                                                    handleUpdatePin(currentSlide.id, targetPin.id, {
                                                                        items: targetPin.items.map(i => i.id === item.id ? { ...i, saveToMyCosme: false, isFromDictionary: true } : i)
                                                                    });
                                                                } catch (e) {
                                                                    console.error("コスメの即時保存に失敗", e);
                                                                }
                                                            }
                                                        }
                                                    }

                                                    // 何も入力されていないフリーピンなら削除する
                                                    const isEmpty = targetPin.items.every(i => !i.brand && !i.name && !i.usageMemo && !i.masterMemo);
                                                    if (!targetPin.isDefault && isEmpty) {
                                                        setSlides(prev => prev.map(s => s.id === currentSlide.id ? { ...s, pins: s.pins.filter(p => p.id !== targetPin.id) } : s));
                                                    }
                                                    setSelectedPinId(null);
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* 画像一覧ドット */}
                        {slides.length > 1 && (
                            <div className="flex justify-center gap-2">
                                {slides.map((s, idx) => (
                                    <div key={idx} onClick={() => { setActiveSlideIndex(idx); setSelectedPinId(null); }}
                                        className={`h-1.5 rounded-full transition-all cursor-pointer relative ${activeSlideIndex === idx ? 'w-8 bg-pink-400' : 'w-2 bg-slate-200'}`}>
                                        {s.isThumbnail && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px]">👑</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 全体の詳細情報フォーム */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm space-y-8 animate-in fade-in duration-500">
                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Recipe Title</span>
                                <div className="relative">
                                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300" size={18} />
                                    <input type="text" value={overallData.title} onChange={e => setOverallData({ ...overallData, title: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-pink-200" placeholder="今日のメイクの主役は？" />
                                </div>
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Date</span>
                                    <input type="date" value={overallData.date} onChange={e => setOverallData({ ...overallData, date: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-pink-200 text-sm" />
                                </label>
                                <label className="block">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Condition</span>
                                    <select value={overallData.condition} onChange={e => setOverallData({ ...overallData, condition: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-pink-200 text-sm appearance-none">
                                        <option value="good">Good</option>
                                        <option value="normal">Normal</option>
                                        <option value="bad">Bad</option>
                                    </select>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Makeup Memo</span>
                                <div className="relative">
                                    <MessageCircle className="absolute left-4 top-4 text-slate-300" size={18} />
                                    <textarea value={overallData.memo} onChange={e => setOverallData({ ...overallData, memo: e.target.value })}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-[2rem] border-none outline-none focus:ring-2 focus:ring-pink-200 text-sm h-32 resize-none" placeholder="意識したポイントや、崩れにくさなど..." />
                                </div>
                            </label>

                            <div className="flex flex-wrap gap-2">
                                {overallData.tags.map((tag: string) => (
                                    <span key={tag} className="px-3 py-1 bg-pink-50 text-pink-500 rounded-full text-[10px] font-black border border-pink-100 flex items-center gap-1">
                                        #{tag}
                                        <button onClick={() => setOverallData({ ...overallData, tags: overallData.tags.filter((t: string) => t !== tag) })} className="hover:text-pink-700">×</button>
                                    </span>
                                ))}
                                <button onClick={() => {
                                    const tag = prompt("タグを入力してください");
                                    if (tag) setOverallData({ ...overallData, tags: [...overallData.tags, tag] });
                                }} className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black border border-slate-100 flex items-center gap-1 hover:bg-slate-100">
                                    <Tag size={12} /> Add Tag
                                </button>
                            </div>
                        </div>

                        <button onClick={handleSavePost} disabled={isSaving}
                            className="w-full py-5 bg-slate-900 text-white rounded-[2.5rem] font-black text-lg shadow-2xl shadow-slate-200 hover:bg-pink-500 active:scale-95 transition-all flex items-center justify-center gap-3">
                            <Save size={24} />
                            {isSaving ? "Saving..." : initialData?.id ? "上書き保存する" : "新しいレシピを保存する"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="animate-pulse text-slate-300">Loading slide...</div>
                </div>
            )}

            {/* クロップ用モーダル */}
            {pendingImage && (
                <CropModal
                    imageUrl={pendingImage.url}
                    onClose={() => setPendingImage(null)}
                    onComplete={handleCropComplete}
                />
            )}
        </div>
    );
};
