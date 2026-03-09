import { useState, useEffect } from 'react';
import DEFAULT_FACE_IMAGE from '../assets/images/noimg_face.png';

interface Recipe {
    id: string;
    overallData: {
        title: string;
        date: string;
        rating: number;
        weather: string;
        tags: string[];
    };
    slides: {
        image: string;
        isThumbnail: boolean;
    }[];
}

interface Props {
    onNavigateToPost: (recipeToEdit?: Recipe) => void;
}

export const History = ({ onNavigateToPost }: Props) => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);

    useEffect(() => {
        const savedData = localStorage.getItem('mua_recipes');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // 日付の新しい順にソート
                const sorted = (parsed as Recipe[]).sort((a, b) =>
                    new Date(b.overallData?.date || 0).getTime() - new Date(a.overallData?.date || 0).getTime()
                );
                setRecipes(sorted);
            } catch (e) {
                console.error("Failed to parse recipes", e);
            }
        }
    }, []);

    const getWeatherIcon = (weather: string) => {
        switch (weather) {
            case 'hot': return '🌡️';
            case 'sunny': return '☀️';
            case 'cloudy': return '☁️';
            case 'rainy': return '☔';
            case 'snowy': return '⛄';
            default: return '☀️';
        }
    };

    if (recipes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">
                    💄
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">研究データがまだありません</h2>
                <p className="text-slate-500 mb-8 max-w-xs">
                    最初のメイクアップを記録して、あなただけのレシピ帳を作りましょう！
                </p>
                <button
                    onClick={() => onNavigateToPost()}
                    className="px-10 py-4 bg-pink-500 text-white rounded-full font-bold shadow-lg shadow-pink-100 hover:bg-pink-600 hover:scale-105 active:scale-95 transition-all"
                >
                    メイクを記録する
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-pink-500 rounded-full"></span>
                Makeup History
            </h2>

            <div className="grid grid-cols-1 gap-6">
                {recipes.map((recipe) => {
                    const thumbnailSlide = recipe.slides.find(s => s.isThumbnail) || recipe.slides[0];
                    const displayImage = thumbnailSlide?.image || DEFAULT_FACE_IMAGE;

                    return (
                        <div
                            key={recipe.id}
                            onClick={() => onNavigateToPost(recipe)}
                            className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border border-slate-100 flex h-40 md:h-48 group"
                        >
                            {/* 左側: メイン画像 */}
                            <div className="w-32 md:w-40 h-full flex-shrink-0 relative overflow-hidden">
                                <img
                                    src={displayImage}
                                    alt={recipe.overallData?.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>

                            {/* 右側: 情報 */}
                            <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-pink-600 transition-colors">
                                        {recipe.overallData?.title || "無題のレシピ"}
                                    </h3>

                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center text-yellow-400">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={`text-sm ${i < (recipe.overallData?.rating || 0) ? 'opacity-100' : 'opacity-20'}`}>★</span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                            <span>{getWeatherIcon(recipe.overallData?.weather)}</span>
                                            <span className="font-sans">{recipe.overallData?.date}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 下部: タグ */}
                                <div className="flex flex-wrap gap-2 mt-auto">
                                    {(recipe.overallData?.tags || []).slice(0, 3).map((tag, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                            #{tag}
                                        </span>
                                    ))}
                                    {recipe.overallData?.tags && recipe.overallData.tags.length > 3 && (
                                        <span className="text-[10px] font-bold text-slate-300 self-center">+{recipe.overallData.tags.length - 3}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* FAB: 新規作成ボタン */}
            <button
                onClick={() => onNavigateToPost()}
                className="fixed bottom-8 right-8 w-16 h-16 bg-pink-500 text-white rounded-full shadow-2xl shadow-pink-200 flex items-center justify-center text-3xl hover:bg-pink-600 hover:scale-110 active:scale-95 transition-all z-40 group"
            >
                <span className="transition-transform duration-300 group-hover:rotate-90">＋</span>
            </button>
        </div>
    );
};
