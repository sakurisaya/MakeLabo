import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, PlusCircle, BookOpen } from 'lucide-react';
import { History } from './pages/History';
import { PostPage } from './pages/PostPage';
import CosmeRegister from './components/post/CosmeRegister';
import { RecipeDetail } from './pages/RecipeDetail';
import { CosmeList } from './pages/CosmeList';
import { CosmeDetail } from './pages/CosmeDetail';

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
      <AppContent />
    </Router>
  );
}

const AppContent = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 overflow-x-hidden">
      {/* メインコンテンツ */}
      <main className="max-w-md mx-auto relative min-h-screen bg-white shadow-xl">
        <Routes>
          <Route path="/" element={<History onNavigateToPost={(data) => navigate("/post", { state: { initialData: data } })} />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
          <Route path="/cosme" element={<CosmeList />} />
          <Route path="/cosme/new" element={<CosmeRegister />} />
          <Route path="/cosme/:id" element={<CosmeDetail />} />
          <Route path="/post" element={<PostPage onBack={() => navigate("/")} />} />
        </Routes>
      </main>

      {/* 下部ナビゲーション */}
      <BottomNav />
    </div>
  );
};

export default App;