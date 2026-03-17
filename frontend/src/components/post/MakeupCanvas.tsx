import React, { useRef, useState } from 'react';
import type { PinItem } from '../../types/recipe';

interface Props {
    imageUrl: string;
    pins: PinItem[];
    onAddPin: (x: number, y: number) => void;
    onSelectPin: (id: string) => void;
    onMovePin: (id: string, x: number, y: number) => void;
    selectedPinId: string | null;
}

export const MakeupCanvas = ({ imageUrl, pins, onAddPin, onSelectPin, onMovePin, selectedPinId }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const handleClick = (e: React.MouseEvent) => {
        // 画像上のクリックのみ新規ピン追加。ピンのクリック等には反応させない
        if ((e.target as HTMLElement).tagName !== 'IMG') return;
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        // クリック位置を画像内の%座標に変換
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        onAddPin(x, y);
    };

    const [hasMoved, setHasMoved] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDraggingId(id);
        setHasMoved(false);
        setStartPos({ x: e.clientX, y: e.clientY });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!draggingId || draggingId !== e.currentTarget.id) return;
        if (!containerRef.current) return;

        // 微小な移動はドラッグとみなさない（誤操作防止）
        const dist = Math.sqrt(Math.pow(e.clientX - startPos.x, 2) + Math.pow(e.clientY - startPos.y, 2));
        if (dist > 3) setHasMoved(true);

        const rect = containerRef.current.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        onMovePin(draggingId, x, y);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (draggingId === e.currentTarget.id) {
            e.currentTarget.releasePointerCapture(e.pointerId);
            // 動いていない場合のみ詳細を開く
            if (!hasMoved) {
                onSelectPin(draggingId);
            }
            setDraggingId(null);
        }
    };

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            className="relative inline-block w-full overflow-hidden rounded-3xl shadow-inner bg-slate-100 touch-none"
        >
            <img
                src={imageUrl}
                alt="Makeup Map"
                className="aspect-[3/4] object-cover w-full h-auto cursor-crosshair block pointer-events-auto"
            />

            {/* ピンの描画 */}
            {pins.map((pin) => (
                <div
                    key={pin.id}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                >
                    {/* ピン本体 */}
                    <button
                        id={pin.id}
                        onPointerDown={(e) => handlePointerDown(e, pin.id)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onClick={(e) => e.stopPropagation()}
                        className={`
                            w-4 h-4 rounded-full border-2 shadow-lg transition-all cursor-move
                            ${selectedPinId === pin.id
                                ? 'bg-pink-500 border-white scale-125 z-10'
                                : pin.isDefault && !pin.items?.some((i: any) => i.brand || i.name || i.masterMemo || i.usageMemo)
                                    ? 'bg-gray-400 border-white hover:bg-slate-400'
                                    : 'bg-white/90 border-pink-500 hover:bg-white border-2'}
                            ${pin.isHidden ? 'opacity-40 border-dashed' : ''}
                        `}
                    />

                    {/* ラベルを表示 */}
                    {pin.label && (
                        <span className="mt-1 px-1.5 py-0.5 bg-slate-800/60 text-white text-[9px] rounded-full backdrop-blur-sm pointer-events-none uppercase whitespace-nowrap">
                            {pin.label} {pin.isHidden ? '(非表示)' : ''}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};