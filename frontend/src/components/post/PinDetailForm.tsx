import { useEffect } from 'react';
import type { PinItem, PinCosmeticItem } from '../../pages/PostPage';

interface Props {
    pin: PinItem;
    onChange: (data: Partial<PinItem>) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export const PinDetailForm = ({ pin, onChange, onClose, onDelete }: Props) => {

    // 開いた時にアイテムが1つもなければ初期枠を1つ作成する
    useEffect(() => {
        if (!pin.items || pin.items.length === 0) {
            const newItem: PinCosmeticItem = {
                id: Date.now().toString(),
                brand: '',
                name: '',
                memo: '',
                saveToMyCosme: false
            };
            onChange({ items: [newItem] });
        }
    }, [pin.id]);

    const updateItem = (itemId: string, data: Partial<PinCosmeticItem>) => {
        if (!pin.items) return;
        const newItems = pin.items.map(item =>
            item.id === itemId ? { ...item, ...data } : item
        );
        onChange({ items: newItems });
    };

    const handleAddItem = () => {
        const newItem: PinCosmeticItem = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            brand: '',
            name: '',
            memo: '',
            saveToMyCosme: false
        };
        onChange({ items: [...(pin.items || []), newItem] });
    };

    const handleRemoveItem = (itemId: string) => {
        const newItems = (pin.items || []).filter(i => i.id !== itemId);
        onChange({ items: newItems });
    };

    const items = pin.items || [];

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-in slide-in-from-right duration-300 max-h-[80vh] overflow-y-auto w-full md:w-[350px]">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-1">
                <h3 className="font-bold text-slate-800 text-lg flex items-center">
                    アイテム詳細
                    {pin.isDefault && (
                        <span className="ml-2 px-2 py-0.5 bg-slate-800 text-white text-[10px] rounded-full backdrop-blur-sm pointer-events-none uppercase whitespace-nowrap tracking-wider">
                            {pin.label === "contour" ? "HIGHLIGHT & SHADING" : pin.label}
                            {pin.isHidden ? '(非表示)' : ''}
                        </span>
                    )}
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors">✕</button>
            </div>

            <div className="space-y-6">
                {items.map((item, index) => (
                    <div key={item.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 relative group">
                        {items.length > 1 && (
                            <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="absolute top-2 right-2 text-slate-300 hover:text-red-400 p-1 rounded-md transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                title="このアイテムを削除"
                            >
                                ✕
                            </button>
                        )}
                        <h4 className="text-xs font-bold text-pink-500 mb-3 flex items-center gap-1">
                            <span className="bg-pink-100 text-pink-600 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">{index + 1}</span>
                            Item
                        </h4>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1">ブランド</label>
                                <input
                                    type="text"
                                    value={item.brand}
                                    onChange={(e) => updateItem(item.id, { brand: e.target.value })}
                                    placeholder="例: CANMAKE"
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none text-sm shadow-sm transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1">アイテム名</label>
                                <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                                    placeholder="例: クリーミータッチライナー"
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none text-sm shadow-sm transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1">塗り方・メモ</label>
                                <textarea
                                    value={item.memo}
                                    onChange={(e) => updateItem(item.id, { memo: e.target.value })}
                                    placeholder="例: 目尻に5mmほどハネさせて描く"
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none text-sm h-20 resize-none shadow-sm transition-all"
                                />
                            </div>
                            <div className="pt-2">
                                <label className="flex items-center cursor-pointer group/check w-fit">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={item.saveToMyCosme || false}
                                            onChange={(e) => updateItem(item.id, { saveToMyCosme: e.target.checked })}
                                            className="w-4 h-4 text-pink-500 rounded border-slate-300 focus:ring-pink-500 cursor-pointer peer"
                                        />
                                    </div>
                                    <span className="ml-2 text-xs text-slate-600 font-bold group-hover/check:text-pink-600 transition-colors">マイコスメにも登録する</span>
                                </label>
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleAddItem}
                    className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl font-bold hover:border-pink-300 hover:text-pink-500 hover:bg-pink-50/50 transition-all text-sm"
                >
                    ＋ アイテムを追加する
                </button>
            </div>

            {pin.isDefault && (
                <div className="flex items-center mt-6 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <input
                        type="checkbox"
                        id={`hide-pin-${pin.id}`}
                        checked={pin.isHidden || false}
                        onChange={(e) => onChange({ isHidden: e.target.checked })}
                        className="w-4 h-4 text-pink-500 rounded border-slate-300 focus:ring-pink-500 cursor-pointer"
                    />
                    <label htmlFor={`hide-pin-${pin.id}`} className="ml-2 text-xs text-slate-600 cursor-pointer font-bold font-sans">
                        このピンを編集画面以外では表示しない
                    </label>
                </div>
            )}

            <button
                onClick={onClose}
                className="w-full mt-6 py-3.5 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200"
            >
                完了して閉じる
            </button>
            {pin.isSaved && !pin.isDefault && (
                <button
                    onClick={() => onDelete(pin.id)}
                    className="w-full mt-3 py-2 text-red-400 text-xs font-bold hover:text-red-500 transition-colors"
                >
                    このパーツのピンを削除する
                </button>
            )}
        </div>
    );
};