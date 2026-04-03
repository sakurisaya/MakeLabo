import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Calendar, Sparkles, BookOpen } from 'lucide-react';
import { History } from './pages/History';
import { PostPage } from './pages/PostPage';
import CosmeRegister from './components/post/CosmeRegister';
import { RecipeDetail } from './pages/RecipeDetail';
import { CosmeList } from './pages/CosmeList';
import { CosmeDetail } from './pages/CosmeDetail';
import { PortfolioExplanation } from './components/PortfolioExplanation';

// ページ遷移のたびにスクロール位置をトップへ戻す
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { 
      // PCレイアウトの場合、右半分のscroll領域もトップに戻したい場合は考慮が必要だが
      // まずは画面全体のスクロールに影響させる
      window.scrollTo(0, 0); 
  }, [pathname]);
  return null;
};

// --- ナビゲーションバー ---
// lg:absolute を付与してiPhoneモックの枠（relative）に追従させる
const BottomNav = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 lg:absolute lg:bottom-0 lg:left-0 lg:right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-around items-center py-3 px-6 z-[100] lg:rounded-b-[36px]">
      <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/') ? 'text-pink-500' : 'text-slate-400'}`}>
        <Calendar size={24} />
        <span className="text-[10px] font-bold">gallery</span>
      </Link>
      <Link to="/cosme" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/cosme') ? 'text-pink-500' : 'text-slate-400'}`}>
        <Sparkles size={24} />
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
    <div className="min-h-screen bg-slate-50 text-slate-800 lg:flex lg:w-full lg:overflow-hidden lg:bg-[#faf9f8]">
      
      {/* 左側: アプリ領域 (スマホサイズのモック部分) */}
      {/* 960px以上(lg)の時に左右分割を適応 */}
      <div className="lg:w-1/2 lg:h-screen lg:flex lg:items-center lg:justify-center relative">
         {/* iPhone風フレーム */}
         {/* transform: translateZ(0) でfixed要素（BottomNav）のアンカーをこの領域に閉じ込める */}
         <div 
             className="w-full min-h-screen bg-white shadow-xl 
                        lg:min-h-0 lg:w-[390px] lg:h-[97vh] lg:rounded-[48px] lg:border-[12px] lg:border-slate-800 
                        lg:shadow-2xl lg:overflow-hidden relative flex flex-col"
             style={{ transform: 'translateZ(0)' }}
         >
              {/* iPhone ノッチ（モック用デコレーション） */}
              <div className="hidden lg:block absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-3xl w-40 mx-auto z-[120]"></div>

              <ScrollToTop />
              
              {/* アプリのメインコンテンツ（スクロール可能エリア） */}
              <main className="flex-1 w-full bg-white relative pb-20 overflow-y-auto overflow-x-hidden hide-scrollbar">
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
      </div>

      {/* 右側: 解説領域（PCのみ表示） */}
      <div className="hidden lg:block lg:w-1/2 lg:h-screen lg:overflow-y-auto bg-white border-l border-slate-100/50 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
        <PortfolioExplanation />
      </div>

    </div>
  );
};

export default App;