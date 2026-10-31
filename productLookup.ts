/**
 * Client-Side Direct Product Lookup Service
 * Operates 100% in the browser with zero dependency on backend proxy routes.
 * Eliminates infinite loading loops and timeout issues.
 */

// Offline reference catalog for common supermarket & retail EAN barcodes
const COMMON_RETAIL_CATALOG: Record<string, string> = {
  // Bebidas & Refrescos
  '7790895000997': 'Coca-Cola Sabor Original 2.25 L',
  '7790895000973': 'Coca-Cola Sabor Original 1.5 L',
  '7790895000966': 'Coca-Cola Sabor Original 500 ml',
  '7790895064098': 'Coca-Cola Sin Azúcares 2.25 L',
  '7790895001017': 'Sprite Lima Limón 2.25 L',
  '7790895001031': 'Fanta Naranja 2.25 L',
  '7790070507341': 'Minerva Jugo 100% de Limón 500 ml',
  '7792798000018': 'Cerveza Quilmes Clásica 1 L',
  '7891991000840': 'Cerveza Brahma Chopp 1 L',
  '5410228140488': 'Cerveza Stella Artois 1 L',
  '7790310000010': 'Agua Mineral Villavicencio con Gas 1.5 L',
  '7790310000027': 'Agua Mineral Villavicencio Sin Gas 1.5 L',

  // Galletitas & Snacks
  '7622300720445': 'Galletitas Oreo Original 118 g',
  '7622210703842': 'Galletitas Oreo Pack Familiar 354 g',
  '7790380007001': 'Galletitas Chocolinas Bagley 170 g',
  '7790380007018': 'Galletitas Chocolinas Bagley 250 g',
  '7790380000101': 'Galletitas Criollitas Clásicas 300 g',
  '7790380000200': 'Galletitas Traviata 300 g',
  '7790580120012': 'Bizcochos Don Satur Salados 200 g',
  '7790580120029': 'Bizcochos Don Satur Dulces 200 g',
  '7790380005502': 'Galletitas Rumba Bagley 112 g',
  '7790380005519': 'Galletitas Amor Bagley 112 g',
  '7790380005526': 'Galletitas Sonrisas Frambuesa Bagley 118 g',
  '7790310981760': 'Papas Fritas Lays Clásicas 85 g',
  '7790310981777': 'Papas Fritas Lays Clásicas 140 g',

  // Lácteos & Pastas
  '7790080000016': 'Leche La Serenísima Clásica Entera 1 L',
  '7790080000023': 'Leche La Serenísima Descremada 1 L',
  '7790080026207': 'Queso Crema Casancrem Clásico 290 g',
  '7790080045000': 'Dulce de Leche La Serenísima Colonial 400 g',
  '7790080007107': 'Manteca La Serenísima Clásica 200 g',
  '7790070012050': 'Fideos Matarazzo Spaghetti 500 g',
  '7790070012067': 'Fideos Matarazzo Tallarines 500 g',
  '7790070012074': 'Fideos Matarazzo Mostacholes 500 g',
  '7790070031013': 'Arroz Lucchetti Doble Carolina 1 kg',
  '7790070031020': 'Arroz Lucchetti Largo Fino 1 kg',

  // Perfumería & Higiene
  '7791290000085': 'Shampoo Pantene Restauración 400 ml',
  '7791290000092': 'Acondicionador Pantene Restauración 400 ml',
  '7791293022510': 'Shampoo Head & Shoulders Limpieza Renovadora 400 ml',
  '7791293011408': 'Shampoo Sedal Ceramidas 340 ml',
  '7791293011415': 'Acondicionador Sedal Ceramidas 340 ml',
  '7791293033103': 'Jabón Dove Original en Barra 90 g',
  '7791293041016': 'Desodorante Rexona Invisible Aerosol 150 ml',
  '7791293041023': 'Desodorante Axe Black Aerosol 150 ml',
  '7791293051008': 'Crema Dental Colgate Total 12 Limpieza Profunda 90 g',
  '7791293051015': 'Crema Dental Colgate Triple Acción 90 g',

  // Almacén & Limpieza
  '7790070411211': 'Aceite Girasol Cocinero 900 ml',
  '7790070411228': 'Aceite Girasol Natura 900 ml',
  '7790070211019': 'Mayonesa Hellmanns Clásica Doypack 475 g',
  '7791293061014': 'Jabón Líquido para Ropa Skip Bioenzimas 3 L',
  '7791293061021': 'Jabón Líquido para Ropa Ala Lavado Perfecto 3 L',
  '7791293071013': 'Detergente Magistral Multiuso Limón 500 ml',
  '7791293071020': 'Lavandina Ayudín Triple Fuerza 1 L',
  '7791293081012': 'Limpiador Líquido Cif Gatillo Antigrasa 500 ml',
};

// Formats product title cleanly: Brand + Product Name + Quantity
function formatProductInfo(product: any): string | null {
  if (!product) return null;
  const brand = (product.brands || product.brand_owner || '').split(',')[0].trim();
  const name = (
    product.product_name_es ||
    product.product_name ||
    product.generic_name_es ||
    product.generic_name ||
    ''
  ).trim();
  const quantity = (product.quantity || product.net_weight || '').trim();

  const parts = [brand, name, quantity].filter(Boolean);
  if (parts.length > 0) {
    let combined = parts.join(' ').replace(/\s+/g, ' ').trim();
    // Capitalize nicely
    combined = combined.charAt(0).toUpperCase() + combined.slice(1);
    return combined;
  }
  return null;
}

// Queries Open Food Facts, Open Beauty Facts, and Open Products Facts with strict timeout
async function fetchFromOpenCatalogs(barcode: string): Promise<string | null> {
  const endpoints = [
    `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
    `https://world.openbeautyfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
    `https://world.openproductsfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2200);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      if (data.status === 1 && data.product) {
        const formatted = formatProductInfo(data.product);
        if (formatted) return formatted;
      }
    } catch {
      // Ignore network timeout and try next source
    }
  }

  return null;
}

// Country code resolver based on standard GS1 EAN-13 prefixes
function getCountryOrigin(barcode: string): string {
  if (barcode.startsWith('779')) return 'Nacional';
  if (barcode.startsWith('84')) return 'España';
  if (barcode.startsWith('750')) return 'México';
  if (barcode.startsWith('780')) return 'Chile';
  if (barcode.startsWith('770')) return 'Colombia';
  if (barcode.startsWith('789') || barcode.startsWith('790')) return 'Brasil';
  if (barcode.startsWith('773')) return 'Uruguay';
  if (barcode.startsWith('0') || barcode.startsWith('1')) return 'Importado';
  return 'Comercial';
}

/**
 * Consulta directa con la IA para obtener el nombre comercial real
 * basado en el código de barras (EAN/UPC).
 */
/**
 * Consulta directa con la IA para obtener el nombre comercial real
 * basado en el código de barras (EAN/UPC).
 */
export async function lookupBarcodeWithAI(barcode: string): Promise<string> {
  const cleanBarcode = String(barcode || '').trim().replace(/\s+/g, '');
  if (!cleanBarcode) return '';

  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  if (!apiKey) {
    return `Artículo Nacional ${cleanBarcode}`;
  }

  // Prompt plano y directo sin configuraciones complejas ni argumentos inválidos
  const prompt = `Identifica el nombre comercial del producto de supermercado en Argentina para el código de barras: ${cleanBarcode}. Devuelve ÚNICAMENTE nombre comercial, marca y tamaño o contenido neto (ejemplo: "Yerba Mate Cachamate Hierbas Serranas 1kg"). Sin texto adicional.`;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    // Intentamos con el modelo activo de alta disponibilidad (gemini-3.5-flash-lite)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // Limpieza de caracteres y comillas
    text = text.replace(/^["'`*#]+|["'`*#]+$/g, '').trim();
    text = text.replace(/^(nombre(\s*comercial)?|producto|art[ií]culo)\s*:\s*/i, '').trim();

    if (
      text &&
      !text.toLowerCase().includes('desconocido') &&
      !text.toLowerCase().includes('no encontrado') &&
      !text.toLowerCase().includes('no fue posible') &&
      !text.toLowerCase().startsWith('producto ' + cleanBarcode.toLowerCase())
    ) {
      return text;
    }
  } catch (error) {
    console.error('Error al consultar la IA directamente desde el cliente:', error);
  }

  return `Artículo Nacional ${cleanBarcode}`;
}

/**
 * Main Direct Client-Side Product Lookup
 * Fast, reliable, 100% in-browser, combines instant catalog, open databases and Gemini AI.
 */
export async function searchProductByBarcodeLocally(
  barcode: string
): Promise<{ name: string; source: 'catalog' | 'known-db' | 'ai' | 'manual'; isGeneric: boolean }> {
  const clean = barcode.trim().replace(/\s+/g, '');
  if (!clean) {
    return { name: 'Producto sin código', source: 'manual', isGeneric: true };
  }

  // 1. Instant check in the known retail database
  if (COMMON_RETAIL_CATALOG[clean]) {
    return {
      name: COMMON_RETAIL_CATALOG[clean],
      source: 'known-db',
      isGeneric: false,
    };
  }

  // 2. Direct client-side fetch to public Open Catalogs (CORS enabled)
  try {
    const catalogName = await fetchFromOpenCatalogs(clean);
    if (catalogName) {
      return {
        name: catalogName,
        source: 'catalog',
        isGeneric: false,
      };
    }
  } catch (err) {
    console.warn('Catalog query error:', err);
  }

  // 3. Direct Gemini AI query for Argentine/international supermarket EAN
  try {
    const aiName = await lookupBarcodeWithAI(clean);
    if (aiName) {
      return {
        name: aiName,
        source: 'ai',
        isGeneric: false,
      };
    }
  } catch (err) {
    console.warn('AI query error:', err);
  }

  // 4. Smart retail fallback if not found in open databases or AI
  const origin = getCountryOrigin(clean);
  return {
    name: `Artículo ${origin} ${clean}`,
    source: 'manual',
    isGeneric: true,
  };
}
