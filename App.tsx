import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Camera,
  FolderOpen,
  Keyboard,
  Download,
  Trash2,
  Search,
  Sparkles,
  ShieldCheck,
  Store,
  Smartphone,
  UserCheck,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Loader2,
  FileCode,
  FileText,
  Compass,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

import { ProductItem, DEFAULT_CATEGORIES, FIXED_METADATA } from './types/inventory';
import { CameraScannerModal } from './components/CameraScannerModal';
import { BatchUploadModal } from './components/BatchUploadModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import { ProductCard } from './components/ProductCard';
import { ExportModal } from './components/ExportModal';
import { ChangelogModal } from './components/ChangelogModal';
import { triggerHapticFeedback, playScanSound } from './utils/barcodeReader';
import { searchProductByBarcodeLocally } from './utils/productLookup';
import { generateChangelogPDF } from './utils/pdfGenerator';

const STORAGE_KEY_PRODUCTS = 'capturador_gerencia_products_v3';
const STORAGE_KEY_CATEGORIES = 'capturador_gerencia_categories_v3';

// Sample initial products for warehouse demo
const DEMO_PRODUCTS: ProductItem[] = [
  {
    id: 'demo-1',
    barcode: '7790895000997',
    name: 'Coca Cola Sabor Original 1.5 L',
    category: 'Pasillo 1',
    price: 0,
    costPrice: 0,
    stock: 0,
    minStock: 0,
    alertStockMin: 0,
    sku: '',
    description: '',
    unit: 'u',
    brand: 'Coca Cola',
    userName: 'Gerencia',
    addedByUserName: 'Gerencia',
    addedByDeviceId: 'dev-gerencia',
    timestamp: new Date().toISOString(),
    source: 'gemini-search',
    lookupStatus: 'success',
    isGeneric: false,
  },
  {
    id: 'demo-2',
    barcode: '7622300720445',
    name: 'Galletitas Oreo Original 118g',
    category: 'Pasillo 2',
    price: 0,
    costPrice: 0,
    stock: 0,
    minStock: 0,
    alertStockMin: 0,
    sku: '',
    description: '',
    unit: 'u',
    brand: 'Oreo',
    userName: 'Gerencia',
    addedByUserName: 'Gerencia',
    addedByDeviceId: 'dev-gerencia',
    timestamp: new Date().toISOString(),
    source: 'gemini-search',
    lookupStatus: 'success',
    isGeneric: false,
  },
  {
    id: 'demo-3',
    barcode: '7791290000085',
    name: 'Shampoo Pantene Restauración 400ml',
    category: 'Perfumeria',
    price: 0,
    costPrice: 0,
    stock: 0,
    minStock: 0,
    alertStockMin: 0,
    sku: '',
    description: '',
    unit: 'u',
    brand: 'Pantene',
    userName: 'Gerencia',
    addedByUserName: 'Gerencia',
    addedByDeviceId: 'dev-gerencia',
    timestamp: new Date().toISOString(),
    source: 'gemini-search',
    lookupStatus: 'success',
    isGeneric: false,
  },
];

export default function App() {
  // Persistence state
  const [products, setProducts] = useState<ProductItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEMO_PRODUCTS;
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CATEGORIES;
  });

  // Modal states
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isBatchOpen, setIsBatchOpen] = useState<boolean>(false);
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState<boolean>(false);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODAS');
  const [lookupFeedback, setLookupFeedback] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
    } catch {}
  }, [categories]);

  // Set of existing barcodes for fast duplicate checking
  const existingBarcodesSet = useMemo(() => {
    return new Set(products.map((p) => p.barcode));
  }, [products]);

  // Add new category
  const handleAddNewCategory = (newCat: string) => {
    const clean = newCat.trim();
    if (clean && !categories.includes(clean)) {
      setCategories((prev) => [...prev, clean]);
    }
  };

  /**
   * Barcode Lookup and Immediate Addition to Cumulative Queue
   * The item is inserted IMMEDIATELY into the screen queue, then enriched with AI.
   */
  const lookupAndAddBarcode = useCallback(
    async (barcode: string, customHint?: string) => {
      const cleanBarcode = barcode.trim().replace(/\s+/g, '');
      if (!cleanBarcode) return;

      // Duplicate verification
      const existing = products.find((p) => p.barcode === cleanBarcode);
      if (existing) {
        setLookupFeedback(`Código ${cleanBarcode} ya en cola: ${existing.name}`);
        triggerHapticFeedback([40]);
        setTimeout(() => setLookupFeedback(null), 3000);
        return;
      }

      const tempId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Step 1: Add immediately to the cumulative queue so the user sees it instantly
      const immediateItem: ProductItem = {
        id: tempId,
        barcode: cleanBarcode,
        name: `Buscando producto con IA (${cleanBarcode})...`,
        category: categories[0] || 'Pasillo 1',
        price: 0,
        costPrice: 0,
        stock: 0,
        minStock: 0,
        alertStockMin: 0,
        sku: '',
        description: '',
        unit: 'u',
        brand: '',
        userName: FIXED_METADATA.userName,
        addedByUserName: FIXED_METADATA.userName,
        addedByDeviceId: FIXED_METADATA.deviceId,
        timestamp: new Date().toISOString(),
        lookupStatus: 'searching',
        isGeneric: false,
      };

      setProducts((prev) => [immediateItem, ...prev]);
      triggerHapticFeedback([70]);
      playScanSound();

      // Step 2: Direct client-side lookup (100% in-browser, no server proxy dependency)
      try {
        const lookup = await searchProductByBarcodeLocally(cleanBarcode);
        const productName = lookup.name;
        const isGeneric = lookup.isGeneric;

        setProducts((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  name: productName,
                  source: lookup.isGeneric ? 'manual-required' : 'gemini-search',
                  lookupStatus: isGeneric ? 'generic' : 'success',
                  isGeneric,
                }
              : item
          )
        );

        setLookupFeedback(
          isGeneric
            ? `Código ${cleanBarcode} agregado (puedes editar el nombre)`
            : `¡Identificado!: ${productName}`
        );
      } catch (err: any) {
        console.error('Lookup error:', err);
        setProducts((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  name: `Producto ${cleanBarcode}`,
                  source: 'manual-required',
                  lookupStatus: 'error',
                  isGeneric: true,
                }
              : item
          )
        );
        setLookupFeedback(`Código ${cleanBarcode} agregado.`);
      } finally {
        setTimeout(() => setLookupFeedback(null), 3000);
      }
    },
    [products, categories]
  );

  /**
   * Consulta asíncrona real y directa para buscar el nombre comercial del producto (100% en cliente)
   */
  const handleRetryLookup = useCallback(async (id: string, barcode: string) => {
    // 1. Toma el barcode del producto actual
    const cleanBarcode = String(barcode || '').trim().replace(/\s+/g, '');
    if (!cleanBarcode) return;

    // Ponemos el producto en estado de búsqueda en el estado general
    setProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, lookupStatus: 'searching' } : item))
    );
    setLookupFeedback(`Consultando producto para código ${cleanBarcode}...`);
    triggerHapticFeedback([40]);

    try {
      // 2. Realiza la llamada asíncrona real y directa para consultar el nombre comercial basado en ese código de barras
      const lookup = await searchProductByBarcodeLocally(cleanBarcode);
      const realName = lookup.name.trim();

      // 3. Si la llamada es exitosa, actualiza el estado del producto con el nombre real obtenido
      // y cambia su estado de búsqueda a exitoso.
      if (!lookup.isGeneric && realName && !realName.toLowerCase().startsWith('producto ' + cleanBarcode.toLowerCase())) {
        setProducts((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  name: realName,
                  source: 'gemini-search',
                  lookupStatus: 'success',
                  isGeneric: false,
                  isEdited: false,
                }
              : item
          )
        );
        setLookupFeedback(`¡Nombre comercial obtenido!: ${realName}`);
        triggerHapticFeedback([100]);
        playScanSound();
      } else {
        // En caso de que no tenga coincidencia comercial exacta
        setProducts((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  name: realName || `Producto ${cleanBarcode}`,
                  lookupStatus: 'generic',
                  isGeneric: true,
                }
              : item
          )
        );
        setLookupFeedback(`Código ${cleanBarcode}: ingresa o edita el nombre comercial.`);
      }
    } catch (err: any) {
      console.error('Error al consultar código:', err);
      // Solo si ocurre un error grave se debe usar el genérico
      setProducts((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                name: `Producto ${cleanBarcode}`,
                lookupStatus: 'error',
                isGeneric: true,
              }
            : item
        )
      );
      setLookupFeedback(`Error al consultar código ${cleanBarcode}.`);
    } finally {
      setTimeout(() => setLookupFeedback(null), 3000);
    }
  }, []);

  // Batch barcodes added from gallery
  const handleBatchBarcodesAdded = async (barcodes: string[]) => {
    if (barcodes.length === 0) return;
    for (const code of barcodes) {
      await lookupAndAddBarcode(code);
    }
  };

  const handleUpdateProduct = (id: string, updates: Partial<ProductItem>) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));
    triggerHapticFeedback([40]);
  };

  const handleClearAll = () => {
    if (window.confirm('¿Seguro que deseas vaciar toda la cola de escaneo?')) {
      setProducts([]);
      triggerHapticFeedback([60]);
    }
  };

  const handleLoadDemo = () => {
    setProducts(DEMO_PRODUCTS);
    triggerHapticFeedback([60]);
  };

  // Filtered list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        searchQuery === '' ||
        p.barcode.includes(searchQuery.trim()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategoryFilter === 'TODAS' || p.category === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategoryFilter]);

  const genericCount = useMemo(
    () => products.filter((p) => p.isGeneric || p.name.startsWith(`Producto ${p.barcode}`)).length,
    [products]
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-32">
      {/* Sticky Mobile Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-black font-black text-xl shadow-md shadow-emerald-950">
              G
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Capturador Gerencia
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold">
                  v3
                </span>
              </h1>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                <span className="text-zinc-300 font-mono font-semibold">{FIXED_METADATA.storeCode}</span>
                <span>•</span>
                <span>{FIXED_METADATA.deviceName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExportOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <Download className="w-4 h-4" />
              <span>Exportar JSON</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-800 text-[10px] font-mono">
                {products.length}
              </span>
            </button>
          </div>
        </div>

        {/* Gerencia & Role Fixed Metadata Bar */}
        <div className="max-w-xl mx-auto mt-2 pt-2 border-t border-zinc-800/70 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <div className="flex items-center gap-1.5 truncate">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Usuario: <strong className="text-zinc-100">Gerencia</strong> (admin)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <span>ID: <strong className="text-zinc-200">{FIXED_METADATA.deviceId}</strong></span>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <main className="max-w-xl w-full mx-auto px-4 pt-4 flex-1 space-y-4">
        {/* Real-time Status / Feedback Notification */}
        {lookupFeedback && (
          <div className="p-3 rounded-2xl bg-zinc-900 border border-emerald-500/60 text-xs text-emerald-300 flex items-center gap-2.5 animate-in fade-in shadow-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{lookupFeedback}</span>
          </div>
        )}

        {/* Big Touch-Friendly Input Cards (Depot Ergonomics) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Action A: Omnidirectional Live Camera Scanner */}
          <button
            onClick={() => setIsCameraOpen(true)}
            className="group relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-zinc-900 border border-emerald-500/40 hover:border-emerald-400/70 text-left active:scale-98 transition shadow-lg flex flex-col justify-between min-h-[110px]"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                <Compass className="w-3 h-3 text-emerald-400" />
                360° En Vivo
              </span>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">Opción A</p>
              <h2 className="text-sm font-black text-white group-hover:text-emerald-300">
                Escáner Cámara
              </h2>
            </div>
          </button>

          {/* Action B: Batch Gallery Photo Upload */}
          <button
            onClick={() => setIsBatchOpen(true)}
            className="group relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-blue-950/70 via-zinc-900 to-zinc-900 border border-blue-500/40 hover:border-blue-400/70 text-left active:scale-98 transition shadow-lg flex flex-col justify-between min-h-[110px]"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <FolderOpen className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                Fotos Lote
              </span>
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-medium">Opción B</p>
              <h2 className="text-sm font-black text-white group-hover:text-blue-300">
                Carga Masiva
              </h2>
            </div>
          </button>
        </div>

        {/* Secondary Strip: Manual Entry and Quick JSON Inspect */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsManualOpen(true)}
            className="flex-1 py-3 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 active:scale-98 transition"
          >
            <Keyboard className="w-4 h-4 text-emerald-400" />
            <span>Ingreso Manual de Código</span>
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 flex items-center gap-1.5 active:scale-98 transition"
          >
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>Cola ({products.length})</span>
          </button>
        </div>

        {/* Search & Category Filtering */}
        <div className="space-y-2 pt-1">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar por código, nombre o pasillo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-medium"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Category Filter Pills (horizontal scrollable) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedCategoryFilter('TODAS')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                selectedCategoryFilter === 'TODAS'
                  ? 'bg-emerald-500 text-black'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              }`}
            >
              Todos ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                    selectedCategoryFilter === cat
                      ? 'bg-emerald-500 text-black'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {cat} {count > 0 ? `(${count})` : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generic Names Notice Bar if any exist */}
        {genericCount > 0 && (
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-600/40 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>{genericCount}</strong> productos con nombre genérico o pendiente.
              </span>
            </div>
            <span className="text-[11px] text-amber-400 font-medium">Usa 🔄 Reintentar</span>
          </div>
        )}

        {/* Product List Section (Cola Acumulativa) */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span className="font-bold text-zinc-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Cola de Trabajo ({filteredProducts.length})
            </span>
            {products.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-zinc-500 hover:text-red-400 transition"
              >
                Vaciar cola
              </button>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-200">
                {searchQuery || selectedCategoryFilter !== 'TODAS'
                  ? 'No hay productos que coincidan con la búsqueda'
                  : 'Cola de trabajo vacía'}
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Inicia escaneando con la cámara (360°), subiendo fotos o agregando códigos manualmente.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={handleLoadDemo}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-xs text-zinc-200 font-bold hover:bg-zinc-700 active:scale-95"
                >
                  Cargar 3 de demostración
                </button>
              </div>
            </div>
          ) : (
            filteredProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                categories={categories}
                index={idx}
                onUpdate={handleUpdateProduct}
                onDelete={handleDeleteProduct}
                onAddNewCategory={handleAddNewCategory}
                onRetryLookup={handleRetryLookup}
              />
            ))
          )}
        </div>

        {/* Bottom Section: Reporte & Auditoría de Cambios */}
        <div className="pt-4 pb-2 border-t border-zinc-800/80">
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Registro de Cambios y Arquitectura</h4>
                <p className="text-[11px] text-zinc-400">Documento técnico oficial con todos los cambios implementados.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsChangelogOpen(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
              >
                <FileText className="w-4 h-4" />
                <span>Ver y Descargar PDF</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Thumb Action Bar for Fast Depot Operations */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800 px-4 py-3 shadow-2xl">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <button
            onClick={() => setIsCameraOpen(true)}
            className="flex-1 py-3.5 px-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-sm flex items-center justify-center gap-1.5 border border-zinc-700 active:scale-95 transition shadow-md"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm">Escanear 360°</span>
          </button>

          <button
            onClick={() => setIsBatchOpen(true)}
            className="p-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 active:scale-95 transition shadow-md"
            title="Carga Masiva"
          >
            <FolderOpen className="w-5 h-5 text-blue-400" />
          </button>

          <button
            onClick={() => setIsChangelogOpen(true)}
            className="p-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700 active:scale-95 transition shadow-md"
            title="Ver Bitácora y Descargar PDF de Cambios"
          >
            <FileText className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex-[1.5] py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-1.5 active:scale-98 transition shadow-xl shadow-emerald-950"
          >
            <Download className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Exportar JSON ({products.length})</span>
          </button>
        </div>
      </footer>

      {/* Modals */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onBarcodeDetected={lookupAndAddBarcode}
        existingBarcodes={existingBarcodesSet}
      />

      <BatchUploadModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onAddBarcodes={handleBatchBarcodesAdded}
      />

      <ManualEntryModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        onSubmit={lookupAndAddBarcode}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        products={products}
      />

      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
    </div>
  );
}
