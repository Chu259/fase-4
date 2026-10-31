import React, { useState } from 'react';
import { Keyboard, X, Search, Check, Sparkles } from 'lucide-react';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (barcode: string) => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = barcodeInput.trim().replace(/\s+/g, '');
    if (!clean) {
      setError('Por favor ingresa un número de código');
      return;
    }
    if (clean.length < 3) {
      setError('El código debe tener al menos 3 dígitos');
      return;
    }

    onSubmit(clean);
    setBarcodeInput('');
    setError(null);
    onClose();
  };

  const handleDigitClick = (digit: string) => {
    setBarcodeInput((prev) => prev + digit);
    setError(null);
  };

  const handleBackspace = () => {
    setBarcodeInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setBarcodeInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Ingreso Manual de Código</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Número de Código de Barras (EAN-13 / UPC / SKU)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                placeholder="Ej. 7791234567890"
                value={barcodeInput}
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  setError(null);
                }}
                className="w-full px-4 py-3.5 bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-2xl text-lg font-mono font-bold text-white placeholder:text-zinc-600 focus:outline-none tracking-wider text-center"
              />
              {barcodeInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 rounded-lg"
                >
                  Borrar
                </button>
              )}
            </div>
            {error && <p className="text-xs text-red-400 mt-1.5 text-center">{error}</p>}
            <p className="text-[11px] text-zinc-500 mt-1.5 text-center">
              Dígitos: {barcodeInput.replace(/\s+/g, '').length} (EAN-13 estándar tiene 13 dígitos)
            </p>
          </div>

          {/* Quick On-Screen Number Pad for Mobile Ease */}
          <div className="grid grid-cols-3 gap-2 pt-1 select-none">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitClick(digit)}
                className="py-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-white font-mono text-lg font-semibold active:scale-95 transition"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="py-3 rounded-xl bg-zinc-800/40 text-zinc-400 font-mono text-xs font-semibold active:scale-95"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleDigitClick('0')}
              className="py-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-white font-mono text-lg font-semibold active:scale-95 transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 rounded-xl bg-zinc-800/40 text-amber-300 font-mono text-xs font-bold active:scale-95"
            >
              ⌫
            </button>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-sm active:bg-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!barcodeInput.trim()}
              className="flex-[2] py-3.5 rounded-xl bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Buscar con IA</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
