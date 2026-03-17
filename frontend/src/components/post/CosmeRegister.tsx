import { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, Save, ChevronLeft, Droplet, Plus, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { INITIAL_BRANDS, LOCAL_STORAGE_BRANDS_KEY } from '../../constants/brands';
import { getDefaultCosmeImage } from '../../utils/imageUtils';

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
    colorNumber?: string;  // 色番号・色名（任意）
    pccs?: PCCSResult;     // PCCSの解析結果
}

// --- 2. 定数 (Constants) ---
// アプリ内で使い回す固定のデータを定義します。
const CATEGORIES = ["ベース", "アイシャドウ", "アイライナー", "マスカラ", "アイブロウ", "チーク", "リップ", "コントゥアリング", "Others"];

// PCCSトーン別24色相のHEXマップ
// これを元に、入力された色に一番近いPCCSを算出します。
const PCCS_COLOR_MAP: Record<string, string[]> = {
    "V": ["#D40045", "#EE0026", "#FD1A1C", "#FE4118", "#FF590B", "#FF7F00", "#FFCC00", "#FFE600", "#CCE700", "#99CF15", "#66B82B", "#33A23D", "#008F62", "#008678", "#007A87", "#055D87", "#093F86", "#0F218B", "#1D1A88", "#281285", "#340C81", "#56007D", "#770071", "#AF0065"],
    "b": ["#ED3B6B", "#FA344D", "#FC3633", "#FC4E33", "#FF6E2B", "#FF9913", "#FFCB1F", "#FFF231", "#CDE52F", "#99D02C", "#55A73B", "#32A65D", "#2DA380", "#1AA28E", "#1FB3B3", "#1C86AE", "#2B78B0", "#396BB0", "#5468AD", "#6A64AE", "#8561AB", "#A459AB", "#C75BB1", "#DF4C93"],
    "s": ["#B01040", "#CA1028", "#CC2211", "#CC4613", "#D45F10", "#D97610", "#D19711", "#CCB914", "#B3B514", "#8CA114", "#41941E", "#28853F", "#287A52", "#297364", "#26707B", "#205B85", "#224A87", "#243B8B", "#241F86", "#3D1C84", "#4E2283", "#5F2883", "#8C1D84", "#9A0F50"],
    "dp": ["#870042", "#9D002B", "#A20715", "#A51200", "#A42F03", "#A24A02", "#A46603", "#A48204", "#949110", "#518517", "#307A25", "#306F42", "#186A53", "#025865", "#034F69", "#04436E", "#05426F", "#073E74", "#152A6B", "#232266", "#3F1B63", "#531560", "#690C5C", "#75004F"],
    "lt": ["#EE7296", "#FB7482", "#FA7272", "#FB8071", "#FA996F", "#FDB56D", "#FCD474", "#FEF27A", "#DDED71", "#B3DE6A", "#9AD47F", "#7FC97E", "#72C591", "#66C1AF", "#66C4C4", "#67B1CA", "#67A9C9", "#689ECA", "#7288C2", "#817DBA", "#9678B8", "#B173B6", "#C972B6", "#E170A4"],
    "sf": ["#BD576F", "#C95F6B", "#CF5E5A", "#D77957", "#D6763A", "#D89048", "#D29F34", "#CCBA4C", "#C0B647", "#B3B140", "#79B055", "#66AC78", "#5BA37E", "#4E9B87", "#4E9995", "#4F8B96", "#4E7592", "#516691", "#535A90", "#5C5791", "#77568F", "#8B5587", "#9E5485", "#B05076"],
    "d": ["#8C355F", "#994052", "#A6424C", "#B24443", "#B34D3E", "#B25939", "#A66E3D", "#997F42", "#8C8946", "#757E47", "#678049", "#5A814C", "#39764D", "#2A6A69", "#256B75", "#1D6283", "#204F79", "#214275", "#2E3A76", "#39367B", "#493278", "#5F3179", "#772D7A", "#802A69"],
    "dk": ["#632534", "#632A31", "#6B2B29", "#743526", "#6E3D1F", "#6B4919", "#695018", "#6A5B18", "#6E6E26", "#56561A", "#506B3E", "#355935", "#28523A", "#1E4B44", "#154D4E", "#0E4250", "#123B4F", "#163450", "#222A4E", "#312C4C", "#3E2E49", "#4A304B", "#57304B", "#643142"],
    "p": ["#EEAFCE", "#FBB4C4", "#FAB6B5", "#FDCDB7", "#FBD8B0", "#FEE6AA", "#FCF1AF", "#FEFFB3", "#EEFAB2", "#E6F5B0", "#D9F6C0", "#CCEAC4", "#C0EBCD", "#B3E2D8", "#B4DDDF", "#B4D7DD", "#B5D2E0", "#B3CEE3", "#B4C2DD", "#B2B6D9", "#BCB2D5", "#CAB2D6", "#DAAFDC", "#E4ADD5"],
    "ltg": ["#C99FB3", "#D7A4B5", "#D6A9A4", "#D7AFA7", "#D9B59F", "#D8BA96", "#D9C098", "#D9C69B", "#C5CB9B", "#AAC09A", "#A0BD9E", "#9EBCA4", "#99BAA7", "#92B8AD", "#91B8B7", "#91AFBA", "#92A9B9", "#91A4B5", "#9199B0", "#9191AD", "#9C93AE", "#A997B1", "#B89AB6", "#C09FB4"],
    "g": ["#6B455A", "#7D4F5A", "#7C575E", "#7D5F61", "#7E6261", "#7C6764", "#7C6A5E", "#7E6F5A", "#72755A", "#636F5B", "#586E57", "#476C5B", "#416863", "#395B64", "#38555D", "#384E5C", "#38475A", "#394158", "#353654", "#3F3051", "#463353", "#4A3753", "#553857", "#5B3A55"],
    "dkg": ["#3C2D30", "#3A2B2E", "#3B2B2C", "#3A2C2B", "#40322F", "#463B35", "#453B31", "#47402C", "#42412F", "#3E3F31", "#2C382A", "#24332C", "#23342E", "#253532", "#253535", "#283639", "#232C33", "#212832", "#242331", "#282530", "#2A2730", "#2D2A31", "#362C34", "#392D31"]
};

// カテゴリ別候補色：リップには赤系、アイブロウには茶系など
const CATEGORY_PALETTES: Record<string, string[]> = {
    "リップ": ["#D40045", "#EE0026", "#B01040", "#ED3B6B", "#FF4500", "#6c2937ff", "#FF69B4", "#C71585"],
    "チーク": ["#fbb4b4ff", "#FFB6C1", "#FA8072", "#E9967A", "#FF7F50", "#DB7093", "#882c2cff"],
    "アイシャドウ": ["#795948ff", "#734b58ff", "#a33f3aff", "#D40045", "#FF7F00", "#FFCC00", "#99CF15", "#33A23D", "#008678", "#055D87", "#0F218B", "#56007D", "#ED3B6B", "#CDE52F", "#1FB3B3", "#8561AB"],
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
    "コントゥアリング": ["ツヤ", "マット", "ラメ", "パール"],
    "アイライナー": ["ツヤ", "マット", "ラメ", "パール"],
    "アイブロウ": ["パウダー", "ペンシル", "マスカラ"],
    "Others": ["ツヤ", "マット", "シアー"],
};

const DEFAULT_PALETTE = ["#D40045", "#EE0026", "#FF7F00", "#FFCC00", "#99CF15", "#33A23D", "#008678", "#055D87", "#0F218B", "#56007D"];

const TONE_NAMES: Record<string, string> = {
    "V": "ビビット", "b": "ブライト", "s": "ストロング", "dp": "ディープ",
    "p": "ペール", "ltg": "ライトグレイッシュ", "g": "グレイッシュ", "dkg": "ダークグレイッシュ"
};

// --- 3. ヘルパー関数 (Helper Functions) ---
// 計算や変換など、特定の小さな仕事をする関数です。
const hexToRgb = (hex: string) => {
    // #RRGGBBAA の形式（8桁）で来る場合があるため、最初の6桁（#を含めて7文字）だけを使います
    const h = hex.replace('#', '').substring(0, 6);
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return [r, g, b];
};

const colorDistance = (rgb1: number[], rgb2: number[]) => {
    return Math.sqrt(rgb1.reduce((acc, val, i) => acc + Math.pow(val - rgb2[i], 2), 0));
};

const findClosestPccs = (targetHex: string) => {
    const targetRgb = hexToRgb(targetHex);
    let minDistance = Infinity;
    let closestPccs = { tone: "", hue: 0 };

    for (const [tone, hexList] of Object.entries(PCCS_COLOR_MAP)) {
        hexList.forEach((hex, index) => {
            const currentRgb = hexToRgb(hex);
            const dist = colorDistance(targetRgb, currentRgb);
            if (dist < minDistance) {
                minDistance = dist;
                closestPccs = { tone, hue: index + 1 };
            }
        });
    }
    return closestPccs;
};

// --- 4. メインコンポーネント (Main Component) ---
const CosmeRegister: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const editCosme = location.state?.editCosme || location.state?.editData; // 前の画面からの編集用データ
    const returnPath = location.state?.returnPath;

    // 状態管理 (State): 画面上で変化するデータ（ブランド名や選んだ色など）を保持します。
    const [step, setStep] = useState(editCosme ? 2 : 1); // 編集時は基本情報から
    const [category, setCategory] = useState(editCosme?.category || "");
    const [brand, setBrand] = useState(editCosme?.brand || "");
    const [name, setName] = useState(editCosme?.name || "");
    const [itemColorNumber, setItemColorNumber] = useState(editCosme?.color_number || editCosme?.colorNumber || ""); // ステップ2で入力する色番号
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
    const [imagePreview, setImagePreview] = useState<string | null>(editCosme?.image_url || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [colors, setColors] = useState<CosmeticColor[]>(() => {
        if (editCosme?.color_hex || editCosme?.hex) {
            const hex = editCosme.color_hex || editCosme.hex;
            const cNum = editCosme.color_number || editCosme.colorNumber;
            return [{
                id: editCosme.id ? `edit-${editCosme.id}` : 'edit-color',
                hex: hex,
                transparency: editCosme.transparency || 100,
                colorNumber: cNum || "",
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
            const url = URL.createObjectURL(file); // ブラウザで表示可能な一時的なURLを作成
            setImagePreview(url);
        }
    };

    const removeColor = (id: string) => {
        setColors(colors.filter(c => c.id !== id));
        if (activeColorId === id) setActiveColorId(null);
    };

    const addColor = (hex: string) => {
        const sanitizedHex = hex.substring(0, 7); // 8桁以上のHEXが来ても7桁に正規化
        const newId = Math.random().toString(36).substr(2, 9); // ランダムなIDを生成
        const pccs = findClosestPccs(sanitizedHex);
        const newColor: CosmeticColor = {
            id: newId,
            hex: sanitizedHex,
            transparency: 100,
            colorNumber: itemColorNumber, // 常に共通の色番をデフォルトにする
            pccs
        };
        setColors([...colors, newColor]);
        setActiveColorId(newId);
    };

    const updateColorField = (id: string, field: keyof CosmeticColor, value: any) => {
        setColors(colors.map(c => {
            if (c.id === id) {
                let updatedValue = value;
                if (field === 'hex' && typeof value === 'string' && value.length > 7) {
                    updatedValue = value.substring(0, 7);
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

        try {
            // 選択された画像が Blob (一時URL) の場合はサーバーにアップロード
            let finalImageUrl = imagePreview;
            if (imagePreview && imagePreview.startsWith('blob:')) {
                const response = await fetch(imagePreview);
                const blob = await response.blob();
                const formData = new FormData();
                formData.append('file', blob, 'cosme.jpg');
                const uploadRes = await axios.post('/upload/', formData);
                finalImageUrl = uploadRes.data.image_url;
            }

            if (editCosme?.id) {
                // 更新モード (PUT)
                const c = colors[0];
                await axios.put(`/cosmetics/${editCosme.id}`, {
                    category,
                    brand,
                    name,
                    texture,
                    memo,
                    color_number: c.colorNumber,
                    color_hex: c.hex,
                    transparency: c.transparency,
                    image_url: finalImageUrl
                });
                alert(`${brand} ${name} を更新しました！`);
            } else {
                // 新規登録モード (POST)
                await Promise.all(colors.map(c =>
                    axios.post('/cosmetics/', {
                        category,
                        brand,
                        name,
                        texture,
                        memo,
                        color_number: c.colorNumber,
                        color_hex: c.hex,
                        transparency: c.transparency,
                        image_url: finalImageUrl
                    })
                ));
                alert(`${brand} ${name} を登録しました！`);
            }

            navigate(returnPath || "/cosme");
        } catch (error) {
            console.error("Failed to save cosmetic:", error);
            alert("保存に失敗しました。サーバーの状態を確認してください。");
        }
    };

    // 現在のカテゴリに基づいたパレットと質感を決定
    const currentPalette = CATEGORY_PALETTES[category] || DEFAULT_PALETTE;
    const currentTextures = CATEGORY_TEXTURES[category] || CATEGORY_TEXTURES["Others"];

    // --- 5. 画面表示 (JSX) ---
    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-20 font-sans">
            {/* ヘッダー部分 */}
            <div className="bg-white px-6 py-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
                <button
                    onClick={() => {
                        if (step > 1) {
                            setStep(step - 1);
                        } else {
                            navigate(returnPath || -1 as any);
                        }
                    }}
                    className="p-2 -ml-2 text-slate-400"
                >
                    <ChevronLeft />
                </button>
                <h1 className="text-lg font-bold text-slate-800">{editCosme?.id ? "コスメを編集" : "コスメを登録"}</h1>
                <div className="w-10"></div>
            </div>

            <div className="p-6">
                {/* ステップ1: カテゴリ選択 */}
                {step === 1 && (
                    <div className="animate-in fade-in duration-500">
                        <h2 className="text-xl font-bold mb-6 text-slate-800 text-center">カテゴリを選択</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => { setCategory(cat); setStep(2); }}
                                    className={`py-6 rounded-2xl border-2 transition-all duration-300 ${category === cat ? "border-pink-400 bg-pink-50 text-pink-600 shadow-md" : "border-white bg-white text-slate-600"}`}>
                                    <span className="block text-lg font-medium">{cat}</span>
                                    {cat === "ベース" && (
                                        <span className="block text-[10px] opacity-60 mt-1 font-bold">ファンデーション/コンシーラー/下地</span>
                                    )}
                                    {cat === "コントゥアリング" && (
                                        <span className="block text-[10px] opacity-60 mt-1 font-bold">ハイライト/シェーディング</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ステップ2: 基本情報（ブランド・商品名・質感） */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                        <label className="block">
                            <span className="text-sm font-bold text-slate-500 mb-2 block">ブランド名</span>
                            <input
                                type="text"
                                value={brand}
                                onChange={e => setBrand(e.target.value)}
                                list="brand-list"
                                className="w-full px-4 py-3 rounded-xl bg-white shadow-inner focus:ring-2 focus:ring-pink-300 outline-none"
                                placeholder="例: 資生堂"
                            />
                            <datalist id="brand-list">
                                {brands.map(b => <option key={b} value={b} />)}
                            </datalist>
                        </label>
                        <label className="block">
                            <span className="text-sm font-bold text-slate-500 mb-2 block">商品名</span>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white shadow-inner focus:ring-2 focus:ring-pink-300 outline-none" placeholder="例: エッセンス スキングロウ ファンデーション" />
                        </label>
                        <label className="block">
                            <span className="text-sm font-bold text-slate-500 mb-2 block">色番号・色名（任意）</span>
                            <input type="text" value={itemColorNumber} onChange={e => setItemColorNumber(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white shadow-inner focus:ring-2 focus:ring-pink-300 outline-none" placeholder="例: 130 Opal / 06 フィグフィグ" />
                        </label>
                        <label className="block">
                            <span className="text-sm font-bold text-slate-500 mb-2 block">メモ</span>
                            <textarea value={memo} onChange={e => setMemo(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white shadow-inner focus:ring-2 focus:ring-pink-300 outline-none min-h-[100px]" placeholder="例: 濡れたようなツヤ、美容処方、など" />
                        </label>
                        <div>
                            <span className="text-sm font-bold text-slate-500 mb-3 block">質感</span>
                            <div className="flex flex-wrap gap-2">
                                {currentTextures.map(t => (
                                    <button key={t} onClick={() => setTexture(t)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${texture === t ? "bg-slate-800 text-white shadow-lg" : "bg-white text-slate-500"}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div className="pt-4">
                            <button onClick={() => setStep(3)} disabled={!brand || !name} className="w-full py-4 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50">次へ：色の登録</button>
                        </div>
                    </div>
                )}

                {/* ステップ3: 色と画像の詳細登録 */}
                {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                        {/* 画像アップロード */}
                        <div onClick={() => fileInputRef.current?.click()} className="relative aspect-video bg-white rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner group transition-all hover:border-pink-400 cursor-pointer">
                            {/* 背景画像 (アップロード画像 または カテゴリ別デフォルト画像) */}
                            <img src={imagePreview || getDefaultCosmeImage(category)} className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${imagePreview ? 'opacity-100 scale-100' : 'opacity-15 group-hover:scale-105'}`} alt="cosme background" />

                            {!imagePreview && (
                                <div className="relative z-10 text-center group-hover:scale-110 transition-transform px-6 py-5 rounded-3xl">
                                    <div className="bg-pink-100/50 p-4 rounded-full inline-block mb-3"><Camera className="text-pink-500" size={32} /></div>
                                    <p className="text-[13px] text-slate-700 font-bold tracking-tight">商品の写真を撮る / 選択</p>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                        </div>

                        {/* カラーセクション */}
                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Droplet className="text-pink-400" />色の選択</h3>
                                <span className="text-xs font-bold text-slate-400">{colors.length}色登録済み</span>
                            </div>

                            {/* アイコン型のカラーリスト */}
                            <div className="flex gap-3 mb-6 overflow-x-auto pb-4 scrollbar-hide">
                                {colors.map(c => (
                                    <div key={c.id} className={`relative flex-shrink-0 cursor-pointer transition-all ${activeColorId === c.id ? 'scale-110' : ''}`} onClick={() => setActiveColorId(c.id)}>
                                        <div className="w-16 h-16 rounded-full border-4 border-white shadow-md" style={{ backgroundColor: c.hex }} />
                                        <button onClick={(e) => { e.stopPropagation(); removeColor(c.id); }} className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md text-pink-500"><X size={12} /></button>
                                        {c.pccs && <div className="absolute -bottom-1 left-0 right-0 text-[10px] font-bold bg-white/90 text-slate-700 px-1 rounded text-center shadow-sm">{c.pccs.tone}{c.pccs.hue}</div>}
                                    </div>
                                ))}
                                <button onClick={() => addColor(currentPalette[0])} className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 hover:bg-slate-200 transition-colors"><Plus /></button>
                            </div>

                            {/* 詳細編集エリア（色を選んだ時だけ表示） */}
                            {activeColorId ? (
                                <div className="bg-white p-6 rounded-3xl shadow-xl space-y-6 animate-in slide-in-from-bottom duration-500">
                                    <div>
                                        <span className="text-sm font-bold text-slate-500 mb-2 block">色番号・色名</span>
                                        <input type="text" value={colors.find(c => c.id === activeColorId)?.colorNumber} onChange={e => updateColorField(activeColorId, 'colorNumber', e.target.value)} className="w-full px-4 py-2 rounded-xl bg-slate-50 border-none outline-none text-sm" placeholder="例: 06 フィグフィグ" />
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-slate-400 mb-3 text-center">候補から選ぶ ({category})</p>
                                        <div className="grid grid-cols-6 gap-2 mb-6">
                                            {currentPalette.map(hex => (
                                                <button key={hex} onClick={() => updateColorField(activeColorId, 'hex', hex)} className="aspect-square rounded-lg shadow-sm border-2 border-white transform transition hover:scale-110 active:scale-95" style={{ backgroundColor: hex }} />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-bold text-slate-400 w-12">タップで調整</span>
                                            <div className="relative group flex-1">
                                                {/* ここで透明度を反映したプレビューを表示 */}
                                                <div className="absolute inset-0 rounded-lg shadow-inner pointer-events-none" style={{ backgroundColor: colors.find(c => c.id === activeColorId)?.hex, opacity: colors.find(c => c.id === activeColorId)?.transparency! / 100 }} />
                                                {/* valueには必ず7桁のHEX（#RRGGBB）を渡す必要があります（8桁だと黒になるため） */}
                                                <input type="color" value={colors.find(c => c.id === activeColorId)?.hex.substring(0, 7)} onChange={e => updateColorField(activeColorId, 'hex', e.target.value)} className="h-10 w-full rounded cursor-pointer border-none bg-transparent opacity-0" />
                                                <div className="h-10 w-full rounded border-2 border-slate-100 flex items-center justify-center">
                                                    <span className="text-[10px] font-mono text-slate-400 select-none">PICK COLOR</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold text-slate-400"><span>透明度</span><span>{colors.find(c => c.id === activeColorId)?.transparency}%</span></div>
                                            <input type="range" min="0" max="100" value={colors.find(c => c.id === activeColorId)?.transparency} onChange={e => updateColorField(activeColorId, 'transparency', parseInt(e.target.value))} className="w-full accent-pink-400 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
                                        </div>
                                    </div>

                                    {/* PCCS解析結果のカード */}
                                    {colors.find(c => c.id === activeColorId)?.pccs && (
                                        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-4 text-center border border-pink-100">
                                            <span className="text-[10px] font-black text-pink-400 uppercase tracking-[0.2em] block mb-1">PCCS Analysis</span>
                                            <div className="text-xl font-black text-pink-600">
                                                {TONE_NAMES[colors.find(c => c.id === activeColorId)!.pccs!.tone]}トーン / 色相 {colors.find(c => c.id === activeColorId)!.pccs!.hue}
                                                <span className="text-xs ml-2 font-medium bg-white px-2 py-0.5 rounded-lg shadow-sm">{colors.find(c => c.id === activeColorId)!.pccs!.tone}{colors.find(c => c.id === activeColorId)!.pccs!.hue}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-slate-100/50 py-12 rounded-3xl text-center border-2 border-dashed border-slate-200"><p className="text-slate-400 font-medium">上の「＋」ボタンから色を追加してください</p></div>
                            )}
                        </div>

                        <div className="pt-4">
                            <button onClick={handleSave} disabled={colors.length === 0} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"><Save size={20} />コスメを保存</button>
                        </div>
                    </div>
                )}
            </div>

            {/* 下の進捗ドット */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {[1, 2, 3].map(i => (<div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? 'w-8 bg-pink-400' : 'w-2 bg-slate-200'}`} />))}
            </div>
        </div>
    );
};

export default CosmeRegister;
