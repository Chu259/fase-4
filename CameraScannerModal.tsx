import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  X,
  Zap,
  ZapOff,
  RefreshCw,
  Volume2,
  VolumeX,
  AlertCircle,
  Compass,
  CheckCircle2,
  Loader2,
  ListFilter,
  Layers,
} from 'lucide-react';
import { scanBarcodeFromVideo, triggerHapticFeedback, playScanSound } from '../utils/barcodeReader';

interface ScannedPreviewItem {
  barcode: string;
  name?: string;
  timestamp: number;
  status: 'searching' | 'done';
}

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
  existingBarcodes?: Set<string>;
  sessionItems?: ScannedPreviewItem[];
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
  existingBarcodes = new Set(),
  sessionItems = [],
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isScanningActive = useRef<boolean>(false);
  const lastScannedCode = useRef<string | null>(null);
  const lastScannedTime = useRef<number>(0);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastDetected, setLastDetected] = useState<{ code: string; isDuplicate: boolean } | null>(null);
  const [localSessionScans, setLocalSessionScans] = useState<string[]>([]);

  const stopCamera = useCallback(() => {
    isScanningActive.current = false;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setHasPermission(true);

      const track = stream.getVideoTracks()[0];
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      setHasTorch(Boolean(capabilities?.torch));

      isScanningActive.current = true;
      scanLoop();
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Permiso de cámara denegado. Habilita los permisos en la barra de direcciones de tu navegador.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No se encontró ninguna cámara.');
      } else {
        setErrorMessage(err.message || 'Error al iniciar la cámara.');
      }
    }
  }, [facingMode, stopCamera]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch control not supported:', err);
      }
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const scanLoop = useCallback(async () => {
    if (!isScanningActive.current || !videoRef.current) return;

    if (videoRef.current.readyState >= 2) {
      try {
        // Omnidirectional scanning with multi-angle rotation
        const code = await scanBarcodeFromVideo(videoRef.current);
        if (code) {
          const now = Date.now();
          // Debounce identical code within 2 seconds
          if (code !== lastScannedCode.current || now - lastScannedTime.current > 2000) {
            lastScannedCode.current = code;
            lastScannedTime.current = now;

            const isDuplicate = existingBarcodes.has(code) || localSessionScans.includes(code);
            setLastDetected({ code, isDuplicate });
            setLocalSessionScans((prev) => [code, ...prev.filter((c) => c !== code)]);

            if (soundEnabled) playScanSound();
            triggerHapticFeedback([70, 40, 70]);

            // Add immediately to cumulative queue
            onBarcodeDetected(code);
          }
        }
      } catch {
        // Continue
      }
    }

    if (isScanningActive.current) {
      animationFrameId.current = requestAnimationFrame(scanLoop);
    }
  }, [existingBarcodes, localSessionScans, soundEnabled, onBarcodeDetected]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
      setLocalSessionScans([]);
    } else {
      stopCamera();
      setLastDetected(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none">
      {/* Top Bar with Omnidirectional Indicator */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/95 via-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50">
            <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              360° Omnidireccional
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-full backdrop-blur-md border ${
                torchOn ? 'bg-amber-500 text-black border-amber-400' : 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
              }`}
              title="Linterna"
            >
              {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-full bg-zinc-800/80 backdrop-blur-md text-zinc-300 border border-zinc-700"
            title="Sonido de escaneo"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
          </button>

          <button
            onClick={toggleFacingMode}
            className="p-2.5 rounded-full bg-zinc-800/80 backdrop-blur-md text-zinc-300 border border-zinc-700"
            title="Cambiar Cámara"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-zinc-800/90 backdrop-blur-md text-zinc-100 border border-zinc-600 active:scale-95"
            title="Cerrar escáner"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Omnidirectional 360 Framing Box */}
        <div className="relative z-10 w-72 h-72 sm:w-80 sm:h-80 rounded-3xl border-2 border-emerald-500/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none flex flex-col justify-between p-3.5">
          {/* Omnidirectional Crosshair and Circle */}
          <div className="absolute inset-4 rounded-2xl border border-dashed border-emerald-400/40 pointer-events-none" />

          {/* Central laser scanning sweep */}
          <div className="absolute left-3 right-3 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_16px_#10b981] animate-[scanner_2.2s_ease-in-out_infinite]" />

          {/* Corner Framing Marks */}
          <div className="flex justify-between">
            <div className="w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl -mt-4 -ml-4" />
            <div className="w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl -mt-4 -mr-4" />
          </div>
          <div className="flex justify-between">
            <div className="w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl -mb-4 -ml-4" />
            <div className="w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl -mb-4 -mr-4" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400/60 bg-black/40 px-2 py-0.5 rounded">
              Cualquier ángulo 360°
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {hasPermission === false && (
          <div className="relative z-30 max-w-xs mx-4 p-5 rounded-2xl bg-zinc-900/95 border border-red-500/40 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h4 className="font-semibold text-white text-base mb-1">Acceso a Cámara</h4>
            <p className="text-zinc-400 text-xs mb-4">{errorMessage || 'No se pudo acceder a la cámara.'}</p>
            <button
              onClick={startCamera}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-medium text-sm active:bg-emerald-500"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Detection Feedback Badge */}
        {lastDetected && (
          <div className="absolute top-4 z-20 px-4 py-2 rounded-full bg-emerald-950/95 border border-emerald-400/80 backdrop-blur-md flex items-center gap-2 animate-bounce shadow-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-white font-mono font-bold tracking-wider">
              {lastDetected.code}
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
              ¡Agregado a la cola!
            </span>
          </div>
        )}
      </div>

      {/* Cumulative Scan Queue Bottom Drawer (Stay in camera while scanning!) */}
      <div className="relative z-20 p-4 bg-gradient-to-t from-black via-zinc-950/95 to-transparent flex flex-col gap-3">
        {/* Scanned Items Mini Carousel */}
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cola acumulada:</span>
            <strong className="text-white font-mono bg-zinc-800 px-2 py-0.5 rounded-full">
              {localSessionScans.length} en sesión
            </strong>
          </div>
          <span className="text-[11px] text-zinc-500">Continúa apuntando para seguir escaneando</span>
        </div>

        {/* Horizontal Mini Tags of Scanned Codes */}
        {localSessionScans.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {localSessionScans.slice(0, 8).map((scannedCode, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-emerald-500/40 text-emerald-300 font-mono text-xs whitespace-nowrap shadow-sm"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span>{scannedCode}</span>
              </div>
            ))}
          </div>
        )}

        {/* Big Touch-Friendly Button to Finish and Review */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm active:scale-98 transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Listo, ver y clasificar cola ({localSessionScans.length})</span>
        </button>
      </div>

      <style>{`
        @keyframes scanner {
          0% { top: 6px; opacity: 0.9; }
          50% { top: calc(100% - 10px); opacity: 1; }
          100% { top: 6px; opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};
