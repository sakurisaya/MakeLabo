import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Edit2, Trash2, Info, Droplet, Palette } from 'lucide-react';
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
    pccs_tone: string;
    pccs_hue: number;
}

const TONE_NAMES: Record<string, string> = {
    "V": "ビビット", "b": "ブライト", "s": "ストロング", "dp": "ディープ",
    "p": "ペール", "ltg": "ライトグレイッシュ", "g": "グレイッシュ", "dkg": "ダークグレイッシュ",
    "lt": "ライト", "sf": "ソフト", "d": "ダル", "dk": "ダーク"
};

export const CosmeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [cosme, setCosme] = useState<Cosmetic | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCosme = async () => {
            try {
                const res = await axios.get(`/cosmetics/${id}`);
                setCosme(res.data);
            } catch (e) {
                console.error("Failed to fetch cosmetic details", e);
            } finally {
                setLoading(false);
            }
        };
        fetchCosme();
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm("このコスメを削除してもよろしいですか？")) return;
        try {
            await axios.delete(`/cosmetics/${id}`);
            navigate('/cosme');
        } catch (e) {
            alert("削除に失敗しました。");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-300">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-4"></div>
                <p className="text-sm font-bold">データを読み込み中...</p>
            </div>
        );
    }

    if (!cosme) {
        return (
            <div className="p-8 text-center">
                <p className="text-slate-400">コスメが見つかりませんでした。</p>
                <button onClick={() => navigate('/cosme')} className="mt-4 text-pink-500 font-bold underline">一覧に戻る</button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto min-h-screen bg-white pb-10 font-sans relative">
            {/* ヘッダー */}
            <div className="bg-white/80 backdrop-blur-md px-4 py-3 border-b border-slate-50 flex items-center justify-between sticky top-0 z-30">
                <button onClick={() => navigate('/cosme')} className="p-2 text-slate-400 hover:text-pink-500 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Product Details</span>
                    <h1 className="text-sm font-black text-slate-800 tracking-tight">ITEM SPEC</h1>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/cosme/new`, { state: { editCosme: cosme } })} className="p-2 text-pink-500 hover:bg-pink-50 rounded-full transition-colors">
                        <Edit2 size={18} />
                    </button>
                    <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in duration-700">
                {/* メインビジュアルエリア */}
                <div className="relative group">
                    <div className="aspect-square w-full overflow-hidden bg-slate-50">
                        <img
                            src={cosme.image_url || getDefaultCosmeImage(cosme.category)}
                            alt={cosme.name}
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                    </div>
                    {/* フローティング カラーサークル */}
                    <div className="absolute bottom-6 right-6 flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-full border-4 border-white shadow-2xl ring-1 ring-black/5" style={{ backgroundColor: cosme.color_hex }} />
                        <span className="px-2 py-1 bg-white/90 backdrop-blur rounded text-[9px] font-black text-slate-800 shadow-sm border border-slate-100 tracking-tighter uppercase">{cosme.color_hex}</span>
                    </div>

                    {/* カテゴリ・質感バッジ */}
                    <div className="absolute bottom-6 left-6 flex gap-2">
                        <span className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-full text-[9px] font-black text-pink-600 shadow-sm border border-slate-100 uppercase tracking-widest">{cosme.category}</span>
                        <span className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-full text-[9px] font-black text-slate-600 shadow-sm border border-slate-100 uppercase tracking-widest">{cosme.texture}</span>
                    </div>
                </div>

                {/* 情報の塊：一つの大きなコンテナにまとめる */}
                <div className="px-6 py-8 space-y-8 bg-white">
                    {/* タイトルセクション */}
                    <div className="space-y-2 border-l-4 border-pink-500 pl-4">
                        <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.2em]">{cosme.brand}</p>
                        <h2 className="text-xl font-black text-slate-800 leading-tight">{cosme.name}</h2>
                        {cosme.color_number && (
                            <p className="text-sm font-bold text-slate-400">{cosme.color_number}</p>
                        )}
                    </div>

                    {/* 解析データセクション */}
                    <div className="bg-slate-50 rounded-[2rem] p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Palette size={14} className="text-pink-400" /> Color Analysis
                            </h3>
                            <span className="text-[10px] font-black text-slate-300">PCCS SYSTEM</span>
                        </div>

                        <div className="flex items-center gap-6">
                            {/* 色見本サークル */}
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center overflow-hidden"
                                    style={{ backgroundColor: cosme.color_hex }}>
                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
                                </div>
                                <div className="absolute -top-1 -left-1 w-6 h-6 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100">
                                    <Droplet size={10} className="text-pink-400" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-800">
                                        {TONE_NAMES[cosme.pccs_tone] || cosme.pccs_tone}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">Tone</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-pink-400" />
                                        <span className="text-xs font-black text-slate-600">HUE: {cosme.pccs_hue}</span>
                                    </div>
                                    <span className="px-2 py-0.5 bg-white rounded text-[10px] font-black text-slate-400 border border-slate-100 uppercase">
                                        {cosme.pccs_tone}{cosme.pccs_hue}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* メモセクション */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Info size={14} className="text-blue-400" /> Memo
                        </h3>
                        <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-50">
                            <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                                {cosme.memo || "詳細なメモはまだ登録されていません。"}
                            </p>
                        </div>
                    </div>

                    {/* フッターアクション */}
                    <div className="pt-4">
                        <button
                            onClick={() => navigate('/cosme')}
                            className="w-full py-4 bg-slate-900 shadow-xl shadow-slate-200 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <ChevronLeft size={14} /> Back to Library
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
