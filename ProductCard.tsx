import React, { useState } from 'react';
import {
  Barcode,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  Store,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { ProductItem } from '../types/inventory';

interface ProductCardProps {
  product: ProductItem;
  categories: string[];
  index: number;
  onUpdate: (id: string, updates: Partial<ProductItem>) => void;
  onDelete: (id: string) => void;
  onAddNewCategory: (newCategory: string) => void;
  onRetryLookup?: (id: string, barcode: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  categories,
  index,
  onUpdate,
  onDelete,
  onAddNewCategory,
  onRetryLookup,
}) => {
  const [showSecondaryFields, setShowSecondaryFields] = useState<boolean>(false);
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  const isSearching = product.lookupStatus === 'searching';
  const isGeneric = product.isGeneric || product.name.startsWith(`Producto ${product.barcode}`);

  // Direct client-side lookup trigger on reload icon
  const handleSingleProductRetry = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSearching) return;

    if (onRetryLookup) {
      onRetryLookup(product.id, product.barcode);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setIsAddingCategory(true);
      return;
    }
    onUpdate(product.id, { category: val });
  };

  const handleSaveNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (clean) {
      onAddNewCategory(clean);
      onUpdate(product.id, { category: clean });
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleCleanName = () => {
    let clean = product.name.trim();
    // Capitalize words nicely and strip double spaces
    clean = clean
      .toLowerCase()
      .replace(/(?:^|\s|\/|-)\S/g, (match) => match.toUpperCase())
      .replace(/\s+/g, ' ');
    onUpdate(product.id, { name: clean, isEdited: true });
  };

  return (
    <div
      className={`bg-zinc-900 border rounded-2xl p-4 sm:p-5 shadow-lg transition duration-200 space-y-4 ${
        isGeneric
          ? 'border-amber-500/40 bg-zinc-900/95'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Top Header Row with Barcode & Status Badge */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800">
            <Barcode className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold tracking-wider text-emerald-300">
              {product.barcode}
            </span>
          </div>

          {/* AI Lookup Status Indicator */}
          {isSearching ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/80 text-blue-300 border border-blue-700/60 text-[11px] font-semibold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              Buscando con IA...
            </span>
          ) : isGeneric ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-600/50 text-[11px] font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Nombre genérico
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 text-[11px] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Identificado con IA
            </span>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(product.id)}
          className="p-2 text-zinc-400 hover:text-red-400 active:text-red-400 rounded-lg hover:bg-zinc-800 transition"
          title="Eliminar producto de la cola"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Editable Product Name with Clean Button and Minimalist Icon-Only Retry Button */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            Nombre del Producto
            {product.isEdited && (
              <span className="text-[10px] text-amber-400 font-normal">(editado manualmente)</span>
            )}
          </label>
          <button
            type="button"
            onClick={handleCleanName}
            className="text-[11px] text-zinc-400 hover:text-emerald-400 transition"
            title="Formatear Mayúsculas"
          >
            Formatear texto
          </button>
        </div>

        {/* Input alongside Minimalist 🔄 Reload Icon Button */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={product.name}
            disabled={isSearching}
            onChange={(e) => onUpdate(product.id, { name: e.target.value, isEdited: true })}
            placeholder="Ej: Galletitas Dulces Oreo 118g"
            className="flex-1 px-3.5 py-3 rounded-xl bg-zinc-950 border border-zinc-700/90 focus:border-emerald-500 text-sm font-semibold text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          {/* Minimalist Retry Button: Contains ONLY the reload icon (🔄) without text */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onRetryLookup) {
                onRetryLookup(product.id, product.barcode);
              } else {
                handleSingleProductRetry(e);
              }
            }}
            disabled={isSearching}
            aria-label="Reintentar búsqueda con IA"
            title="Reintentar búsqueda con IA para este código de barras"
            className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center transition active:scale-90 border shadow-sm ${
              isSearching
                ? 'bg-zinc-800/80 border-zinc-700 text-emerald-400 cursor-wait'
                : isGeneric
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/60'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${isSearching ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        <p className="text-[11px] text-zinc-500">
          Usa <strong className="text-zinc-400">🔄</strong> para reintentar la búsqueda con IA o edita el texto directamente.
        </p>
      </div>

      {/* Category / Pasillo Dropdown Selection */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-emerald-400" />
          Categoría / Pasillo
        </label>

        {!isAddingCategory ? (
          <div className="relative">
            <select
              value={product.category}
              onChange={handleCategoryChange}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 focus:border-emerald-500 text-sm font-medium text-white focus:outline-none appearance-none cursor-pointer pr-10"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option disabled>──────────</option>
              <option value="__ADD_NEW__" className="text-emerald-400 font-bold">
                + Agregar nuevo pasillo / categoría...
              </option>
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        ) : (
          <form onSubmit={handleSaveNewCategory} className="flex gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Nombre del nuevo pasillo (ej: Bebidas)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-emerald-500 text-sm text-white focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold active:scale-95"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setIsAddingCategory(false)}
              className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>

      {/* Fixed Authorship Labels Requirement */}
      <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 font-mono">
          <Store className="w-3 h-3 text-zinc-500" />
          userName: <strong className="text-zinc-200">{product.userName}</strong>
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 font-mono">
          addedByDeviceId: <strong className="text-zinc-200">{product.addedByDeviceId}</strong>
        </span>
      </div>

      {/* Depos Secondary Defaults Compatibility Accordion */}
      <div className="pt-2 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => setShowSecondaryFields(!showSecondaryFields)}
          className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 py-1"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Campos secundarios para Depos (valores por defecto 0 y "")
          </span>
          {showSecondaryFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showSecondaryFields && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs">
            <div>
              <span className="block text-[10px] text-zinc-500 mb-1">Stock (0)</span>
              <input
                type="number"
                min="0"
                value={product.stock}
                onChange={(e) => onUpdate(product.id, { stock: Number(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono"
              />
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 mb-1">Precio Venta (0)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={product.price}
                onChange={(e) => onUpdate(product.id, { price: Number(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono"
              />
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 mb-1">Stock Mínimo (0)</span>
              <input
                type="number"
                min="0"
                value={product.minStock}
                onChange={(e) => onUpdate(product.id, { minStock: Number(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono"
              />
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 mb-1">Alerta Mín. (0)</span>
              <input
                type="number"
                min="0"
                value={product.alertStockMin}
                onChange={(e) => onUpdate(product.id, { alertStockMin: Number(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
