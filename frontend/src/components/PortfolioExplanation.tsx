import React from 'react';
import { Sparkles, Palette, Database, Server, Component, Smartphone } from 'lucide-react';

export const PortfolioExplanation: React.FC = () => {
    return (
        <div className="p-12 lg:p-16 max-w-2xl mx-auto space-y-12 animate-in fade-in duration-1000">
            {/* ヘッダーエリア */}
            <header className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-pink-50 text-pink-500 font-bold tracking-widest text-[10px] rounded-full uppercase">
                        Portfolio Project
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-black text-slate-800 tracking-tight leading-tight">
                    MakeLabo
                    <span className="block text-xl font-bold text-slate-400 mt-2">Personal Makeup Research App</span>
                </h1>
                <p className="text-slate-500 leading-relaxed pt-4">
                    美容部員としての経験から生まれた、「本当に使える」メイクアップ記録・管理アプリケーション。
                    使用したコスメ、レシピ、そして顔のパーツごとのテクニックを直感的に記録できるプラットフォームです。
                </p>
            </header>

            <div className="w-16 h-1 bg-pink-100 rounded-full" />

            {/* コンセプト */}
            <section className="space-y-6">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Sparkles className="text-pink-400" size={24} />
                    Concept & Design
                </h2>
                <div className="bg-slate-50 rounded-3xl p-8 space-y-4 border border-slate-100/50">
                    <p className="text-slate-600 leading-relaxed text-sm">
                        「コスメ図鑑」として手持ちのアイテムを管理するだけでなく、それらをキャンバス上で「どこに・どう塗ったか」ピン留めしてレシピ化できるのが最大の特徴です。<br /><br />
                        デザイン面では、大手コスメブランドのデジタルプラットフォームを意識。<b>清潔感のある白・ベージュを基調としたグラスモーフィズムデザイン</b>を採用し、ユーザーが毎日のメイク記録を楽しめるようなマイクロインタラクション（アニメーション）を随所に散りばめています。
                    </p>
                </div>
            </section>

            {/* 技術スタック */}
            <section className="space-y-6">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Server className="text-pink-400" size={24} />
                    System Architecture
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-3xl border border-slate-100 bg-white hover:shadow-lg transition-all duration-300">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-blue-500">
                            <Smartphone size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800 mb-2">Frontend</h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-3">
                            React (Vite) / TypeScript / TailwindCSS<br />
                            SPAとして高速な画面遷移を実現。PWA化も視野に入れたモバイルファースト設計。
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded-full">React Router</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded-full">Lucide Icons</span>
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl border border-slate-100 bg-white hover:shadow-lg transition-all duration-300">
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-4 text-amber-500">
                            <Database size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800 mb-2">Backend & API</h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-3">
                            FastAPI (Python) / SQLAlchemy / MySQL<br />
                            AWS EC2上に構築されたセキュアなRESTful API。PCCS色彩理論を用いた色相・トーンの自動判定アルゴリズムを実装。
                        </p>
                        <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded-full">Pydantic</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded-full">JWT Auth</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* AWSインフラ */}
            <section className="space-y-6">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Component className="text-pink-400" size={24} />
                    AWS Infrastructure
                </h2>
                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100/50">
                    <ul className="space-y-4 text-sm text-slate-600">
                        <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full mt-1.5 flex-shrink-0" />
                            <div>
                                <strong className="text-slate-800 block mb-0.5">AWS Amplify (Frontend Hosting)</strong>
                                CI/CDパイプラインを構築し、Gitへのpushで本番環境へ自動デプロイされる仕組み。
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full mt-1.5 flex-shrink-0" />
                            <div>
                                <strong className="text-slate-800 block mb-0.5">Elastic Beanstalk (Backend Hosting)</strong>
                                Nginx + Uvicorn構成によるPython APIサーバー。スケーラビリティを担保。
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full mt-1.5 flex-shrink-0" />
                            <div>
                                <strong className="text-slate-800 block mb-0.5">CloudFront (Secure Proxy)</strong>
                                HTTPSエンドポイントを提供し、ブラウザのMixed Contentエラーを回避する構成。
                            </div>
                        </li>
                    </ul>
                </div>
            </section>

            {/* フッター */}
            <footer className="pt-8 pb-12 border-t border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Thank you for viewing my portfolio.
                </p>
            </footer>
        </div>
    );
};
