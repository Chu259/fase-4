/**
 * Client-Side Omnidirectional Barcode Extraction Engine
 * Supports 360-degree all-angle reading (0°, 45°, 90°, 135° rotations)
 * Uses Native BarcodeDetector when available + ZXing multi-rotation fallback.
 *
 * CRITICAL: All processing is strictly local via HTML5 Canvas.
 * Raw images are NEVER transmitted across the network or to AI models.
 */

import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

// Shared ZXing reader instance with all standard retail 1D/2D formats enabled
const hints = new Map<DecodeHintType, any>();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
]);
hints.set(DecodeHintType.TRY_HARDER, true);

const zxingReader = new BrowserMultiFormatReader(hints);

/**
 * Checks if the browser supports the native BarcodeDetector API
 */
export function hasNativeBarcodeDetector(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

// Reusable canvas and context for live video processing
let liveCanvas: HTMLCanvasElement | null = null;
let liveCtx: CanvasRenderingContext2D | null = null;

// Reusable canvas for rotated passes
let rotatedCanvas: HTMLCanvasElement | null = null;
let rotatedCtx: CanvasRenderingContext2D | null = null;

let frameCounter = 0;

/**
 * Rotates an image or canvas by a specific degree onto a target canvas and attempts ZXing decode
 */
async function decodeAtAngle(
  sourceCanvas: HTMLCanvasElement,
  angleDegrees: number
): Promise<string | null> {
  if (angleDegrees === 0) {
    try {
      const result = await zxingReader.decodeFromCanvas(sourceCanvas);
      if (result && result.getText()) return result.getText().trim();
    } catch {
      return null;
    }
  }

  if (!rotatedCanvas) {
    rotatedCanvas = document.createElement('canvas');
    rotatedCtx = rotatedCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!rotatedCtx) return null;

  const rad = (angleDegrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const origW = sourceCanvas.width;
  const origH = sourceCanvas.height;

  const newW = Math.round(origW * cos + origH * sin);
  const newH = Math.round(origW * sin + origH * cos);

  rotatedCanvas.width = newW;
  rotatedCanvas.height = newH;

  rotatedCtx.save();
  rotatedCtx.translate(newW / 2, newH / 2);
  rotatedCtx.rotate(rad);
  rotatedCtx.drawImage(sourceCanvas, -origW / 2, -origH / 2);
  rotatedCtx.restore();

  try {
    const result = await zxingReader.decodeFromCanvas(rotatedCanvas);
    if (result && result.getText()) {
      return result.getText().trim();
    }
  } catch {
    // Rotation pass did not find barcode
  }

  return null;
}

/**
 * Omnidirectional live video scan (0°, 90°, 45°, 135° rotation passes)
 */
export async function scanBarcodeFromVideo(video: HTMLVideoElement): Promise<string | null> {
  if (!video || video.readyState < 2) return null;

  frameCounter++;

  // 1. Native BarcodeDetector (often handles rotated barcodes automatically)
  if (hasNativeBarcodeDetector()) {
    try {
      const DetectorClass = (window as any).BarcodeDetector;
      const detector = new DetectorClass({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'],
      });
      const barcodes = await detector.detect(video);
      if (barcodes && barcodes.length > 0) {
        const value = barcodes[0].rawValue?.trim();
        if (value) return value;
      }
    } catch {
      // Fall through to ZXing
    }
  }

  // 2. Prepare canvas for ZXing omnidirectional analysis
  if (!liveCanvas) {
    liveCanvas = document.createElement('canvas');
    liveCtx = liveCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!liveCtx) return null;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  // Use central square region of interest (ROI) for fast 360-degree rotation
  const minDim = Math.min(vw, vh);
  const cropSize = Math.min(minDim, 720);
  const startX = (vw - cropSize) / 2;
  const startY = (vh - cropSize) / 2;

  // Size optimized for fast 60fps mobile execution
  const targetDim = 480;
  liveCanvas.width = targetDim;
  liveCanvas.height = targetDim;
  liveCtx.drawImage(video, startX, startY, cropSize, cropSize, 0, 0, targetDim, targetDim);

  // Pass 1: 0° (Normal horizontal)
  let code = await decodeAtAngle(liveCanvas, 0);
  if (code) return code;

  // Pass 2: 90° (Vertical barcodes, sideways boxes or rotated phone)
  code = await decodeAtAngle(liveCanvas, 90);
  if (code) return code;

  // Every alternate frame test diagonal angles (45° or 135°) to keep frame rate high
  if (frameCounter % 2 === 0) {
    code = await decodeAtAngle(liveCanvas, 45);
    if (code) return code;
  } else {
    code = await decodeAtAngle(liveCanvas, 135);
    if (code) return code;
  }

  return null;
}

/**
 * Omnidirectional Batch Image Extraction (0°, 90°, 45°, 135° and contrast pass)
 * Strictly local execution, zero network transmission.
 */
export async function decodeBarcodeFromImageFile(
  file: File
): Promise<{ barcode: string | null; error?: string; angle?: number }> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      try {
        // 1. Try Native BarcodeDetector first
        if (hasNativeBarcodeDetector()) {
          try {
            const DetectorClass = (window as any).BarcodeDetector;
            const detector = new DetectorClass({
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'],
            });
            const detected = await detector.detect(img);
            if (detected && detected.length > 0 && detected[0].rawValue) {
              URL.revokeObjectURL(objectUrl);
              resolve({ barcode: detected[0].rawValue.trim(), angle: 0 });
              return;
            }
          } catch {}
        }

        // 2. Base Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve({ barcode: null, error: 'No se pudo crear canvas' });
          return;
        }

        const maxDim = 1200;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        // 3. Omnidirectional rotation passes: 0°, 90°, 45°, 135°, 270°
        const anglesToTest = [0, 90, 45, 135, 270];
        for (const angle of anglesToTest) {
          const res = await decodeAtAngle(canvas, angle);
          if (res) {
            URL.revokeObjectURL(objectUrl);
            resolve({ barcode: res, angle });
            return;
          }
        }

        // 4. Contrast enhancement pass for faded employee photos
        try {
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const binarized = gray > 125 ? 255 : 0;
            data[i] = binarized;
            data[i + 1] = binarized;
            data[i + 2] = binarized;
          }
          ctx.putImageData(imgData, 0, 0);

          for (const angle of [0, 90, 45]) {
            const res = await decodeAtAngle(canvas, angle);
            if (res) {
              URL.revokeObjectURL(objectUrl);
              resolve({ barcode: res, angle });
              return;
            }
          }
        } catch {}

        URL.revokeObjectURL(objectUrl);
        resolve({ barcode: null, error: 'Código de barras no detectado en la foto' });
      } catch (err: any) {
        URL.revokeObjectURL(objectUrl);
        resolve({ barcode: null, error: err?.message || 'Error al procesar foto' });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ barcode: null, error: 'No se pudo cargar la imagen' });
    };

    img.src = objectUrl;
  });
}

/**
 * Triggers haptic feedback on supported mobile devices
 */
export function triggerHapticFeedback(pattern: number[] = [60]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

/**
 * Synthesizes a subtle audio beep for successful barcode scan
 */
export function playScanSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {}
}
