/**
 * Type definitions for Capturador Gerencia and Depos export schema
 */

export interface ProductItem {
  id: string;
  barcode: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  alertStockMin: number;
  sku: string;
  description: string;
  unit: string;
  brand: string;
  userName: 'Gerencia';
  addedByUserName: 'Gerencia';
  addedByDeviceId: 'dev-gerencia';
  timestamp: string;
  // UI and lookup state
  source?: 'gemini-search' | 'catalog-db' | 'manual' | 'manual-required';
  lookupStatus?: 'idle' | 'searching' | 'success' | 'generic' | 'error';
  isGeneric?: boolean;
  isEdited?: boolean;
  notes?: string;
  thumbnailUrl?: string;
}

export interface DeposExportFile {
  version: 3;
  storeCode: 'TIENDA-7894';
  role: 'master';
  deviceId: 'dev-gerencia';
  deviceName: 'Celular Gerencia';
  userName: 'Gerencia';
  userRole: 'admin';
  timestamp: string;
  products: ProductItem[];
}

export const DEFAULT_CATEGORIES: string[] = [
  'Pasillo 1',
  'Pasillo 2',
  'Pasillo 3',
  'Pasillo 4',
  'Perfumeria',
  'Lácteos y Pastas',
  'Pasillo 5',
];

export const FIXED_METADATA = {
  version: 3 as const,
  storeCode: 'TIENDA-7894' as const,
  role: 'master' as const,
  deviceId: 'dev-gerencia' as const,
  deviceName: 'Celular Gerencia' as const,
  userName: 'Gerencia' as const,
  userRole: 'admin' as const,
};
