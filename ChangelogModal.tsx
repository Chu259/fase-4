import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  Layers,
  Calendar,
} from 'lucide-react';
import { CHANGELOG_DATA } from '../utils/changelogData';
import { generateChangelogPDF } from '../utils/pdfGenerator';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    setDownloadSuccess(false);
    try {
      const ok = await generateChangelogPDF();
      if (ok) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3500);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const textLines: string[] = [
      'CAPTURADOR GERENCIA - BITÁCORA DE CAMBIOS Y ARQUITECTURA (v3.0)',
      'Tienda: TIENDA-7894 | Dispositivo: dev-gerencia | Usuario: Gerencia',
      '==============================================================',
      '',
    ];

    CHANGELOG_DATA.forEach((sec) => {
      textLines.push(`\n[${sec.title}]`);
      sec.items.forEach((item) => {
        textLines.push(`• ${item.title} ${item.desc}`);
      });
    });

    navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-2xl max-h-[92vh] bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                Registro de Cambios y Arquitectura
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                  v3.0
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Documento técnico oficial de Capturador Gerencia</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Metadata Tag */}
        <div className="px-5 py-2.5 bg-zinc-950/70 border-b border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between font-mono flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auditoría: <strong>Gerencia</strong></span>
            <span>•</span>
            <span>TIENDA-7894</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>{new Date().toLocaleDateString('es-AR')}</span>
          </div>
        </div>

        {/* Modal Scrollable Body: Full Document Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm text-zinc-200">
          {CHANGELOG_DATA.map((section, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <h4 className="text-xs font-black tracking-wide text-white uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  {section.title}
                </h4>
                {section.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    {section.badge}
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="text-xs leading-relaxed">
                    <p className="font-bold text-zinc-100 flex items-center gap-1.5">
                      <span className="text-emerald-400 font-mono">▸</span>
                      {item.title}
                    </p>
                    <p className="text-zinc-400 pl-4 pt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions: Download PDF, Print, Copy */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-2.5">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyText}
              className="flex-1 sm:flex-none py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition border border-zinc-700/80"
              title="Copiar texto del documento"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition border border-zinc-700/80"
              title="Imprimir documento o Guardar como PDF del sistema"
            >
              <Printer className="w-4 h-4 text-zinc-300" />
              <span>Imprimir / Guardar</span>
            </button>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 active:scale-98 transition shadow-lg shadow-emerald-950 disabled:opacity-50"
          >
            <Download className={`w-5 h-5 ${isGenerating ? 'animate-bounce' : ''}`} />
            <span>
              {isGenerating
                ? 'Generando PDF...'
                : downloadSuccess
                ? '¡Archivo PDF Descargado!'
                : 'Descargar Archivo PDF (.pdf)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
