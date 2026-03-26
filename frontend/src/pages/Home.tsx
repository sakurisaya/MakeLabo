import { useState, useEffect } from 'react';

// レシピの型定義（以前決めたもの）
interface Recipe {
  id: number;
  title: string;
  date: string;
  // ...必要に応じて追加
}

export const Home = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    // バックエンドからデータを取ってくる処理（既存のものをここに）
    const fetchRecipes = async () => {
      try {
        const response = await fetch('http://localhost:8000/recipes/');
        const data = await response.json();
        setRecipes(data);
      } catch (err) {
        console.error("Failed to fetch recipes", err);
      }
    };
    fetchRecipes();
  }, []);

  // 長押し検知のロジック
  let pressTimer: number;
  const handleTouchStart = (id: number) => {
    pressTimer = window.setTimeout(() => setActiveId(id), 500);
  };
  const handleTouchEnd = () => {
    clearTimeout(pressTimer);
    setActiveId(null);
  };

  return (
    <main className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
        {recipes.map((recipe) => (
          <article 
            key={recipe.id} 
            className="group relative bg-white overflow-hidden cursor-pointer touch-none"
            onTouchStart={() => handleTouchStart(recipe.id)}
            onTouchEnd={handleTouchEnd}
            onClick={() => !activeId && console.log("詳細モーダルを開く準備！")}
          >
            {/* 画像とオーバーレイの表示ロジック（既存のものをそのまま） */}
            <div className="aspect-square bg-pink-50 flex items-center justify-center">
              <p className="text-xs text-slate-400">No Image</p>
            </div>
            
            <div className={`
              absolute inset-0 bg-white/20 backdrop-blur-md flex flex-col justify-center items-center p-4 text-center transition-all duration-300
              ${activeId === recipe.id ? 'opacity-100' : 'opacity-0'}
              [@media(hover:hover)]:group-hover:opacity-100
            `}>
              <span className="text-[10px] text-pink-500 font-bold mb-1">{recipe.date}</span>
              <h3 className="text-slate-800 text-sm font-bold">{recipe.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
};