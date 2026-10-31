import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  FileImage,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { decodeBarcodeFromImageFile, triggerHapticFeedback, playScanSound } from '../utils/barcodeReader';

interface BatchItemResult {
  fileName: string;
  previewUrl: string;
  barcode: string | null;
  error?: string;
  manualBarcode?: string;
  status: 'processing' | 'success' | 'failed';
}

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBarcodes: (barcodes: string[]) => void;
}

export const BatchUploadModal: React.FC<BatchUploadModalProps> = ({
  isOpen,
  onClose,
  onAddBarcodes,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [batchResults, setBatchResults] = useState<BatchItemResult[]>([]);

  if (!isOpen) return null;

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setIsProcessing(true);
    setProgress({ current: 0, total: fileList.length });

    const initialResults: BatchItemResult[] = fileList.map((file) => ({
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
      barcode: null,
      status: 'processing',
    }));
    setBatchResults(initialResults);

    const updatedResults = [...initialResults];
    let detectedCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setProgress({ current: i + 1, total: fileList.length });

      try {
        // LOCAL DECODING ONLY - No network, no raw image payload
        const result = await decodeBarcodeFromImageFile(file);
        if (result.barcode) {
          updatedResults[i] = {
            ...updatedResults[i],
            barcode: result.barcode,
            status: 'success',
          };
          detectedCount++;
        } else {
          updatedResults[i] = {
            ...updatedResults[i],
            status: 'failed',
            error: result.error || 'Código no legible en la imagen',
          };
        }
      } catch (err: any) {
        updatedResults[i] = {
          ...updatedResults[i],
          status: 'failed',
          error: err?.message || 'Error de procesamiento',
        };
      }

      setBatchResults([...updatedResults]);
    }

    setIsProcessing(false);
    triggerHapticFeedback([100, 50, 100]);
    if (detectedCount > 0) playScanSound();
  };

  const handleManualCodeChange = (index: number, value: string) => {
    setBatchResults((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        manualBarcode: value.trim(),
        barcode: value.trim() ? value.trim() : null,
        status: value.trim() ? 'success' : 'failed',
      };
      return copy;
    });
  };

  const handleConfirmBatch = () => {
    const validBarcodes = batchResults
      .map((r) => r.manualBarcode || r.barcode)
      .filter((code): code is string => Boolean(code && code.length >= 4));

    if (validBarcodes.length > 0) {
      onAddBarcodes(validBarcodes);
      handleClose();
    }
  };

  const handleClose = () => {
    // Revoke object URLs
    batchResults.forEach((r) => {
      try {
        URL.revokeObjectURL(r.previewUrl);
      } catch {}
    });
    setBatchResults([]);
    setIsProcessing(false);
    onClose();
  };

  const successCount = batchResults.filter((r) => Boolean(r.barcode || r.manualBarcode)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileImage className="w-5 h-5 text-emerald-400" />
              Carga Masiva de Fotos
            </h3>
            <p className="text-xs text-zinc-400">
              Procesa fotos de códigos enviadas por empleados de tienda
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-800/60 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security / Data Saver Badge */}
        <div className="px-5 py-2.5 bg-emerald-950/40 border-b border-emerald-900/30 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-[11px] text-emerald-300 leading-tight">
            <span className="font-semibold">Procesamiento Local Seguro:</span> Las imágenes se analizan exclusivamente en este dispositivo para extraer el número. Nunca se suben fotos a la nube ni a la IA.
          </p>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {batchResults.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-emerald-500/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-zinc-950/40 active:bg-zinc-800/40"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-zinc-200 mb-1">
                Seleccionar fotos desde la galería
              </p>
              <p className="text-xs text-zinc-400 max-w-xs mb-4">
                Puedes seleccionar varias fotos simultáneamente. El algoritmo local escaneará los códigos EAN-13 / UPC al instante.
              </p>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md">
                <Plus className="w-4 h-4" />
                Abrir Galería de Fotos
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Progress Bar when reading */}
              {isProcessing && (
                <div className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/80 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-300 font-medium">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      Extrayendo códigos localmente...
                    </span>
                    <span>
                      {progress.current} de {progress.total}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{
                        width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Status Header */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">
                  Detectados con éxito: <strong className="text-emerald-400">{successCount}</strong> de {batchResults.length}
                </span>
                {!isProcessing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-emerald-400 font-medium hover:underline flex items-center gap-1"
                  >
                    + Agregar más fotos
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {batchResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800/50 border border-zinc-800"
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.fileName}
                      className="w-12 h-12 object-cover rounded-lg bg-zinc-950 flex-shrink-0 border border-zinc-700"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-400 truncate mb-0.5">{item.fileName}</p>

                      {item.status === 'processing' ? (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                          <span>Analizando...</span>
                        </div>
                      ) : item.status === 'success' ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="font-mono text-xs font-bold text-emerald-300">
                            {item.manualBarcode || item.barcode}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>No detectado automáticamente</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Escribe el código manualmente"
                            value={item.manualBarcode || ''}
                            onChange={(e) => handleManualCodeChange(idx, e.target.value)}
                            className="w-full px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold active:bg-zinc-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmBatch}
            disabled={isProcessing || successCount === 0}
            className="flex-[2] py-3 px-4 rounded-xl bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition shadow-lg"
          >
            <span>Buscar {successCount} en IA</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
