import React, { useState } from 'react';
import {
  Download,
  Share2,
  Copy,
  Check,
  X,
  FileCode,
  FileText,
  ShieldCheck,
  Layers,
  Calendar,
} from 'lucide-react';
import { ProductItem, DeposExportFile, FIXED_METADATA } from '../types/inventory';
import { generateChangelogPDF } from '../utils/pdfGenerator';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  products,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [shared, setShared] = useState<boolean>(false);

  if (!isOpen) return null;

  const nowIso = new Date().toISOString();

  // Clean products for the final export ensuring all secondary fields are valid
  const cleanedProducts = products.map((p) => ({
    id: p.id,
    barcode: p.barcode,
    name: p.name || `Producto ${p.barcode}`,
    category: p.category || 'Pasillo 1',
    price: typeof p.price === 'number' ? p.price : 0,
    costPrice: typeof p.costPrice === 'number' ? p.costPrice : 0,
    stock: typeof p.stock === 'number' ? p.stock : 0,
    minStock: typeof p.minStock === 'number' ? p.minStock : 0,
    alertStockMin: typeof p.alertStockMin === 'number' ? p.alertStockMin : 0,
    sku: p.sku || '',
    description: p.description || '',
    unit: p.unit || 'u',
    brand: p.brand || '',
    userName: FIXED_METADATA.userName,
    addedByUserName: FIXED_METADATA.userName,
    addedByDeviceId: FIXED_METADATA.deviceId,
    timestamp: p.timestamp || nowIso,
  }));

  const exportPayload: DeposExportFile = {
    version: FIXED_METADATA.version,
    storeCode: FIXED_METADATA.storeCode,
    role: FIXED_METADATA.role,
    deviceId: FIXED_METADATA.deviceId,
    deviceName: FIXED_METADATA.deviceName,
    userName: FIXED_METADATA.userName,
    userRole: FIXED_METADATA.userRole,
    timestamp: nowIso,
    products: cleanedProducts,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const fileName = `captura_gerencia_${FIXED_METADATA.storeCode}_${nowIso.slice(0, 10)}.json`;

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File([jsonString], fileName, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Captura Gerencia ${FIXED_METADATA.storeCode}`,
            text: `Inventario capturado por Gerencia (${products.length} productos)`,
            files: [file],
          });
        } else {
          await navigator.share({
            title: `Captura Gerencia ${FIXED_METADATA.storeCode}`,
            text: jsonString,
          });
        }
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">Exportación JSON para Depos</h3>
              <p className="text-xs text-zinc-400">Estructura oficial versión 3 (Gerencia)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-800 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata summary bar */}
        <div className="px-5 py-3 bg-zinc-950/60 border-b border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-zinc-400">
          <div>
            <span className="text-zinc-500 block">Tienda:</span>
            <strong className="text-zinc-200 font-mono">{FIXED_METADATA.storeCode}</strong>
          </div>
          <div>
            <span className="text-zinc-500 block">Dispositivo:</span>
            <strong className="text-zinc-200 font-mono">{FIXED_METADATA.deviceId}</strong>
          </div>
          <div>
            <span className="text-zinc-500 block">Usuario:</span>
            <strong className="text-zinc-200 font-mono">{FIXED_METADATA.userName}</strong>
          </div>
          <div>
            <span className="text-zinc-500 block">Total Ítems:</span>
            <strong className="text-emerald-400 font-mono">{products.length} productos</strong>
          </div>
        </div>

        {/* JSON Preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-950 font-mono text-xs">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] pb-2 border-b border-zinc-800 mb-2">
            <span>VISTA PREVIA DEL ARCHIVO</span>
            <span>{fileName}</span>
          </div>
          <pre className="text-emerald-300/90 whitespace-pre-wrap break-all select-all leading-relaxed">
            {jsonString}
          </pre>
        </div>

        {/* Actions bar */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row gap-2.5">
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none py-3 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={() => generateChangelogPDF()}
              title="Descargar reporte PDF de todos los cambios implementados"
              className="flex-1 sm:flex-none py-3 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-zinc-700 active:scale-95 transition"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>PDF Cambios</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleShare}
                className="flex-1 sm:flex-none py-3 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                {shared ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span>Compartir</span>
              </button>
            )}
          </div>

          <button
            onClick={handleDownload}
            className="flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition shadow-lg shadow-emerald-950"
          >
            <Download className="w-5 h-5" />
            <span>Descargar Archivo JSON ({products.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
