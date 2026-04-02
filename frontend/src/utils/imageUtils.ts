import baseImg from '../assets/images/base.webp';
import cheeckImg from '../assets/images/cheeck.webp';
import contourImg from '../assets/images/contour.webp';
import eyebrowLinerImg from '../assets/images/eyebrow_liner.webp';
import eyeshadowImg from '../assets/images/eyeshadow.webp';
import lipImg from '../assets/images/lip.webp';
import othersImg from '../assets/images/others.webp';

/**
 * コスメのカテゴリに応じてデフォルト画像のURLを返します。
 * @param category コスメのカテゴリ名
 * @returns デフォルト画像のパス
 */
export const getDefaultCosmeImage = (category: string | undefined): string => {
    switch (category) {
        case 'ベース':
            return baseImg;
        case 'チーク':
            return cheeckImg;
        case 'コントゥアリング':
            return contourImg;
        case 'アイブロウ':
        case 'アイライナー':
        case 'マスカラ':
            return eyebrowLinerImg;
        case 'アイシャドウ':
            return eyeshadowImg;
        case 'リップ':
            return lipImg;
        case 'Others':
        default:
            return othersImg;
    }
};

/**
 * バックエンドから返された画像のパス（例: /static/images/xxx.jpg）に
 * 環境ごとのベースURLを付与して完全な表示用URLに変換します。
 * Base64や外部URLの場合はそのまま返します。
 */
export const getFullImageUrl = (path: string | undefined | null): string => {
    if (!path) return '';
    // Base64データや絶対URLの場合はそのまま
    if (path.startsWith('http') || path.startsWith('data:')) {
        return path;
    }
    // 環境変数に応じてURLの先頭部分を付与
    const baseURL = import.meta.env.DEV 
        ? 'http://localhost:8000' 
        : import.meta.env.VITE_API_BASE_URL;
    
    return `${baseURL}${path}`;
};
