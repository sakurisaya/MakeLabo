import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Copy, Trash2, Edit, MoreVertical, Plus, Search } from 'lucide-react';
import { getDefaultCosmeImage } from '../utils/imageUtils';

interface Cosmetic {
    id: number;
    category: string;
    name: string;
    brand: string;
    texture: string;
    color_number?: string;
    memo?: string;
    image_url?: string;
    color_hex: string;
}

const CATEGORIES = ["ベース", "アイシャドウ", "アイライナー", "マスカラ", "アイブロウ", "チーク", "リップ", "コントゥアリング", "Others"];

export const CosmeList = () => {
    const navigate = useNavigate();
    const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [longPressedId, setLongPressedId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);

    const fetchCosmetics = async () => {
        try {
            const res = await axios.get('/cosmetics/');
            setCosmetics(res.data);
        } catch (e) {
            console.error("Failed to fetch cosmetics", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCosmetics();
    }, []);

    const handleDelete = async (id: number) => {
        if (!window.confirm("このコスメを図鑑から削除してもよろしいですか？")) return;
        try {
            await axios.delete(`/cosmetics/${id}`);
            setCosmetics(cosmetics.filter(c => c.id !== id));
            setLongPressedId(null);
        } catch (e) {
            alert("削除に失敗しました。");
        }
    };

    const handleDuplicate = async (id: number) => {
        try {
            await axios.post(`/cosmetics/${id}/duplicate`);
            fetchCosmetics();
            setLongPressedId(null);
            alert("コスメを複製しました！");
        } catch (e) {
            alert("複製に失敗しました。");
        }
    };

    // グルーピングロジック: ブランド、名前、そして「色番号」が同じものをまとめる
    const groupedCosmetics = useMemo(() => {
        const groups: Record<string, { brand: string, name: string, color_number?: string, category: string, image_url?: string, variants: Cosmetic[] }> = {};

        cosmetics.forEach(c => {
            // 色番号も含めてキーにすることで、色番違いを別カードとして扱う
            const key = `${c.brand}-${c.name}-${c.color_number || 'no-number'}`;
            if (!groups[key]) {
                groups[key] = {
                    brand: c.brand,
                    name: c.name,
                    color_number: c.color_number,
                    category: c.category,
                    image_url: c.image_url,
                    variants: []
                };
            }
            groups[key].variants.push(c);
        });

        return Object.values(groups).sort((a, b) => {
            // 各グループ内で最大のID（最新アイテム）を見つけ、その降順でソート
            const maxIdA = Math.max(...a.variants.map(v => v.id));
            const maxIdB = Math.max(...b.variants.map(v => v.id));
            return maxIdB - maxIdA;
        });
    }, [cosmetics]);

    const filteredGroups = groupedCosmetics.filter(g => {
        const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (g.color_number && g.color_number.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = selectedCategory ? g.category === selectedCategory : true;
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-300">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-4"></div>
                <p className="text-sm font-bold">データを読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-8">
                <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <span className="w-2 h-8 bg-pink-500 rounded-full"></span>
                    My Cosmetics
                </h2>

                <div className="space-y-4">
                    {/* 検索バー */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                            type="text"
                            placeholder="ブランド・商品名で検索"
                            className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-pink-200 shadow-sm transition-all text-sm font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* カテゴリフィルター */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-4 py-2 rounded-full text-[10px] font-black whitespace-nowrap transition-all tracking-wider ${!selectedCategory ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-100'}`}
                        >
                            ALL
                        </button>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-[10px] font-black whitespace-nowrap transition-all tracking-wider ${selectedCategory === cat ? 'bg-pink-500 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-100'}`}
                            >
                                {cat.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {filteredGroups.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                    <p className="text-slate-300 font-black text-sm uppercase tracking-widest">No Items Found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-5">
                    {filteredGroups.map((group) => {
                        const mainVariant = group.variants[0]; // 代表アイテム
                        return (
                            <div
                                key={`${group.brand}-${group.name}`}
                                onClick={() => navigate(`/cosme/${mainVariant.id}`)}
                                className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 hover:shadow-xl hover:translate-y-[-4px] transition-all cursor-pointer group relative"
                            >
                                <div className="aspect-[1/1] rounded-2xl overflow-hidden mb-4 bg-slate-50 relative shadow-inner">
                                    <img
                                        src={group.image_url || getDefaultCosmeImage(group.category)}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        alt={group.name}
                                    />

                                    {/* 右上のメニューボタン */}
                                    <button
                                        className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-md rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:text-pink-500 shadow-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLongPressedId(mainVariant.id);
                                            setMenuPosition({ x: e.clientX, y: e.clientY });
                                        }}
                                    >
                                        <MoreVertical size={14} />
                                    </button>

                                    {/* パレット風の色表示 */}
                                    <div className="absolute bottom-3 left-3 flex items-center">
                                        {group.variants.slice(0, 6).map((v, i) => (
                                            <div
                                                key={v.id}
                                                className="w-5 h-5 rounded-full border-2 border-white shadow-md ring-1 ring-black/5 -ml-1.5 first:ml-0 transition-transform hover:translate-y-[-2px] hover:z-10"
                                                style={{ backgroundColor: v.color_hex, zIndex: group.variants.length - i }}
                                                title={v.color_number}
                                            />
                                        ))}
                                        {group.variants.length > 6 && (
                                            <div className="w-5 h-5 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center -ml-1.5 z-0 border border-slate-100">
                                                <span className="text-[7px] font-black text-slate-400">+{group.variants.length - 6}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest truncate">{group.brand}</p>
                                    <h3 className="text-[11px] font-black text-slate-800 line-clamp-1 leading-snug">{group.name}</h3>
                                    {group.color_number && (
                                        <p className="text-[10px] font-bold text-slate-400 truncate tracking-tight">{group.color_number}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-50">
                                        <span className="text-[8px] font-black text-slate-200 uppercase tracking-tighter">{group.category}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* アクションメニュー */}
            {longPressedId && menuPosition && (
                <div
                    className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[2px]"
                    onClick={() => { setLongPressedId(null); setMenuPosition(null); }}
                >
                    <div
                        className="absolute bg-white rounded-2xl shadow-2xl py-2 min-w-[160px] border border-slate-100 overflow-hidden"
                        style={{
                            left: Math.min(window.innerWidth - 180, menuPosition.x),
                            top: Math.min(window.innerHeight - 250, menuPosition.y)
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => { navigate(`/cosme/${longPressedId}`); setLongPressedId(null); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                        >
                            <Edit size={16} /> 詳細・編集
                        </button>
                        <button
                            onClick={() => handleDuplicate(longPressedId)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                        >
                            <Copy size={16} /> 複製する
                        </button>
                        <div className="h-[1px] bg-slate-50 my-1 mx-2"></div>
                        <button
                            onClick={() => handleDelete(longPressedId)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <Trash2 size={16} /> 削除する
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={() => navigate("/cosme/new")}
                className="fixed bottom-8 right-8 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl hover:bg-pink-500 hover:scale-110 active:scale-95 transition-all z-40 group"
            >
                <Plus size={32} className="transition-transform duration-300 group-hover:rotate-90" />
            </button>
        </div>
    );
};
