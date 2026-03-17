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
