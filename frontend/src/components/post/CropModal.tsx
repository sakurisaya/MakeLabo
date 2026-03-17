import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';

interface CropModalProps {
    imageUrl: string;
    onClose: () => void;
    onComplete: (croppedUrl: string) => void;
}

export const CropModal: React.FC<CropModalProps> = ({ imageUrl, onClose, onComplete }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirm = async () => {
        try {
            if (!croppedAreaPixels) return;
            const croppedImage = await getCroppedImg(
                imageUrl,
                croppedAreaPixels
            );
            onComplete(croppedImage);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm p-4 pb-24 h-screen w-screen justify-center animate-in fade-in duration-300">

            <div className="relative flex-1 w-full max-w-lg mx-auto h-[70vh] rounded-3xl overflow-hidden bg-black shadow-2xl">
                <Cropper
                    image={imageUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={3 / 4}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    restrictPosition={false} // Allow shrinking image by dragging out
                    objectFit="contain"
                    cropSize={{ width: 300, height: 400 }} // You can adjust this for default visual size
                    showGrid={true}
                    style={{
                        containerStyle: {
                            borderRadius: '1.5rem',
                        }
                    }}
                />
            </div>

            <div className="mt-6 flex flex-col gap-4 max-w-lg mx-auto w-full px-4">
                <div className="flex items-center gap-4 text-white">
                    <span className="text-xl">🔍</span>
                    <input
                        type="range"
                        value={zoom}
                        min={0.5}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => {
                            setZoom(Number(e.target.value));
                        }}
                        className="w-full form-range accent-pink-500"
                    />
                </div>

                <div className="flex justify-between gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-2xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-3.5 rounded-2xl font-bold bg-pink-500 text-white shadow-lg hover:bg-pink-600 transition"
                    >
                        このサイズで決定
                    </button>
                </div>
            </div>
        </div>
    );
};
