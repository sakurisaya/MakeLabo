export interface PinCosmeticItem {
    id: string;          // アイテムごとのユニークID
    brand: string;       // ブランド名
    name: string;        // 商品名
    usageMemo: string;   // 【今日独自のメモ】塗り方やテクニック
    masterMemo: string;  // 【コスメ自体のメモ】質感や特徴（図鑑に保存される）
    category?: string;
    texture?: string;
    hex?: string;              // 代表色（単色または先頭シェード）
    shadeHexes?: string[];     // パレット等の全シェード色（最大4）
    colorNumber?: string;
    imageUrl?: string;
    cosmetic_master_id?: number; // 図鑑のDB ID（更新時に使用）
    pccsTone?: string;
    pccsHue?: number;
    saveToMyCosme?: boolean;
    isFromDictionary?: boolean; // 図鑑から直接選択されたかどうかの判定フラグ
}


export interface PinItem {
    id: string;          // ピンのユニークID
    x: number;           // 画像内のX座標 (%)
    y: number;           // 画像内のY座標 (%)
    items: PinCosmeticItem[]; // このポイントで使うアイテムのリスト
    isSaved: boolean;    // 保存済みかどうか
    label?: string;      // 表示用ラベル (例: "Eye", "Lip")
    isDefault?: boolean; // 初めから配置されているピンかどうか
    isHidden?: boolean;  // 非表示設定
}

export interface RecipeSlide {
    id: string;
    image: string;       // 画像のURLまたはBase64
    pins: PinItem[];     // この画像に含まれるピンのリスト
    isThumbnail: boolean;// サムネイル画像かどうか
    isMakeMap: boolean;  // メイクマップ（部位ピンあり）かどうか
}

export interface Recipe {
    id: string;
    overallData: {
        title: string;
        date: string;
        rating: number;
        weather: string;
        tags: string[];
        memo: string;
        condition?: string; // History.tsx にはなかったが PostPage にはありそう
    };
    slides: RecipeSlide[];
}
