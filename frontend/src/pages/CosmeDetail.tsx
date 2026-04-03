import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Edit2, Trash2, Info, Palette } from 'lucide-react';
import { getDefaultCosmeImage, getFullImageUrl } from '../utils/imageUtils';
import { PCCS_TABLE } from '../constants/pccsTable';

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
    "V": "ビビッド", "b": "ブライト", "s": "ストロング", "dp": "ディープ",
    "p": "ペール", "ltg": "ライトグレイッシュ", "g": "グレイッシュ", "dkg": "ダークグレイッシュ",
    "lt": "ライト", "sf": "ソフト", "d": "ダル", "dk": "ダーク",
    "W": "ホワイト", "Bk": "ブラック",
    "vp": "ベリーペール", "pg": "ペールグレイッシュ", "mg": "ミドルグレイッシュ",
    "vg": "ベリーグレイッシュ", "vdk": "ベリーダーク"
};

// 日本語形容詞（「淡い赤」の「淡い」部分）
const TONE_JP_ADJECTIVE: Record<string, string> = {
    "V": "鮮やかな", "b": "明るく鮮やかな", "s": "強い", "dp": "濃い",
    "p": "淡い", "ltg": "明るい灰みの", "g": "灰みの", "dkg": "暗い灰みの",
    "lt": "浅い", "sf": "柔らかな", "d": "にぶい", "dk": "暗い",
    "W": "白い", "Bk": "黒い",
    "vp": "とても明るい", "pg": "淡い灰みの", "mg": "中明度灰みの",
    "vg": "とても暗い灰みの", "vdk": "とても暗い"
};

// 無彩色トーンの日本語色名（hue=0のときに使用）
const ACHROMATIC_JP: Record<string, string> = {
    "W": "白", "Bk": "黒",
    "N9": "明るいグレー", "N7": "グレー", "N5": "中明度グレー", "N3": "暗いグレー"
};

const HUE_NAMES: Record<number, string> = {
    1: "紫みの赤", 2: "赤", 3: "黄みの赤", 4: "赤みの橙", 5: "橙", 6: "黄みの橙",
    7: "赤みの黄", 8: "黄", 9: "緑みの黄", 10: "黄緑", 11: "黄みの緑", 12: "緑",
    13: "青みの緑", 14: "青緑", 15: "緑みの青", 16: "青", 17: "紫みの青", 18: "青紫",
    19: "紫みの青", 20: "紫", 21: "青みの紫", 22: "赤紫", 23: "赤みの紫", 24: "紫みの赤"
};

const TONE_TO_PCCS_KEY: Record<string, string> = {
    "V": "v", "b": "b", "dp": "dp", "lt": "ltPlus", "sf": "sf",
    "d": "d", "dk": "dk", "p": "pPlus", "ltg": "ltg", "g": "g", "dkg": "dkg"
};

const getPccsColorNames = (tone: string, hue: number): string | null => {
    const row = PCCS_TABLE.rows.find(r => r.hue === hue);
    if (!row) return null;
    const key = TONE_TO_PCCS_KEY[tone];
    if (key && row[key as keyof typeof row]) {
        const names = row[key as keyof typeof row] as string[];
        if (names && names.length > 0) return names.join("・");
    }
    return null;
};

export const CosmeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [cosme, setCosme] = useState<Cosmetic | null>(null);
    const [variations, setVariations] = useState<Cosmetic[]>([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const fetchCosme = async () => {
            try {
                // 対象のコスメを取得
                const res = await axios.get(`/cosmetics/${id}`);
                const tgt = res.data;

                // 同じバリエーション（ブランド・商品名・色番号が一致）のものをすべて取得
                const allRes = await axios.get('/cosmetics/');
                const allCosmetics = allRes.data as Cosmetic[];
                const siblings = allCosmetics.filter(c =>
                    c.brand === tgt.brand &&
                    c.name === tgt.name &&
                    c.color_number === tgt.color_number
                ).sort((a, b) => a.id - b.id); // 登録順に表示

                setCosme(tgt);
                setVariations(siblings.length > 0 ? siblings : [tgt]);
            } catch (e) {
                console.error("Failed to fetch cosmetic details", e);
            } finally {
                setLoading(false);
            }
        };
        fetchCosme();
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm("表示されているこのコスメ（全バリエーション）を削除してもよろしいですか？")) return;
        try {
            await Promise.all(variations.map(v => axios.delete(`/cosmetics/${v.id}`)));
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
        <div className="mx-auto min-h-screen bg-white pb-10 font-sans relative">
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
                    <button onClick={() => navigate(`/cosme/new`, { state: { editCosme: cosme, variations } })} className="p-2 text-pink-500 hover:bg-pink-50 rounded-full transition-colors">
                        <Edit2 size={18} />
                    </button>
                    <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in duration-700">
                {/* メインビジュアルエリア */}
                <div className="relative group p-10">
                    <div className="aspect-square w-full overflow-hidden bg-white">
                        <img
                            src={getFullImageUrl(cosme.image_url) || getDefaultCosmeImage(cosme.category)}
                            alt={cosme.name}
                            className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-105"
                        />
                    </div>
                    {/* フローティング カラーサークル */}
                    <div className="absolute bottom-6 right-6 flex items-center pr-2">
                        {variations.map((v, i) => (
                            <div
                                key={v.id}
                                className="w-14 h-14 rounded-full border-4 border-white shadow-2xl ring-1 ring-black/5 -ml-6 first:ml-0 transition-transform group-hover:-translate-y-2 group-hover:z-50"
                                style={{ backgroundColor: v.color_hex, zIndex: variations.length - i }}
                                title={v.color_number || v.color_hex}
                            />
                        ))}
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

                    {/* メモセクション */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Info size={14} className="text-blue-400" /> Memo
                        </h3>
                        <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-50">
                            <p className="text-[13px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                                {cosme.memo || "詳細なメモはまだ登録されていません。"}
                            </p>
                        </div>
                    </div>

                    {/* 解析データセクション */}
                    <div className="bg-slate-50 rounded-[2rem] p-6 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Palette size={14} className="text-pink-400" /> Color Analysis
                            </h3>
                            <span className="text-[10px] font-black text-slate-300">PCCS SYSTEM</span>
                        </div>

                        <div className="space-y-3">
                            {variations.map(variation => (
                                <div key={variation.id} className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100/50">
                                    <div className="relative group shrink-0">
                                        <div className="w-14 h-14 rounded-full border-[3px] border-white shadow-md flex items-center justify-center overflow-hidden"
                                            style={{ backgroundColor: variation.color_hex }}>
                                            <div className="absolute inset-0 from-black/20 to-transparent opacity-20" />
                                        </div>
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-white/90 backdrop-blur rounded text-[9px] font-black text-slate-600 shadow-sm border border-slate-100 whitespace-nowrap">
                                            {variation.pccs_tone}{variation.pccs_hue}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-0.5">
                                        {variation.color_number && (
                                            <p className="text-xs font-bold text-slate-800 truncate">{variation.color_number}</p>
                                        )}
                                        {/* 行1: トーン名(英語) */}
                                        <p className="text-[10px] font-bold text-slate-400">
                                            {variation.pccs_hue === 0
                                                ? (TONE_NAMES[variation.pccs_tone] ?? variation.pccs_tone)
                                                : `${TONE_NAMES[variation.pccs_tone]}トーン no.${variation.pccs_hue}`
                                            }
                                        </p>
                                        {/* 行2: 日本語色名 */}
                                        <p className="text-xs font-black text-slate-700">
                                            {variation.pccs_hue === 0
                                                ? (ACHROMATIC_JP[variation.pccs_tone] ?? "無彩色")
                                                : `${TONE_JP_ADJECTIVE[variation.pccs_tone]}${HUE_NAMES[variation.pccs_hue]}`
                                            }
                                        </p>
                                        {/* 行3: pccsTable色名（有彩色のみ） */}
                                        {variation.pccs_hue !== 0 && getPccsColorNames(variation.pccs_tone, variation.pccs_hue) && (
                                            <p className="text-xs font-bold text-pink-500 truncate">
                                                {getPccsColorNames(variation.pccs_tone, variation.pccs_hue)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
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
