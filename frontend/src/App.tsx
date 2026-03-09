import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// 仮のコンポーネント（後で本物に入れ替えます）
const History = () => <div><h2>履歴一覧（作成中）</h2></div>;
const CosmeRegister = () => <div><h2>コスメ登録（作成中：ここにPCCS機能を入れます）</h2></div>;
const PostNew = () => <div><h2>新規日記作成（作成中）</h2></div>;

function App() {
  return (
    <Router>
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <h1>Make Labo</h1>
        
        {/* 簡易ナビゲーション */}
        <nav style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <Link to="/">履歴</Link>
          <Link to="/cosme">コスメ登録</Link>
          <Link to="/post">日記作成</Link>
        </nav>

        <hr />

        {/* 画面の切り替え設定 */}
        <Routes>
          <Route path="/" element={<History />} />
          <Route path="/cosme" element={<CosmeRegister />} />
          <Route path="/post" element={<PostNew />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;