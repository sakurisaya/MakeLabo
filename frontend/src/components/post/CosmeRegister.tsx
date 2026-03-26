import { useState, useRef } from 'react';
import { Camera, Save, ChevronLeft, Plus, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { INITIAL_BRANDS, LOCAL_STORAGE_BRANDS_KEY } from '../../constants/brands';
import { getDefaultCosmeImage } from '../../utils/imageUtils';
import { PCCS_TABLE } from '../../constants/pccsTable';

// --- 1. 型定義 (Types) ---
// TypeScriptでは、データの「形」をあらかじめ決めておくことでミスを防ぎます。
interface PCCSResult {
    tone: string; // トーン (例: Vivid, Pale)
    hue: number;  // 色相 (1〜24)
}

interface CosmeticColor {
    id: string;
    hex: string;           // HEXカラーコード (#ffffff等)
    transparency: number;  // 透明度 (0〜100)
    pccs?: PCCSResult;     // PCCSの解析結果
}

// --- 2. 定数 (Constants) ---
// アプリ内で使い回す固定のデータを定義します。
const CATEGORIES = ["ベース", "アイシャドウ", "アイライナー", "マスカラ", "アイブロウ", "チーク", "リップ", "コントゥアリング", "Others"];



// カテゴリ別候補色：リップには赤系、アイブロウには茶系など
const CATEGORY_PALETTES: Record<string, string[]> = {
    "リップ": ["#D40045", "#EE0026", "#B01040", "#ED3B6B", "#FF4500", "#6c2937ff", "#FF69B4", "#C71585"],
    "チーク": ["#fbb4b4ff", "#FFB6C1", "#FA8072", "#E9967A", "#FF7F50", "#DB7093", "#882c2cff"],
    "アイシャドウ": ["#795948ff", "#734b58ff", "#a33f3aff", "#D40045", "#FF7F00", "#008678", "#0F218B", "#56007D", "#ED3B6B", "#CDE52F", "#1FB3B3", "#8561AB"],
    "ベース": ["#f6ebc3ff", "#ffddc4ff", "#f3c69eff", "#D2B48C", "#ffd2e3ff", "#ffffc2ff", "#efffe5ff", "#d1f2ffff", "#dad8ffff"],
    "アイブロウ": ["#2F1B10", "#3B2712", "#2c3035ff", "#6F4E37", "#A67B5B"],
    "アイライナー": ["#000000", "#492f21ff", "#6d4a4aff"],
    "マスカラ": ["#000000", "#492f21ff", "#6d4a4aff"],
    "コントゥアリング": ["#fffae9ff", "#fff5edff", "#feeeffff", "#c7a981ff", "#b1a698ff", "#876f4fff", "#8e9083ff"],
};

// カテゴリ別質感候補：ツヤ・マットなど順番を揃えています
const CATEGORY_TEXTURES: Record<string, string[]> = {
    "リップ": ["ツヤ", "マット", "ラメ", "シアー", "ベルベット", "サテン"],
    "アイシャドウ": ["ツヤ", "マット", "ラメ", "パール", "グリッター", "サテン", "メタリック"],
    "チーク": ["ツヤ", "マット", "パール", "シアー"],
    "ベース": ["ツヤ", "マット", "セミマット", "シアー"],
    "コントゥアリング": ["ツヤ", "シアー", "マット", "ラメ", "パール"],
    "アイライナー": ["ツヤ", "シアー", "マット", "ラメ", "パール"],
    "アイブロウ": ["パウダー", "ペンシル", "マスカラ"],
    "Others": ["ツヤ", "マット", "シアー"],
};

const DEFAULT_PALETTE = ["#D40045", "#EE0026", "#FF7F00", "#FFCC00", "#99CF15", "#33A23D", "#008678", "#055D87", "#0F218B", "#56007D"];

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



// --- 3. ヘルパー関数 (Helper Functions) ---
const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '').substring(0, 6);
    return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
};


// HSV 変換 → [H(0-360), S(0-100), V(0-100)]
const hexToHsv = (hex: string): [number, number, number] => {
    const [r, g, b] = hexToRgb(hex).map(v => v / 255);
    const v = Math.max(r, g, b);
    const d = v - Math.min(r, g, b);
    const s = v === 0 ? 0 : d / v;
    let h = 0;
    if (d !== 0) {
        if (v === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (v === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
};

// PCCS各色相のV-toneの基準H角度（V-toneの代表色から算出）
// hue 1〜24 に対応（index + 1 = PCCS色相番号）
const PCCS_HUE_ANGLES = [
    340, 350, 0, 14, 20, 30, 48, 54,   // 1-8
    64, 77, 97, 125, 158, 174, 185, 204,   // 9-16
    219, 237, 242, 252, 262, 282, 303, 325   // 17-24
];

// H角度 → 最も近いPCCS色相番号（1-24）
const angleToPccsHue = (angle: number): number => {
    let minDiff = Infinity, closest = 1;
    PCCS_HUE_ANGLES.forEach((ref, i) => {
        let diff = Math.abs(angle - ref);
        if (diff > 180) diff = 360 - diff; // 環状距離
        if (diff < minDiff) { minDiff = diff; closest = i + 1; }
    });
    return closest;
};



// 【完全SV型】findClosestPccs: デジタルカラーピッカーの直感（右上＝Vivid）を最優先する
const findClosestPccs = (targetHex: string) => {
    const [h, s, v] = hexToHsv(targetHex);

    // 1. 極暗領域（明度が低すぎる場合はすべて黒または極暗色）
    if (v < 15) {
        if (s < 6) return { tone: 'Bk', hue: 0 };
        return { tone: 'vdk', hue: angleToPccsHue(h) };
    }

    // 2. 無彩色 (S < 6)
    if (s < 6) {
        let tone = 'N3';
        if (v >= 90) tone = 'W';
        else if (v >= 75) tone = 'N9';
        else if (v >= 55) tone = 'N7';
        else if (v >= 35) tone = 'N5';
        return { tone, hue: 0 };
    }

    const hIdx = angleToPccsHue(h);

    // 3. 超低彩度領域 (6 <= S < 15) はカスタム拡張トーン
    if (s < 15) {
        if (v >= 85) return { tone: 'vp', hue: hIdx };
        if (v >= 65) return { tone: 'pg', hue: hIdx };
        if (v >= 45) return { tone: 'mg', hue: hIdx };
        return { tone: 'vg', hue: hIdx };
    }

    // 4. 有彩色の空間分類（ユーザーの「右上は必ずVivid」というデジタル直感を最優先）
    
    // 【ピッカー右端】超高彩度 (S >= 80)
    if (s >= 80) {
        if (v >= 85) return { tone: 'V', hue: hIdx };    // 右上：純色 Vivid
        if (v >= 55) return { tone: 'dp', hue: hIdx };   // 中央右：暗清色 Deep
        return { tone: 'dk', hue: hIdx };                // 右下：暗清色 Dark
    }

    // 【ピッカー右寄り】高〜中彩度 (60 <= S < 80)
    if (s >= 60) {
        if (v >= 85) return { tone: 'b', hue: hIdx };    // 上側：明清色 Bright (白混じり)
        if (v >= 55) return { tone: 's', hue: hIdx };    // 中段：濁色 Strong (グレー混じり)
        if (v >= 40) return { tone: 'd', hue: hIdx };    // 下段：濁色 Dull
        return { tone: 'dk', hue: hIdx };                // 最下段：Dark
    }

    // 【ピッカー中央】中彩度 (30 <= S < 60)
    if (s >= 30) {
        if (v >= 85) return { tone: 'lt', hue: hIdx };   // 上側：明清色 Light
        if (v >= 60) return { tone: 'sf', hue: hIdx };   // 中段：濁色 Soft
        if (v >= 40) return { tone: 'd', hue: hIdx };    // 下段：濁色 Dull
        return { tone: 'dk', hue: hIdx };                // 最下段：Dark
    }

    // 【ピッカー左寄り】低彩度 (15 <= S < 30)
    if (s >= 15) {
        if (v >= 85) return { tone: 'p', hue: hIdx };    // 上側：明清色 Pale
        if (v >= 60) return { tone: 'ltg', hue: hIdx };  // 中段：濁色 Light Grayish
        if (v >= 40) return { tone: 'g', hue: hIdx };    // 下段：濁色 Grayish
        return { tone: 'dkg', hue: hIdx };               // 最下段：Dark Grayish
    }

    return { tone: 'W', hue: 0 };
};



// --- 4. メインコンポーネント (Main Component) ---
const CosmeRegister: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const editCosme = location.state?.editCosme || location.state?.editData; // 前の画面からの編集用データ
    const returnPath = location.state?.returnPath;

    // editCosmeがPinCosmeticItemかCosmeticかによってプロパティ名が違うのを吸収
    const editCosmeId = editCosme?.id || editCosme?.cosmetic_master_id;
    const editImageUrl = editCosme?.image_url || editCosme?.imageUrl;

    // 状態管理 (State): 画面上で変化するデータ（ブランド名や選んだ色など）を保持します。

    const [category, setCategory] = useState(editCosme?.category || "");
    const [brand, setBrand] = useState(editCosme?.brand || "");
    const [name, setName] = useState(editCosme?.name || "");
    const [itemColorNumber, setItemColorNumber] = useState(editCosme?.color_number || editCosme?.colorNumber || "");
    const [texture, setTexture] = useState(editCosme?.texture || "");
    const [memo, setMemo] = useState(editCosme?.memo || editCosme?.masterMemo || "");

    // ブランドリストの状態（localStorageから読み込み、なければ初期リストを使用）
    const [brands, setBrands] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(LOCAL_STORAGE_BRANDS_KEY);
            const parsed = saved ? JSON.parse(saved) : [];
            const merged = Array.from(new Set([...INITIAL_BRANDS, ...parsed]));
            return merged;
        } catch (e) {
            console.warn(`Failed to parse brands from localStorage: ${e}`);
            return INITIAL_BRANDS;
        }
    });

    // 画像プレビュー用
    const [imagePreview, setImagePreview] = useState<string | null>(editImageUrl || null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [colors, setColors] = useState<CosmeticColor[]>(() => {
        const variations = location.state?.variations;
        if (variations && variations.length > 0) {
            return variations.map((v: any) => ({
                id: `edit-${v.id}`,
                hex: v.color_hex,
                transparency: v.transparency || 100,
                pccs: { tone: v.pccs_tone, hue: v.pccs_hue }
            }));
        } else if (editCosme?.color_hex || editCosme?.hex) {
            const hex = editCosme.color_hex || editCosme.hex;
            return [{
                id: editCosmeId ? `edit-${editCosmeId}` : 'edit-color',
                hex: hex,
                transparency: editCosme.transparency || 100,
                pccs: findClosestPccs(hex)
            }];
        }
        return [];
    });
    const [activeColorId, setActiveColorId] = useState<string | null>(colors.length > 0 ? colors[0].id : (editCosme?.hex ? 'edit-color' : null));

    // --- ロジック関数 ---
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const url = URL.createObjectURL(file); // ブラウザで表示可能な一時的なURLを作成
            setImagePreview(url);
        }
    };

    const handleRemoveImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setImagePreview(null);
        setImageFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeColor = (id: string) => {
        setColors(colors.filter(c => c.id !== id));
        if (activeColorId === id) setActiveColorId(null);
    };

    const addColor = (hex: string) => {
        const sanitizedHex = hex.substring(0, 7); // 8桁以上のHEXが来ても7桁に正規化

        const newId = Math.random().toString(36).substr(2, 9);
        const pccs = findClosestPccs(sanitizedHex);
        const newColor: CosmeticColor = {
            id: newId,
            hex: sanitizedHex,
            transparency: 100,
            pccs
        };
        setColors([...colors, newColor]);
        setActiveColorId(newId);
    };

    const updateColorField = (id: string, field: keyof CosmeticColor, value: any) => {
        setColors(colors.map(c => {
            if (c.id === id) {
                let updatedValue = value;
                if (field === 'hex' && typeof value === 'string') {
                    updatedValue = value.length > 7 ? value.substring(0, 7) : value;
                    // 他の既存カラーのHEXと重複するかチェック
                    if (colors.some(other => other.id !== id && other.hex.toLowerCase() === updatedValue.toLowerCase())) {
                        alert('この色はすでに登録されています。');
                        return c; // 変更をキャンセルして元の状態を維持
                    }
                }
                const updated = { ...c, [field]: updatedValue };
                if (field === 'hex') {
                    updated.pccs = findClosestPccs(updatedValue as string);
                }
                return updated;
            }
            return c;
        }));
    };

    const handleSave = async () => {
        if (brand && !brands.includes(brand)) {
            const newBrands = [...brands, brand];
            setBrands(newBrands);
            localStorage.setItem(LOCAL_STORAGE_BRANDS_KEY, JSON.stringify(newBrands));
        }

        // 自動で重複色を除去（集合としてHexをUniqueキーにする）
        const uniqueColors = Array.from(new Map(colors.map(c => [c.hex.toLowerCase(), c])).values());

        try {
            let finalImageUrl = imagePreview;
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                const uploadRes = await axios.post('/upload/', formData);
                finalImageUrl = uploadRes.data.image_url;
            }

            if (editCosmeId) {
                // 更新モード (複数色の追加/更新/削除を処理)
                const variations = location.state?.variations;
                const originalIds: number[] = variations ? variations.map((v: any) => v.id) : [editCosmeId];
                const currentEditIds = uniqueColors.filter(c => c.id.startsWith('edit-')).map(c => parseInt(c.id.replace('edit-', '')));
                const toDelete = originalIds.filter(id => !currentEditIds.includes(id));

                if (toDelete.length > 0) {
                    await Promise.all(toDelete.map(id => axios.delete(`/cosmetics/${id}`)));
                }

                await Promise.all(uniqueColors.map(c => {
                    const payload = {
                        category, brand, name, texture, memo,
                        color_number: itemColorNumber,
                        color_hex: c.hex,
                        transparency: c.transparency,
                        image_url: finalImageUrl
                    };
                    if (c.id.startsWith('edit-')) {
                        const id = c.id.replace('edit-', '');
                        return axios.put(`/cosmetics/${id}`, payload);
                    } else {
                        return axios.post('/cosmetics/', payload);
                    }
                }));
                alert(`${brand} ${name} を更新しました！`);
            } else {
                // 新規登録モード (POST)
                await Promise.all(uniqueColors.map(c =>
                    axios.post('/cosmetics/', {
                        category,
                        brand,
                        name,
                        texture,
                        memo,
                        color_number: itemColorNumber,
                        color_hex: c.hex,
                        transparency: c.transparency,
                        image_url: finalImageUrl
                    })
                ));
                alert(`${brand} ${name} を登録しました！`);
            }

            navigate(returnPath || "/cosme");
        } catch (error: any) {
            console.error("Failed to save cosmetic:", error);
            const detail = error.response?.data?.detail || error.message || "Unknown error";
            alert(`保存に失敗しました。\n原因: ${detail}`);
        }
    };

    // 現在のカテゴリに基づいたパレットと質感を決定
    const currentPalette = CATEGORY_PALETTES[category] || DEFAULT_PALETTE;
    const currentTextures = CATEGORY_TEXTURES[category] || CATEGORY_TEXTURES["Others"];

    // --- 5. 画面表示 (JSX) ---
    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-10 font-sans relative">
            {/* ヘッダー (Fixed Save Button) */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/80 backdrop-blur px-4 py-3 shadow-sm flex items-center justify-between z-50 border-b border-slate-100">
                <button onClick={() => navigate(returnPath || -1 as any)} className="p-2 -ml-2 text-slate-400 hover:text-pink-500">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none mb-1">Cosmetics</span>
                    <h1 className="text-sm font-black text-slate-800 tracking-tight">{editCosme?.id ? "コスメ編集" : "コスメ登録"}</h1>
                </div>
                <button onClick={handleSave} disabled={colors.length === 0 || !brand || !name} className="flex items-center gap-1 bg-pink-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md shadow-pink-200 hover:bg-pink-600 active:scale-95 disabled:opacity-50 transition-all">
                    <Save size={14} /> 保存
                </button>
            </div>

            <div className="p-4 pt-20 space-y-6">
                {/* 1. カテゴリ */}
                <div className="space-y-3">
                    <h2 className="text-[10px] font-black text-pink-500 uppercase tracking-widest pl-2 flex items-center gap-1 border-l-2 border-pink-500">
                        Category
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => (
                            <button key={cat} onClick={() => setCategory(cat)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${category === cat ? "border-pink-400 bg-pink-50 text-pink-600 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. 基本情報 */}
                <div className="space-y-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-[10px] font-black text-pink-500 uppercase tracking-widest flex items-center gap-1 border-l-2 border-pink-500 pl-2">
                        Basic Info
                    </h2>

                    <div className="space-y-3">
                        <label className="block">
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">ブランド名</span>
                            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} list="brand-list" className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-pink-200 text-sm font-medium" placeholder="例: 資生堂" />
                        </label>
                        <label className="block">
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">商品名</span>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-pink-200 text-sm font-bold" placeholder="例: スキングロウ ファンデーション" />
                        </label>
                        <label className="block">
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">共通の色番号・色名（任意）</span>
                            <input type="text" value={itemColorNumber} onChange={e => setItemColorNumber(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-pink-200 text-sm font-medium" placeholder="例: 03 ニュートラル" />
                        </label>
                        <label className="block">
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">メモ</span>
                            <textarea value={memo} onChange={e => setMemo(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-pink-200 text-sm h-20 resize-none font-medium text-slate-600" placeholder="美容処方" />
                        </label>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 block mb-2">質感</span>
                            <div className="flex flex-wrap gap-2">
                                {currentTextures.map(t => (
                                    <button key={t} onClick={() => setTexture(t)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${texture === t ? "border-slate-800 bg-slate-800 text-white shadow" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. 画像アップロード */}
                <div className="space-y-3">
                    <h2 className="text-[10px] font-black text-pink-500 uppercase tracking-widest pl-2 flex items-center gap-1 border-l-2 border-pink-500">
                        Product Image
                    </h2>
                    <div onClick={() => !imagePreview && fileInputRef.current?.click()} className={`relative aspect-video bg-white rounded-3xl border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm group transition-all ${!imagePreview ? 'hover:border-pink-300 cursor-pointer border-dashed bg-slate-50/50' : ''}`}>
                        <img src={imagePreview || getDefaultCosmeImage(category)} className={`absolute inset-0 w-full h-full object-contain transition-all duration-700 ${imagePreview ? 'opacity-100' : 'opacity-[0.03]'}`} alt="cosme background" />
                        {!imagePreview ? (
                            <div className="relative z-10 text-center flex flex-col items-center gap-2 text-slate-400 group-hover:scale-105 transition-transform duration-300">
                                <div className="bg-white shadow-sm p-4 rounded-full text-pink-300 group-hover:text-pink-400 transition-colors">
                                    <Camera size={28} />
                                </div>
                                <span className="text-xs font-bold">画像をアップロード</span>
                            </div>
                        ) : (
                            <div className="absolute top-3 right-3 flex gap-2 z-20">
                                <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="bg-white/90 backdrop-blur p-2 rounded-full shadow-lg text-slate-600 hover:text-pink-500 transition-colors"><Camera size={16} /></button>
                                <button onClick={handleRemoveImage} className="bg-white/90 backdrop-blur p-2 rounded-full shadow-lg text-slate-600 hover:text-red-500 transition-colors"><X size={16} /></button>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>
                </div>

                {/* 4. カラー詳細 */}
                <div className="space-y-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[10px] font-black text-pink-500 uppercase tracking-widest flex items-center gap-1 border-l-2 border-pink-500 pl-2">
                            Color <span className="ml-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-400 leading-none">{colors.length}</span>
                        </h2>
                    </div>

                    {/* 選択済みカラーのリスト（横スクロール） */}
                    <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x scrollbar-hide">
                        {colors.map((c) => (
                            <div key={c.id} className={`relative flex-shrink-0 snap-start cursor-pointer transition-all ${activeColorId === c.id ? 'scale-110 drop-shadow-md z-10' : 'opacity-80 hover:opacity-100'}`} onClick={() => setActiveColorId(c.id)}>
                                <div className="w-14 h-14 rounded-full border-[3px] border-white shadow-sm ring-1 ring-black/5" style={{ backgroundColor: c.hex }} title={c.hex} />
                                <button onClick={(e) => { e.stopPropagation(); removeColor(c.id); }} className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow border border-slate-100 text-slate-400 hover:text-red-500 z-20"><X size={10} /></button>
                                {c.pccs && <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-black bg-white/90 backdrop-blur text-slate-600 px-1.5 py-0.5 rounded shadow-sm border border-slate-100/50 whitespace-nowrap">{c.pccs.tone}{c.pccs.hue}</div>}
                            </div>
                        ))}
                        <button onClick={() => addColor(currentPalette[0])} className="w-14 h-14 snap-start flex-shrink-0 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors"><Plus size={20} /></button>
                    </div>

                    {/* アクティブなカラーの編集エリア */}
                    {activeColorId ? (
                        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 block mb-2">パレットから選ぶ ({category})</span>
                                <div className="flex flex-wrap gap-2">
                                    {currentPalette.map(hex => (
                                        <button key={hex} onClick={() => updateColorField(activeColorId, 'hex', hex)} className="w-8 h-8 rounded-full border-2 border-white shadow-sm active:scale-95 transition-transform" style={{ backgroundColor: hex }} />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-400 w-10">カスタム</span>
                                <div className="relative group flex-1 h-10">
                                    <div className="absolute inset-0 rounded-xl bg-white shadow-sm border border-slate-200 pointer-events-none flex items-center overflow-hidden">
                                        <div className="w-1/3 h-full" style={{ backgroundColor: colors.find(c => c.id === activeColorId)?.hex, opacity: (colors.find(c => c.id === activeColorId)?.transparency ?? 100) / 100 }} />
                                        <div className="flex-1 px-3 text-xs font-mono font-bold text-slate-400 bg-slate-50 border-l border-slate-100 text-center flex items-center justify-center">
                                            {colors.find(c => c.id === activeColorId)?.hex.substring(0, 7).toUpperCase()}
                                        </div>
                                    </div>
                                    <input type="color" value={colors.find(c => c.id === activeColorId)?.hex.substring(0, 7)} onChange={e => updateColorField(activeColorId, 'hex', e.target.value)} className="h-full w-full opacity-0 cursor-pointer" />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-400 w-10">透明度</span>
                                <input type="range" min="0" max="100" value={colors.find(c => c.id === activeColorId)?.transparency} onChange={e => updateColorField(activeColorId, 'transparency', parseInt(e.target.value))} className="flex-1 accent-pink-400 h-1.5 bg-slate-200 rounded-lg" />
                                <span className="text-[10px] font-mono font-bold text-slate-500 w-8 text-right bg-white px-1 py-0.5 rounded shadow-sm">{colors.find(c => c.id === activeColorId)?.transparency}%</span>
                            </div>

                            {/* PCCS解析結果のカード */}
                            {colors.find(c => c.id === activeColorId)?.pccs && (
                                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mt-2">
                                    <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">PCCS Analysis</span>
                                        <span className="text-[12px] font-black text-pink-500 bg-pink-50 px-2 py-0.5 rounded-lg">
                                            {colors.find(c => c.id === activeColorId)!.pccs!.tone}{colors.find(c => c.id === activeColorId)!.pccs!.hue}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full shadow-inner border-2 border-white" style={{ backgroundColor: colors.find(c => c.id === activeColorId)?.hex }} />
                                        <div className="flex-1">
                                            {/* 行1: トーン名(英語) */}
                                            <p className="text-[9px] font-bold text-slate-400">
                                                {colors.find(c => c.id === activeColorId)!.pccs!.hue === 0
                                                    ? TONE_NAMES[colors.find(c => c.id === activeColorId)!.pccs!.tone] ?? colors.find(c => c.id === activeColorId)!.pccs!.tone
                                                    : `${TONE_NAMES[colors.find(c => c.id === activeColorId)!.pccs!.tone]}トーン no.${colors.find(c => c.id === activeColorId)!.pccs!.hue}`
                                                }
                                            </p>
                                            {/* 行2: 日本語色名 */}
                                            <p className="text-sm font-black text-slate-700 leading-snug">
                                                {colors.find(c => c.id === activeColorId)!.pccs!.hue === 0
                                                    ? (ACHROMATIC_JP[colors.find(c => c.id === activeColorId)!.pccs!.tone] ?? "無彩色")
                                                    : `${TONE_JP_ADJECTIVE[colors.find(c => c.id === activeColorId)!.pccs!.tone]}${HUE_NAMES[colors.find(c => c.id === activeColorId)!.pccs!.hue]}`
                                                }
                                            </p>
                                            {/* 行3: pccsTable色名（有彩色のみ） */}
                                            {colors.find(c => c.id === activeColorId)!.pccs!.hue !== 0 && getPccsColorNames(colors.find(c => c.id === activeColorId)!.pccs!.tone, colors.find(c => c.id === activeColorId)!.pccs!.hue!) && (
                                                <p className="text-xs font-bold text-pink-500 mt-0.5">
                                                    {getPccsColorNames(colors.find(c => c.id === activeColorId)!.pccs!.tone, colors.find(c => c.id === activeColorId)!.pccs!.hue!)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <span className="text-xs font-bold text-slate-400">上の＋ボタンからカラーを追加してください</span>
                        </div>
                    )}
                </div>
            </div>

            <datalist id="brand-list">
                {brands.map(b => <option key={b} value={b} />)}
            </datalist>
        </div>
    );
};

export default CosmeRegister;

