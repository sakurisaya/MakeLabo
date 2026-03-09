export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        if (!url.startsWith('blob:') && !url.startsWith('data:')) {
            image.setAttribute('crossOrigin', 'anonymous');
        }
        image.src = url;
    });

export default async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return '';
    }

    // Limit output size to prevent Data URLs from being too large for localStorage
    const MAX_WIDTH = 1200;
    let targetWidth = pixelCrop.width;
    let targetHeight = pixelCrop.height;

    if (targetWidth > MAX_WIDTH) {
        const scale = MAX_WIDTH / targetWidth;
        targetWidth = MAX_WIDTH;
        targetHeight = targetHeight * scale;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // 1. Draw blurred background covering the canvas
    ctx.filter = 'blur(15px) brightness(1.1)';

    // Scale image to cover canvas
    const imgRatio = image.width / image.height;
    const canvasRatio = canvas.width / canvas.height;

    let drawW, drawH, drawX, drawY;

    if (imgRatio < canvasRatio) {
        drawW = canvas.width;
        drawH = canvas.width / imgRatio;
    } else {
        drawH = canvas.height;
        drawW = canvas.height * imgRatio;
    }

    drawX = (canvas.width - drawW) / 2;
    drawY = (canvas.height - drawH) / 2;

    ctx.drawImage(image, drawX, drawY, drawW, drawH);

    // 2. Draw actual cropped Foreground image
    ctx.filter = 'none';

    // Parts outside the bounding box will just result in transparency -> which leaves the blurred background showing
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return canvas.toDataURL('image/jpeg', 0.8);
}
