import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calendar, PlusCircle, BookOpen, User } from 'lucide-react';
import CosmeRegister from './components/post/CosmeRegister';

// --- 仮のコンポーネント（今後実装予定） ---
const History = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-4">履歴一覧</h2>
    <p className="text-slate-500">（作成中のため、コスメ登録メニューをご覧ください）</p>
  </div>
);

const PostNew = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-4">新規日記作成</h2>
    <p className="text-slate-500">（作成中のため、コスメ登録メニューをご覧ください）</p>
  </div>
);

// --- ナビゲーションバー ---
const BottomNav = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-around items-center py-3 px-6 z-50">
      <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/') ? 'text-pink-500' : 'text-slate-400'}`}>
        <Calendar size={24} />
        <span className="text-[10px] font-bold">gallery</span>
      </Link>
      <Link to="/cosme" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/cosme') ? 'text-pink-500' : 'text-slate-400'}`}>
        <PlusCircle size={24} />
        <span className="text-[10px] font-bold">item</span>
      </Link>
      <Link to="/post" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/post') ? 'text-pink-500' : 'text-slate-400'}`}>
        <BookOpen size={24} />
        <span className="text-[10px] font-bold">recipe</span>
      </Link>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 overflow-x-hidden">
        {/* メインコンテンツ */}
        <main className="max-w-md mx-auto relative min-h-screen bg-white shadow-xl">
          <Routes>
            <Route path="/" element={<History />} />
            <Route path="/cosme" element={<CosmeRegister />} />
            <Route path="/post" element={<PostNew />} />
          </Routes>
        </main>

        {/* 下部ナビゲーション */}
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;