import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize Google Gen AI client with required header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to sanitize clean product name
function cleanCommercialName(raw: string, barcode: string): string {
  let cleaned = raw.trim();
  // Remove markdown quotes, backticks or labels like "Producto:" or "Nombre:"
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');
  cleaned = cleaned.replace(/^(nombre(\s*comercial)?|producto|art[ií]culo)\s*:\s*/i, '');
  // If model says it could not find it
  if (
    cleaned.toLowerCase().includes('no encontrado') ||
    cleaned.toLowerCase().includes('no fue posible') ||
    cleaned.toLowerCase().includes('desconocido') ||
    cleaned.toLowerCase().includes('no existe') ||
    cleaned.length === 0
  ) {
    return `Producto ${barcode}`;
  }
  return cleaned;
}

// Fallback lookup via Open Food Facts (public registry, fast & data-rich)
async function lookupOpenFoodFacts(barcode: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CapturadorGerencia/1.0 (inventory-app)' },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 1 && data.product) {
      const p = data.product;
      const brand = p.brands ? p.brands.split(',')[0].trim() : '';
      const name = p.product_name_es || p.product_name || p.generic_name_es || p.generic_name || '';
      const quantity = p.quantity || '';
      const parts = [brand, name, quantity].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(' ').trim();
      }
    }
  } catch {
    // Ignore OpenFoodFacts network timeout/error
  }
  return null;
}

// Multi-catalog lookup (Open Food Facts, Open Beauty Facts, Open Products Facts)
async function lookupCatalogDatabases(barcode: string): Promise<string | null> {
  const sources = [
    `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
    `https://world.openbeautyfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
    `https://world.openproductsfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
  ];

  for (const url of sources) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2200);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'CapturadorGerencia/1.0 (inventory-app)' },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const brand = p.brands ? p.brands.split(',')[0].trim() : '';
        const name = p.product_name_es || p.product_name || p.generic_name_es || p.generic_name || '';
        const quantity = p.quantity || '';
        const parts = [brand, name, quantity].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(' ').trim();
        }
      }
    } catch {
      // Continue to next catalog
    }
  }
  return null;
}

// POST /api/lookup-barcode
app.post('/api/lookup-barcode', async (req: Request, res: Response) => {
  const { barcode, retry, customHint } = req.body;

  if (!barcode || typeof barcode !== 'string') {
    res.status(400).json({ error: 'Código de barras no proporcionado o inválido.' });
    return;
  }

  const cleanBarcode = barcode.trim().replace(/\s+/g, '');

  try {
    // 1. Fast catalog databases check (Open Food Facts / Beauty / Products)
    const catalogName = await lookupCatalogDatabases(cleanBarcode);
    if (catalogName) {
      res.json({
        success: true,
        barcode: cleanBarcode,
        name: catalogName,
        source: 'catalog-db',
        isGeneric: false,
      });
      return;
    }

    // 2. Gemini AI lookup
    if (process.env.GEMINI_API_KEY) {
      try {
        const retryPrefix = retry ? 'Reintento de búsqueda profunda: ' : '';
        const hintText = customHint ? ` Pistas adicionales: ${customHint}.` : '';
        const prompt = `${retryPrefix}Código de barras EAN/UPC: ${cleanBarcode}.${hintText} Identifica el producto comercial en supermercados o tiendas. Devuelve EXCLUSIVAMENTE el nombre comercial completo del producto en español (marca, producto y presentación/gramaje si corresponde).`;

        let textOutput = '';

        // Try with googleSearch first, fallback to direct prompt if quota limit/error
        try {
          const responseWithSearch = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              systemInstruction:
                'Eres un asistente experto en gestión de inventarios de supermercados y tiendas. Tu única tarea es recibir un número de código de barras, buscar el producto correspondiente y devolver exclusivamente el nombre comercial completo del producto en español. No agregues saludos, explicaciones ni texto adicional.',
              tools: [{ googleSearch: {} }],
            },
          });
          textOutput = responseWithSearch.text ? cleanCommercialName(responseWithSearch.text, cleanBarcode) : '';
        } catch (searchErr) {
          // If search tool has quota/rate limit error, call Gemini directly
          const directResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              systemInstruction:
                'Eres un asistente experto en gestión de inventarios de supermercados y tiendas. Tu única tarea es recibir un número de código de barras, buscar el producto correspondiente y devolver exclusivamente el nombre comercial completo del producto en español. No agregues saludos, explicaciones ni texto adicional.',
            },
          });
          textOutput = directResponse.text ? cleanCommercialName(directResponse.text, cleanBarcode) : '';
        }

        if (textOutput && textOutput !== `Producto ${cleanBarcode}`) {
          res.json({
            success: true,
            barcode: cleanBarcode,
            name: textOutput,
            source: 'gemini',
            isGeneric: false,
          });
          return;
        }
      } catch (geminiError: any) {
        console.warn('Gemini lookup warning:', geminiError?.message || geminiError);
      }
    }

    // 3. Fallback generic response if all catalog & AI searches find no record
    res.json({
      success: true,
      barcode: cleanBarcode,
      name: `Producto ${cleanBarcode}`,
      source: 'manual-required',
      isGeneric: true,
    });
  } catch (error: any) {
    console.error('Lookup error:', error);
    res.status(500).json({
      error: 'Error al procesar el código de barras',
      message: error?.message || 'Error interno',
      barcode: cleanBarcode,
      name: `Producto ${cleanBarcode}`,
      isGeneric: true,
    });
  }
});

// POST /api/lookup-batch (process multiple barcodes efficiently)
app.post('/api/lookup-batch', async (req: Request, res: Response) => {
  const { barcodes } = req.body;
  if (!Array.isArray(barcodes)) {
    res.status(400).json({ error: 'Lista de códigos de barras requerida.' });
    return;
  }

  const results: Array<{ barcode: string; name: string; source: string }> = [];

  for (const rawBarcode of barcodes) {
    const cleanBarcode = String(rawBarcode).trim().replace(/\s+/g, '');
    if (!cleanBarcode) continue;

    let foundName: string | null = null;
    let source = 'fallback';

    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Código de barras: ${cleanBarcode}. Busca el producto en bases de datos comerciales o supermercados y devuelve exclusivamente el nombre comercial completo en español.`,
          config: {
            systemInstruction:
              'Eres un asistente experto en gestión de inventarios de supermercados y tiendas. Tu única tarea es recibir un número de código de barras, buscar el producto correspondiente y devolver exclusivamente el nombre comercial completo del producto en español. No agregues saludos, explicaciones ni texto adicional.',
            tools: [{ googleSearch: {} }],
          },
        });
        const name = response.text ? cleanCommercialName(response.text, cleanBarcode) : '';
        if (name && name !== `Producto ${cleanBarcode}`) {
          foundName = name;
          source = 'gemini-search';
        }
      } catch {
        // Continue to fallback
      }
    }

    if (!foundName) {
      const offName = await lookupOpenFoodFacts(cleanBarcode);
      if (offName) {
        foundName = offName;
        source = 'catalog-db';
      }
    }

    results.push({
      barcode: cleanBarcode,
      name: foundName || `Producto ${cleanBarcode}`,
      source: foundName ? source : 'manual-required',
    });
  }

  res.json({ success: true, count: results.length, products: results });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Capturador Gerencia] Server running on port ${PORT}`);
  });
}

startServer();
