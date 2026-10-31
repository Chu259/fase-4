export interface ChangelogSection {
  title: string;
  badge?: string;
  items: { title: string; desc: string }[];
}

export const CHANGELOG_DATA: ChangelogSection[] = [
  {
    title: '1. DISEÑO E IDENTIDAD MÓVIL (GERENCIA & DEPÓSITO)',
    badge: 'COMPLETADO',
    items: [
      {
        title: 'Interfaz Táctil para Depósito:',
        desc: 'Diseño en tema oscuro (#090d16) con acentos esmeralda. Botones grandes y ergonómicos en la zona inferior de la pantalla para operarse con una sola mano sin esfuerzo.',
      },
      {
        title: 'Metadatos Fijos de Auditoría (Gerencia):',
        desc: 'Asignación inmutable de autoría en cada producto escaneado: userName: "Gerencia", addedByUserName: "Gerencia", addedByDeviceId: "dev-gerencia" y tienda TIENDA-7894.',
      },
    ],
  },
  {
    title: '2. MÉTODOS DE CAPTURA Y MOTOR OMNIDIRECCIONAL',
    badge: 'COMPLETADO',
    items: [
      {
        title: 'Escaneo Omnidireccional 360° en Vivo (Cámara):',
        desc: 'Lectura de códigos en cualquier inclinación (rotaciones 0°, 90°, 45°, 135°). Visor cuadrado con linterna (torch), feedback háptico (vibración) y sonoro.',
      },
      {
        title: 'Carga Masiva (Batch) desde Galería de Fotos:',
        desc: 'Selección múltiple de fotos de códigos. Procesamiento 100% local con Canvas y ZXing. Las imágenes nunca se envían por red, garantizando cero consumo de datos móviles.',
      },
      {
        title: 'Ingreso Manual Táctil:',
        desc: 'Teclado numérico táctil en pantalla para ingresar códigos dañados o ilegibles.',
      },
      {
        title: 'Cola Acumulativa en Tiempo Real:',
        desc: 'Los productos leídos entran al instante en la lista de trabajo en pantalla sin interrumpir la sesión de escaneo.',
      },
    ],
  },
  {
    title: '3. BÚSQUEDA INTELIGENTE E INTEGRACIÓN DE IA (GEMINI)',
    badge: 'COMPLETADO',
    items: [
      {
        title: 'lookupBarcodeWithAI en el Cliente:',
        desc: 'Integración directa en el cliente con @google/generative-ai y @google/genai con VITE_GEMINI_API_KEY. Prompt especializado en supermercados de Argentina para identificar nombre comercial, marca, variedad y gramaje.',
      },
      {
        title: 'Catálogo Rápido y Bases de Datos Abiertas:',
        desc: 'Base local inmediata para marcas de consumo masivo (Coca-Cola, Oreo, Pantene, La Serenísima, etc.) y respaldo con Open Food Facts.',
      },
      {
        title: 'Botón Minimalista de Recarga (🔄):',
        desc: 'Botón con el ícono de recarga que consulta la IA y actualiza el campo de texto con el nombre obtenido sin salir de la app.',
      },
    ],
  },
  {
    title: '4. EDICIÓN, CLASIFICACIÓN Y COMPATIBILIDAD CON "DEPOS"',
    badge: 'COMPLETADO',
    items: [
      {
        title: 'Edición de Nombre y Pasillos/Categorías:',
        desc: 'Input editable para limpiar texto y selector con opciones de pasillos predeterminados o añadir nuevas categorías.',
      },
      {
        title: 'Estructura de Exportación Versión 3:',
        desc: 'Valores numéricos inicializados en 0 y texto vacío para compatibilidad total con el sistema Depos, con descarga, copiado y opción de compartir.',
      },
    ],
  },
  {
    title: '5. REGISTRO DE ARCHIVOS DEL PROYECTO',
    badge: 'DOCUMENTADO',
    items: [
      { title: 'src/App.tsx', desc: 'Cola acumulativa, modals, sincronización local y exportación.' },
      { title: 'src/utils/productLookup.ts', desc: 'Servicio de búsqueda con lookupBarcodeWithAI y catálogos.' },
      { title: 'src/utils/barcodeReader.ts', desc: 'Motor omnidireccional 360°, ZXing y decodificación local.' },
      { title: 'src/components/ProductCard.tsx', desc: 'Tarjeta con input editable y botón minimalista 🔄.' },
      { title: 'src/components/CameraScannerModal.tsx', desc: 'Escáner en vivo con cámara, linterna y cola en sesión.' },
      { title: 'src/components/BatchUploadModal.tsx', desc: 'Carga masiva de fotos con extracción local en Canvas.' },
      { title: 'src/components/ExportModal.tsx', desc: 'Exportación a JSON versión 3, descarga y compartir.' },
      { title: 'src/components/ChangelogModal.tsx', desc: 'Visor modal interactivo e imprimible del reporte de cambios.' },
      { title: 'src/types/inventory.ts', desc: 'Definiciones de TypeScript para productos y formato Depos.' },
      { title: 'src/utils/pdfGenerator.ts', desc: 'Generador y descargador de reporte PDF de cambios y arquitectura.' },
      { title: 'vite.config.ts', desc: 'Configuración de Vite con alias y variable VITE_GEMINI_API_KEY.' },
    ],
  },
];
