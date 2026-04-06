import React from 'react';
import { Sparkles, Database, Server, Component, Smartphone, ChevronLeft } from 'lucide-react';
import logoImg from '../assets/images/logo01.webp';

interface Props {
    onBack?: () => void;
}

export const PortfolioExplanation: React.FC<Props> = ({ onBack }) => {
    return (
        <div className="p-8 md:p-12 lg:p-16 max-w-2xl mx-auto space-y-12 animate-in fade-in duration-1000 bg-white min-h-screen">
            {/* モバイル用戻るボタン */}
            {onBack && (
                <button 
                    onClick={onBack}
                    className="lg:hidden flex items-center gap-2 text-slate-500 font-bold mb-4 hover:text-slate-800 transition-colors"
                >
                    <ChevronLeft size={20} />
                    <span>Back to App</span>
                </button>
            )}

            {/* ヘッダーエリア */}
            <header className="space-y-6">
                <div className="flex flex-col items-start gap-4">
                    <span className="px-3 py-1 bg-pink-50 text-pink-500 font-bold tracking-widest text-[10px] rounded-full uppercase">
                        Portfolio Project
                    </span>
                </div>
                <div>
                    <div className="flex items-center gap-4">
                        <img src={logoImg} alt="MakeLabo Logo" className="h-12 object-contain" />
                        <h1 className="text-4xl lg:text-5xl font-black text-slate-600 leading-tight">
                            MakeLabo
                        </h1>
                    </div>
                    <span className="block text-[15px] font-bold text-slate-400 mt-2">Personal Makeup Research App</span>
                </div>
                <p className="text-slate-500 leading-relaxed pt-2">
                    「あの日のメイク、どうやったっけ？」<br />
                    そう思ったこと、ありませんか？<br /><br />
                    元ヘアメイクアーティストが作った、メイク好きのための記録・管理アプリです。<br /><br />
                    '美しい' には理由がある。<br /><br />
                    「メイクをレシピ化する思考」を、毎日のメイクに取り入れてみてください。
                </p>
            </header>

            <div className="w-16 h-1 bg-pink-100 rounded-full" />

            {/* コンセプト */}
            <section className="space-y-6">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Sparkles className="text-pink-400" size={24} />
                    Concept
                </h2>
                
                <div className="space-y-4">
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-lg transition-all duration-300">
                        <h3 className="text-base font-black text-pink-500 mb-2.5 flex items-center gap-2.5 tracking-tight">
                            <span className="w-1.5 h-4 bg-pink-400 rounded-full" />
                            毎日のメイクが「研究データ」に
                        </h3>
                        <p className="text-slate-500 leading-relaxed text-[13px] pl-4">
                            記録を続けるうちに、自分に似合う色の組み合わせや、コンディション別の最適アイテムが自然と見えてきます。<br />
                            なんとなくうまくいった日も、褒められた日も、ちゃんと再現できるように。
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-lg transition-all duration-300">
                        <h3 className="text-base font-black text-pink-500 mb-2.5 flex items-center gap-2.5 tracking-tight">
                            <span className="w-1.5 h-4 bg-pink-400 rounded-full" />
                            色の感覚が、ちゃんと言葉になる
                        </h3>
                        <p className="text-slate-500 leading-relaxed text-[13px] pl-4">
                            「なんか青みっぽい」で終わらせない。<br />MakeLaboはPCCS体系をベースにした、感覚的にわかりやすい色の言葉で表示されます。<br />
                            使い続けるうちに、自然と色のトーンや特性に詳しくなれます。
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-lg transition-all duration-300">
                        <h3 className="text-base font-black text-pink-500 mb-2.5 flex items-center gap-2.5 tracking-tight">
                            <span className="w-1.5 h-4 bg-pink-400 rounded-full" />
                            その日の色が、一目でわかる
                        </h3>
                        <p className="text-slate-500 leading-relaxed text-[13px] pl-4">
                            使ったコスメの色をカラーチップとしてまとめて表示。<br />
                            「なんかまとまりがあったな」「今日はコントラストが強かったな」が、感覚じゃなくて色として確認できます。
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-lg transition-all duration-300">
                        <h3 className="text-base font-black text-pink-500 mb-2.5 flex items-center gap-2.5 tracking-tight">
                            <span className="w-1.5 h-4 bg-pink-400 rounded-full" />
                            コスメじゃなく、全身を記録できる
                        </h3>
                        <p className="text-slate-500 leading-relaxed text-[13px] pl-4">
                            服もアクセサリーもピン留めOK。<br />
                            その日のトータルコーデをまるごと残せるので、「あのワンピースに合わせたメイク」も迷わず引き出せます。
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-lg transition-all duration-300">
                        <h3 className="text-base font-black text-pink-500 mb-2.5 flex items-center gap-2.5 tracking-tight">
                            <span className="w-1.5 h-4 bg-pink-400 rounded-full" />
                            持っているコスメを、ちゃんと把握できる
                        </h3>
                        <p className="text-slate-500 leading-relaxed text-[13px] pl-4">
                            増え続けるコスメ、全部把握できていますか？<br />
                            カテゴリ別に整理できるのはもちろん、所有コスメの色の傾向もカラーチップ表示で一目瞭然。<br />「私、ピンク系ばっかり持ってるな」「オレンジ系が意外と少ない」etc...<br />感覚じゃなくてデータでわかります。次に買うべきアイテムを、なんとなくじゃなく根拠を持って選べるように。
                        </p>
                    </div>

                    <div className="p-8 text-center">
                        <p className="text-pink-500 text-lg font-bold md:text-base leading-relaxed tracking-wide">
                            MakeLaboは、メイクを"なんとなく"から<br />"わかって楽しむ"に変えるアプリです。
                        </p>
                    </div>
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
