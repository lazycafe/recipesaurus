export interface ImageUploadOptions {
  maxFileSizeBytes: number;
  maxDataUrlLength: number;
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

export const COOKBOOK_COVER_IMAGE_OPTIONS: ImageUploadOptions = {
  maxFileSizeBytes: 5 * 1024 * 1024,
  maxDataUrlLength: 750_000,
  maxWidth: 900,
  maxHeight: 900,
  quality: 0.82,
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image. Please try another file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unsupported image format. Please choose a PNG or JPG image.'));
    image.src = dataUrl;
  });
}

function getFittedDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function drawImageToCanvas(
  image: HTMLImageElement,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not prepare image. Please try another file.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

export async function fileToCompressedDataUrl(
  file: File,
  options: ImageUploadOptions
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  if (file.size > options.maxFileSizeBytes) {
    throw new Error('Image must be less than 5MB.');
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const fitted = getFittedDimensions(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    options.maxWidth,
    options.maxHeight
  );

  if (
    originalDataUrl.length <= options.maxDataUrlLength &&
    fitted.width === (image.naturalWidth || image.width) &&
    fitted.height === (image.naturalHeight || image.height)
  ) {
    return originalDataUrl;
  }

  let width = fitted.width;
  let height = fitted.height;
  let bestDataUrl = originalDataUrl;
  const qualities = Array.from(new Set([
    options.quality,
    0.72,
    0.62,
    0.52,
    0.42,
  ])).sort((a, b) => b - a);

  for (let scaleAttempt = 0; scaleAttempt < 5; scaleAttempt += 1) {
    const canvas = drawImageToCanvas(image, width, height);

    for (const quality of qualities) {
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      if (compressedDataUrl.length < bestDataUrl.length) {
        bestDataUrl = compressedDataUrl;
      }
      if (compressedDataUrl.length <= options.maxDataUrlLength) {
        return compressedDataUrl;
      }
    }

    if (width <= 320 && height <= 320) {
      break;
    }

    width = Math.max(1, Math.round(width * 0.78));
    height = Math.max(1, Math.round(height * 0.78));
  }

  if (bestDataUrl.length <= options.maxDataUrlLength) {
    return bestDataUrl;
  }

  throw new Error('Image is too large to save. Please choose a smaller image.');
}
