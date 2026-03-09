import { useState, useEffect } from 'react';
import { MakeupCanvas } from '../components/post/MakeupCanvas';
import { PinDetailForm } from '../components/post/PinDetailForm';
import { DEFAULT_MAKEUP_PINS } from '../constants/defaultPins';
import DEFAULT_FACE_IMAGE from '../assets/images/noimg_face.png';
import { CropModal } from '../components/post/CropModal';

export interface PinCosmeticItem {
    id: string;
    brand: string;
    name: string;
    memo: string;
    saveToMyCosme?: boolean;
}

export interface PinItem {
    id: string;
    x: number;
    y: number;
    items: PinCosmeticItem[];
    isSaved: boolean;
    label?: string;      // "lip", "eye" などの表示用
    isDefault?: boolean; // システムが自動配置したものかどうか
    isHidden?: boolean;  // 編集画面以外で非表示にするフラグ
}

export interface RecipeSlide {
    id: string;
    image: string;
    pins: PinItem[];
    isThumbnail: boolean;
}

interface Props {
    initialData?: any;
    onBack: () => void;
}

export const PostPage = ({ initialData, onBack }: Props) => {
    // 日記全体のデータ
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
        if (initialData?.slides) return initialData.slides;
        return [{
            id: 'slide-0',
            image: DEFAULT_FACE_IMAGE,
            pins: DEFAULT_MAKEUP_PINS.map((p, index) => ({
                id: `default-${p.part}-${index}`,
                x: p.x,
                y: p.y,
                items: [],
                isSaved: false,
                label: p.label,
                isDefault: true
            })),
            isThumbnail: true
        }];
    });

    // 編集中のレシピID（新規の場合は生成）
    const [recipeId] = useState(initialData?.id || Date.now().toString());

    // オートセーブのロジック
    useEffect(() => {
        const performSave = () => {
            const payload = {
                id: recipeId,
                slides,
                overallData
            };

            const savedData = localStorage.getItem('mua_recipes');
            let recipes = savedData ? JSON.parse(savedData) : [];

            const index = recipes.findIndex((r: any) => r.id === recipeId);
            if (index >= 0) {
                recipes[index] = payload;
            } else {
                recipes.push(payload);
            }

            try {
                localStorage.setItem('mua_recipes', JSON.stringify(recipes));
                console.log("Auto-saved:", payload.overallData.title);
            } catch (e) {
                console.error("Auto-save failed", e);
            }
        };

        // 頻繁な書き込みを避けるため、最後の変更から500ms待ってから保存
        const timer = setTimeout(performSave, 500);
        return () => clearTimeout(timer);
    }, [slides, overallData, recipeId]);

    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const [pendingImage, setPendingImage] = useState<{ url: string, action: 'REPLACE' | 'ADD', targetId?: string } | null>(null);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);

    const closeAnyOpenPin = (slidesArray: RecipeSlide[]) => {
        if (!selectedPinId) return slidesArray;
        return slidesArray.map(slide => ({
            ...slide,
            pins: slide.pins.map(p => {
                if (p.id === selectedPinId) {
                    const hasContent = p.items && p.items.length > 0 && p.items.some(i => i.brand || i.name || i.memo);
                    return { ...p, isSaved: Boolean(hasContent) };
                }
                return p;
            }).filter(p => p.isSaved || p.isDefault)
        }));
    };

    const switchPin = (newId: string | null) => {
        setSlides(prev => closeAnyOpenPin(prev));
        setSelectedPinId(newId);
    };

    const handleAddPin = (slideId: string, x: number, y: number) => {
        const newId = Date.now().toString();
        const newPin: PinItem = { id: newId, x, y, items: [], isSaved: false };

        setSlides(prev => {
            const closed = closeAnyOpenPin(prev);
            return closed.map(slide =>
                slide.id === slideId
                    ? { ...slide, pins: [...slide.pins, newPin] }
                    : slide
            );
        });
        setSelectedPinId(newId);
    };

    const handleUpdatePin = (slideId: string, pinId: string, data: Partial<PinItem>) => {
        setSlides(prev => prev.map(slide =>
            slide.id === slideId
                ? { ...slide, pins: slide.pins.map(p => p.id === pinId ? { ...p, ...data } : p) }
                : slide
        ));
    };

    const handleDeletePin = (slideId: string, pinId: string) => {
        setSlides(prev => prev.map(slide =>
            slide.id === slideId
                ? { ...slide, pins: slide.pins.filter(p => p.id !== pinId) }
                : slide
        ));
        setSelectedPinId(null);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, action: 'REPLACE' | 'ADD', targetId?: string) => {
        if (e.target.files && e.target.files[0]) {
            // 他の操作の前に現在の入力を確定
            setSlides(prev => closeAnyOpenPin(prev));

            const url = URL.createObjectURL(e.target.files[0]);
            setPendingImage({ url, action, targetId });
            e.target.value = '';
        }
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
                isThumbnail: slides.length === 0
            };
            setSlides(prev => [...prev, newSlide]);

            setTimeout(() => {
                const scrollContainer = document.querySelector('.hide-scrollbar');
                if (scrollContainer) {
                    // 追加後のスライドのインデックスは「追加前の長さ」と同じ
                    scrollContainer.scrollTo({
                        left: slides.length * scrollContainer.clientWidth,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
        setPendingImage(null);
        setSelectedPinId(null);
    };

    const handleDeleteSlide = (slideId: string) => {
        setSlides(prev => {
            const newSlides = prev.filter(s => s.id !== slideId);
            // サムネイルに設定されている画像を消した場合、別の画像をサムネイルにする
            if (prev.find(s => s.id === slideId)?.isThumbnail && newSlides.length > 0) {
                newSlides[0].isThumbnail = true;
            }
            return newSlides;
        });
        switchPin(null);
    };

    const handleSetThumbnail = (slideId: string) => {
        setSlides(prev => prev.map(s => {
            if (s.id === slideId) {
                // すでにサムネイルなら解除、そうでなければ設定
                return { ...s, isThumbnail: !s.isThumbnail };
            }
            // 他の画像はすべて解除
            return { ...s, isThumbnail: false };
        }));
    };

    const handleSavePost = () => {
        // 保存はuseEffect側で行われているため、ここでは戻る操作のみ
        onBack();
    };

    const handleOverallChange = (field: string, value: any) => {
        setOverallData(prev => ({ ...prev, [field]: value }));
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        const clientWidth = e.currentTarget.clientWidth;
        const index = Math.round(scrollLeft / clientWidth);
        if (index !== activeSlideIndex && index >= 0 && index < slides.length) {
            setActiveSlideIndex(index);
        }
    };

    return (
        <div className="flex flex-col gap-2 p-4 max-w-6xl mx-auto overflow-hidden">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <button
                        onClick={onBack}
                        className="text-slate-400 hover:text-pink-500 text-xs font-bold mb-2 flex items-center gap-1 transition-colors"
                    >
                        ← 履歴一覧へ戻る
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {initialData ? 'レシピを編集' : 'メイクレシピを記録'}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">タップしてコスメを登録するか、自分の写真をアップロードしてください</p>
                </div>
            </div>

            <div
                className="flex overflow-x-auto snap-x snap-mandatory gap-8 pb-4 w-full hide-scrollbar scroll-smooth"
                style={{ scrollSnapType: 'x mandatory' }}
                onScroll={handleScroll}
            >
                {slides.map((slide, index) => {
                    const selectedPin = slide.pins.find(p => p.id === selectedPinId);
                    const isActive = index === activeSlideIndex;

                    return (
                        <div key={slide.id} className="min-w-full snap-center flex flex-col items-center transition-all duration-500">
                            <div className={`flex flex-col md:flex-row gap-8 w-full max-w-5xl justify-center items-start h-full`}>
                                <div className={`flex flex-col items-center group relative transition-all duration-500 ${selectedPin ? 'flex-1' : 'flex-none w-full md:w-auto md:max-w-[70%]'}`}>
                                    <MakeupCanvas
                                        imageUrl={slide.image}
                                        pins={slide.pins}
                                        onAddPin={(x, y) => handleAddPin(slide.id, x, y)}
                                        onSelectPin={switchPin}
                                        onMovePin={(id, x, y) => handleUpdatePin(slide.id, id, { x, y })}
                                        selectedPinId={selectedPinId}
                                    />

                                    {/* ドットのページネーション (画像のすぐ下) */}
                                    {slides.length > 1 && (
                                        <div className="flex justify-center gap-2 mt-4 mb-2">
                                            {slides.map((_, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === index ? 'bg-pink-500 scale-125' : 'bg-slate-200'}`}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* 画像の差し替え・削除ボタン類 */}
                                    <div className="mt-2 flex flex-wrap items-center justify-center gap-3 w-full">
                                        <div className="flex items-center gap-2 mr-auto">
                                            <label className="text-xs font-bold cursor-pointer transition-colors bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 border border-slate-200 rounded-full flex items-center shadow-sm whitespace-nowrap">
                                                <span>📷 変更</span>
                                                <input type="file" className="hidden" onChange={(e) => handleImageChange(e, 'REPLACE', slide.id)} accept="image/*" />
                                            </label>

                                            {index === 0 && slide.image !== DEFAULT_FACE_IMAGE && (
                                                <button
                                                    onClick={() => setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, image: DEFAULT_FACE_IMAGE } : s))}
                                                    className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors px-1 underline underline-offset-2"
                                                >
                                                    イラストに戻す
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 ml-auto">
                                            {index > 0 && (
                                                !slide.isThumbnail ? (
                                                    <button
                                                        onClick={() => handleSetThumbnail(slide.id)}
                                                        className="text-[10px] font-bold text-slate-400 hover:text-pink-500 flex items-center gap-1 px-2 py-1 transition-colors"
                                                    >
                                                        <span>☆</span> サムネイルにする
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSetThumbnail(slide.id)}
                                                        className="text-[10px] font-bold text-pink-500 flex items-center gap-1 px-2 py-1 bg-pink-50 rounded-full hover:bg-pink-100 transition-colors"
                                                        title="解除する"
                                                    >
                                                        <span>★</span> サムネイル
                                                    </button>
                                                )
                                            )}

                                            <label className="text-xs font-bold cursor-pointer transition-colors bg-pink-50 text-pink-500 hover:bg-pink-100 px-4 py-1.5 border border-pink-100 rounded-full flex items-center shadow-sm whitespace-nowrap">
                                                <span>＋ 追加</span>
                                                <input type="file" className="hidden" onChange={(e) => handleImageChange(e, 'ADD')} accept="image/*" />
                                            </label>

                                            {slides.length > 1 && (
                                                <button
                                                    onClick={() => handleDeleteSlide(slide.id)}
                                                    className="text-xs font-bold transition-colors text-slate-300 hover:text-red-500 px-2 py-1"
                                                    title="削除"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 詳細入力エリア */}
                                <div className={`w-full md:w-80 flex-shrink-0 transition-opacity duration-300 ${isActive || selectedPin ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                    {selectedPin ? (
                                        <div className="animate-in slide-in-from-right-4 duration-300">
                                            <PinDetailForm
                                                pin={selectedPin}
                                                onChange={(data) => handleUpdatePin(slide.id, selectedPin.id, data)}
                                                onDelete={(id) => handleDeletePin(slide.id, id)}
                                                onClose={() => switchPin(null)}
                                            />
                                        </div>
                                    ) : (
                                        isActive && (
                                            <div className="p-5 border-2 border-dashed rounded-3xl text-center text-slate-400 bg-white/50 h-full flex flex-col justify-center min-h-[200px] mt-4 md:mt-0">
                                                気になる部分をタップして<br />アイテムを登録しよう
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ドットのページネーション（外部分は削除） */}

            {/* 日記全体の情報を管理するフォーム */}
            <div className="mt-8 p-8 md:p-10 bg-white rounded-[2rem] border border-slate-100 shadow-sm font-sans mx-auto w-full max-w-4xl">
                <h3 className="text-xl font-bold text-slate-800 mb-8 pb-4 border-b border-slate-100 flex items-center gap-3 tracking-wide">
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">📝</span>
                    Recipe Details
                </h3>

                <div className="space-y-8">
                    {/* タイトル & 日付 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Title</label>
                            <input
                                type="text"
                                value={overallData.title}
                                onChange={(e) => handleOverallChange('title', e.target.value)}
                                placeholder="例: ピンクブラウンの囲み目メイク"
                                className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-700 font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Date</label>
                            <input
                                type="date"
                                value={overallData.date}
                                onChange={(e) => handleOverallChange('date', e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-700 font-medium cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* 評価 & コンディション & 天気 */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Rating</label>
                            <div className="flex items-center justify-between px-2 py-3 bg-slate-50 rounded-2xl">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => handleOverallChange('rating', star)}
                                        className={`text-2xl flex-1 transition-all transform hover:scale-110 active:scale-95 ${star <= overallData.rating ? 'text-yellow-400 drop-shadow-sm' : 'text-slate-300'}`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">SKIN Condition</label>
                            <div className="flex gap-2">
                                {[
                                    { value: 'good', emoji: '✨', label: 'Good' },
                                    { value: 'normal', emoji: '🌿', label: 'Normal' },
                                    { value: 'bad', emoji: '💧', label: 'Bad' },
                                ].map(cond => (
                                    <button
                                        key={cond.value}
                                        onClick={() => handleOverallChange('condition', cond.value)}
                                        className={`flex-1 py-3 px-2 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all border-2
                                            ${overallData.condition === cond.value
                                                ? 'bg-white border-slate-800 text-slate-800 shadow-sm'
                                                : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                    >
                                        <span className="text-xl">{cond.emoji}</span>
                                        <span className="text-[10px] uppercase tracking-wider">{cond.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="md:col-span-5">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Weather</label>
                            <div className="flex gap-2">
                                {[
                                    { value: 'hot', emoji: '🌡️', label: 'Hot' },
                                    { value: 'sunny', emoji: '☀️', label: 'Sunny' },
                                    { value: 'cloudy', emoji: '☁️', label: 'Cloudy' },
                                    { value: 'rainy', emoji: '☔', label: 'Rainy' },
                                    { value: 'snowy', emoji: '⛄', label: 'Snowy' },
                                ].map(weather => (
                                    <button
                                        key={weather.value}
                                        onClick={() => handleOverallChange('weather', weather.value)}
                                        className={`flex-1 py-3 px-1 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all border-2 overflow-hidden
                                            ${overallData.weather === weather.value
                                                ? 'bg-white border-slate-800 text-slate-800 shadow-sm'
                                                : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                    >
                                        <span className="text-xl">{weather.emoji}</span>
                                        <span className="text-[9px] uppercase tracking-wider truncate w-full text-center">{weather.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* メモ */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Memo</label>
                        <textarea
                            value={overallData.memo}
                            onChange={(e) => handleOverallChange('memo', e.target.value)}
                            placeholder="メイクの手順や、気づいたこと、全体の感想などを記録します..."
                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-700 min-h-[120px] resize-y"
                        />
                    </div>

                    {/* タグ */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Tags (カンマ区切り)</label>
                        <input
                            type="text"
                            value={overallData.tags.join(', ')}
                            onChange={(e) => {
                                handleOverallChange('tags', e.target.value ? e.target.value.split(',').map(t => t.trim()) : []);
                            }}
                            placeholder="イエベ秋, デート, 涙袋 ..."
                            className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-700 font-medium"
                        />
                    </div>
                </div>

                {/* 保存ボタン */}
                <div className="mt-12 pt-8 border-t border-slate-100 flex justify-center">
                    <button
                        onClick={handleSavePost}
                        className="px-16 py-4 bg-slate-900 text-white rounded-full font-bold text-lg tracking-widest hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-200"
                    >
                        完了して閉じる
                    </button>
                </div>
            </div>
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
