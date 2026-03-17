import { useEffect, useState, useMemo } from 'react';
import type { PinItem, PinCosmeticItem } from '../../types/recipe';
import { Trash2, Plus, CheckCircle2, ChevronDown, List, Search, X, Star } from 'lucide-react';
import axios from 'axios';
import { INITIAL_BRANDS, LOCAL_STORAGE_BRANDS_KEY } from '../../constants/brands';
import { getDefaultCosmeImage } from '../../utils/imageUtils';

const CATEGORIES = ["ベース", "チーク", "コントゥアリング", "アイシャドウ", "アイライナー", "アイブロウ", "リップ", "Others"];

interface Props {
    pin: PinItem;
    onChange: (data: Partial<PinItem>) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export const PinDetailForm = ({ pin, onChange, onClose, onDelete }: Props) => {
    const [brands, setBrands] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(LOCAL_STORAGE_BRANDS_KEY);
            return saved ? JSON.parse(saved) : INITIAL_BRANDS;
        } catch (e) {
            console.warn(`Failed to parse brands from localStorage: ${e}`);
            return INITIAL_BRANDS;
        }
    });

    const [myCosmeList, setMyCosmeList] = useState<any[]>([]);
    const [showCosmeSelector, setShowCosmeSelector] = useState<number | null>(null); // index of item being selected
    const [searchQuery, setSearchQuery] = useState('');

    // コスメ一覧（図鑑）を取得
    useEffect(() => {
        axios.get('/cosmetics/')
            .then(res => {
                if (Array.isArray(res.data)) {
                    setMyCosmeList(res.data);
                } else {
                    console.error("API returned non-array data for cosmetics:", res.data);
                    setMyCosmeList([]);
                }
            })
            .catch(err => {
                console.error("Failed to fetch cosmetics", err);
                setMyCosmeList([]);
            });
    }, []);

    const filteredCosme = useMemo(() => {
        if (!Array.isArray(myCosmeList)) return [];
        return myCosmeList.filter(c =>
            (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [myCosmeList, searchQuery]);

    useEffect(() => {
        if (!pin.items || pin.items.length === 0) {
            const newItem: PinCosmeticItem = {
                id: `item-${Date.now()}`,
                brand: '',
                name: '',
                usageMemo: '',
                masterMemo: '',
                saveToMyCosme: false,
                isFromDictionary: false
            };
            onChange({ items: [newItem] });
        }
    }, [pin.id]);

    const updateItem = (itemId: string, data: Partial<PinCosmeticItem>) => {
        const newItems = (pin.items || []).map(item => {
            if (item.id === itemId) {
                return { ...item, ...data };
            }
            return item;
        });
        onChange({ items: newItems });
    };

    // 入力フォーカスが外れたタイミングで新しいブランドがあれば保存する
    const handleBrandBlur = (brandName: string) => {
        if (brandName && !brands.includes(brandName)) {
            const newBrands = [...brands, brandName];
            setBrands(newBrands);
            localStorage.setItem(LOCAL_STORAGE_BRANDS_KEY, JSON.stringify(newBrands));
        }
    };

    const handleAddItem = () => {
        const newItem: PinCosmeticItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            brand: '', name: '', usageMemo: '', masterMemo: '', saveToMyCosme: false, isFromDictionary: false
        };
        onChange({ items: [...(pin.items || []), newItem] });
    };

    const handleRemoveItem = (itemId: string) => {
        onChange({ items: (pin.items || []).filter(i => i.id !== itemId) });
    };

    const handleSelectFromMyCosme = (index: number, cosme: any) => {
        const item = (pin.items || [])[index];
        if (item) {
            updateItem(item.id, {
                brand: cosme.brand,
                name: cosme.name,
                colorNumber: cosme.color_number, // 追加
                hex: cosme.color_hex,             // 追加
                masterMemo: cosme.memo || '',
                saveToMyCosme: false,
                isFromDictionary: true
            });
        }
        setShowCosmeSelector(null);
    };

    const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"], v = n % 100;
        return (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return (
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl border border-white/20 animate-in slide-in-from-bottom-10 h-[70vh] flex flex-col w-full max-w-sm">
            {/* ヘッダー */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest leading-none mb-1">Pin Details</span>
                    <h3 className="font-black text-slate-800 text-xl tracking-tight leading-none">
                        {pin.isDefault ? (pin.label === "contour" ? "CONTUORING" : pin.label?.toUpperCase()) : "FREE PIN"}
                    </h3>
                    {pin.isDefault && pin.label === "contour" && (
                        <span className="text-[9px] font-bold text-slate-400 mt-1">Highlight / Shading</span>
                    )}
                </div>
                <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all">
                    <ChevronDown size={20} />
                </button>
            </div>

            {/* スクロールエリア */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-hide pb-4 relative">
                {(pin.items || []).map((item, index) => (
                    <div key={item.id} className="relative bg-slate-50 rounded-3xl p-5 border border-slate-100/50 group">
                        {(pin.items || []).length > 1 && (
                            <button onClick={() => handleRemoveItem(item.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-400 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        )}

                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-5 h-5 bg-pink-500 text-white rounded-md flex items-center justify-center text-[10px] font-bold shadow-sm">{index + 1}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {index + 1}{getOrdinal(index + 1)} Product
                            </span>
                        </div>

                        <div className="space-y-4">
                            {/* 図鑑から選ぶボタン */}
                            <button
                                onClick={() => { setShowCosmeSelector(index); setSearchQuery(''); }}
                                className="w-full py-2.5 bg-white border border-pink-100 text-pink-500 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 hover:bg-pink-50 transition-all shadow-sm active:scale-[0.98]"
                            >
                                <List size={14} /> マイコスメから選ぶ
                            </button>

                            <div className="flex items-center gap-2 my-2">
                                <div className="h-[1px] flex-1 bg-slate-200"></div>
                                <span className="text-[8px] font-bold text-slate-300 uppercase">or manual input</span>
                                <div className="h-[1px] flex-1 bg-slate-200"></div>
                            </div>

                            {/* ブランド名入力 */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Brand</label>
                                <input list="brand-options-pin" type="text" value={item.brand}
                                    onChange={e => updateItem(item.id, { brand: e.target.value })}
                                    onBlur={e => handleBrandBlur(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white rounded-xl border-none outline-none focus:ring-2 focus:ring-pink-200 text-sm shadow-sm" placeholder="ブランド名を入力" />
                                <datalist id="brand-options-pin">
                                    {brands.map(b => <option key={b} value={b} />)}
                                </datalist>
                            </div>

                            {/* アイテム名入力 */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Item Name</label>
                                <input type="text" value={item.name} onChange={e => updateItem(item.id, { name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white rounded-xl border-none outline-none focus:ring-2 focus:ring-pink-200 text-sm shadow-sm" placeholder="商品名を入力" />
                            </div>

                            {/* 色の表示・選択 */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Color</label>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-slate-50">
                                    <div className="relative group">
                                        <div className="w-8 h-8 rounded-full border border-slate-100 shadow-inner" style={{ backgroundColor: item.hex || '#FFFFFF' }} />
                                        {!item.isFromDictionary && (
                                            <input
                                                type="color"
                                                value={item.hex?.substring(0, 7) || '#FFFFFF'}
                                                onChange={e => updateItem(item.id, { hex: e.target.value })}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {item.isFromDictionary ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-slate-700 truncate">{item.colorNumber || '色番なし'}</span>
                                                <span className="text-[8px] px-1.5 py-0.5 bg-pink-100 text-pink-500 rounded-md font-black uppercase">Dictionary</span>
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                value={item.colorNumber || ''}
                                                onChange={e => updateItem(item.id, { colorNumber: e.target.value })}
                                                placeholder="色番号/名 (例: 06)"
                                                className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-700"
                                            />
                                        )}
                                        <div className="text-[9px] font-mono text-slate-300 uppercase leading-none">{item.hex || '#------'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* コスメ自体の特徴メモ */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 ml-1">COSMETIC DESCRIPTION (FOR DICTIONARY)</label>
                                <textarea value={item.masterMemo} onChange={e => updateItem(item.id, { masterMemo: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-pink-200 text-sm h-20 resize-none"
                                    placeholder="製品自体の特徴（色味、質感、持ちなど）" />
                            </div>

                            {/* 今日の塗り方メモ */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-pink-400 ml-1">TODAY'S TECHNIQUE (FOR RECIPE)</label>
                                <textarea value={item.usageMemo} onChange={e => updateItem(item.id, { usageMemo: e.target.value })}
                                    className="w-full px-4 py-3 bg-white rounded-xl border border-pink-100 outline-none focus:ring-2 focus:ring-pink-200 text-sm h-24 resize-none shadow-sm"
                                    placeholder="この日の塗り方のコツ（例：目尻に薄く、指でポンポンと...）" />
                            </div>

                            {/* 手入力した場合のみ「図鑑登録オプション」を表示する */}
                            {!item.isFromDictionary && (
                                <>
                                    <label className="flex items-center gap-2 px-1 cursor-pointer group/check">
                                        <input type="checkbox" checked={item.saveToMyCosme} onChange={e => updateItem(item.id, { saveToMyCosme: e.target.checked })}
                                            className="w-4 h-4 rounded-md border-slate-300 text-pink-500 focus:ring-pink-500 transition-all cursor-pointer" />
                                        <span className="text-[11px] font-bold text-slate-500 group-hover/check:text-slate-800 transition-colors">マイコスメ(図鑑)にも登録する</span>
                                    </label>

                                    {/* 図鑑登録にチェックを入れた場合に追加の入力項目（カテゴリー）を表示 */}
                                    {item.saveToMyCosme && (
                                        <div className="mt-3 space-y-3 p-3 bg-pink-50/50 rounded-xl border border-pink-100 animate-in fade-in duration-300">
                                            <label className="block">
                                                <span className="text-[10px] font-bold text-pink-500 mb-1 block">カテゴリー (必須)</span>
                                                <select
                                                    value={item.category || ""}
                                                    onChange={e => updateItem(item.id, { category: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white rounded-lg border-none outline-none focus:ring-2 focus:ring-pink-200 text-xs text-slate-700"
                                                >
                                                    <option value="" disabled>選択してください</option>
                                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                </select>
                                            </label>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}

                <button onClick={handleAddItem}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold text-xs hover:border-pink-300 hover:text-pink-500 hover:bg-pink-50/50 transition-all flex items-center justify-center gap-2">
                    <Plus size={16} /> アイテムを追加する
                </button>

                {!pin.isDefault && (
                    <button onClick={() => onDelete(pin.id)}
                        className="w-full py-3 text-red-400 font-bold text-xs hover:text-red-500 transition-colors flex items-center justify-center gap-2 mt-4">
                        <Trash2 size={14} /> このピンを削除する
                    </button>
                )}

                {/* 図鑑セレクター（オーバーレイ） */}
                {showCosmeSelector !== null && (
                    <div className="absolute inset-0 z-50 bg-slate-900/10 backdrop-blur-sm rounded-3xl flex flex-col p-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 flex-1 flex flex-col overflow-hidden">
                            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h4 className="text-[11px] font-black text-slate-800 flex items-center gap-2">
                                    <Star size={12} className="text-pink-500 fill-pink-500" />
                                    マイコスメを選択
                                </h4>
                                <button onClick={() => setShowCosmeSelector(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                                    <X size={14} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="p-2 bg-white border-b border-slate-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="検索..."
                                        className="w-full pl-8 pr-4 py-2 bg-slate-100 rounded-xl text-[10px] outline-none focus:ring-2 focus:ring-pink-200 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 space-y-3 scrollbar-hide">
                                {(() => {
                                    // プロダクトごとにグループ化
                                    const groups: Record<string, any[]> = {};
                                    filteredCosme.forEach(c => {
                                        const key = `${c.brand}-${c.name}`;
                                        if (!groups[key]) groups[key] = [];
                                        groups[key].push(c);
                                    });

                                    const groupList = Object.values(groups);

                                    if (groupList.length === 0) {
                                        return (
                                            <div className="py-10 text-center">
                                                <p className="text-[10px] font-bold text-slate-400">見つかりませんでした</p>
                                            </div>
                                        );
                                    }

                                    return groupList.map((shades, idx) => {
                                        const first = shades[0];
                                        return (
                                            <div key={idx} className="bg-slate-50 border border-slate-100 rounded-3xl p-3 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={first.image_url || getDefaultCosmeImage(first.category)}
                                                        alt={first.name}
                                                        className="w-10 h-10 rounded-xl object-cover bg-white shadow-sm flex-shrink-0"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[8px] font-black text-pink-400 uppercase tracking-tighter truncate">{first.brand}</div>
                                                        <div className="text-[10px] font-bold text-slate-800 leading-tight truncate">{first.name}</div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100/50">
                                                    {shades.map(s => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => handleSelectFromMyCosme(showCosmeSelector, s)}
                                                            className="flex items-center gap-1.5 px-2 py-1.5 bg-white border border-slate-200 rounded-full hover:border-pink-300 hover:bg-pink-50 transition-all group"
                                                            title={s.color_number}
                                                        >
                                                            <div className="w-4 h-4 rounded-full border border-slate-100 shadow-inner" style={{ backgroundColor: s.color_hex }} />
                                                            <span className="text-[9px] font-bold text-slate-600 group-hover:text-pink-600 truncate max-w-[60px]">
                                                                {s.color_number || '色番なし'}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 完了ボタン */}
            <div className="pt-4 flex-shrink-0">
                {pin.isDefault && (
                    <label className="flex items-center gap-2 mb-4 px-2 cursor-pointer group">
                        <input type="checkbox" checked={pin.isHidden} onChange={e => onChange({ isHidden: e.target.checked })}
                            className="w-4 h-4 rounded-md border-slate-300 text-pink-500 focus:ring-pink-500 transition-all cursor-pointer" />
                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">この部位をレシピに表示しない</span>
                    </label>
                )}
                <button onClick={onClose}
                    className="w-full py-4 bg-slate-900 text-white rounded-[2rem] font-black text-base shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <CheckCircle2 size={20} />
                    完了して閉じる
                </button>
            </div>
        </div>
    );
};