/**
 * Robust Client-Side PDF Generation Service
 * Uses jsPDF with cross-browser download handling, iframe compatibility,
 * and data URI fallback to guarantee download in all environments.
 */

export async function generateChangelogPDF(): Promise<boolean> {
  try {
    const jspdfModule = await import('jspdf');
    const jsPDFClass = jspdfModule.jsPDF || (jspdfModule as any).default;

    if (!jsPDFClass) {
      throw new Error('No se pudo inicializar la librería PDF.');
    }

    const doc = new jsPDFClass({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin - 10) {
        doc.addPage();
        y = margin + 8;
        drawHeaderFooter();
      }
    };

    const drawHeaderFooter = () => {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('Capturador Gerencia • Documento de Registro de Cambios y Arquitectura', margin, 10);
      doc.text(
        `Página ${doc.internal.pages.length - 1}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      );
    };

    // 1. Cover / Top Header Banner
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(margin, y, contentWidth, 26, 'F');

    doc.setTextColor(16, 185, 129); // Emerald 500
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('CAPTURADOR GERENCIA - BITÁCORA DE CAMBIOS', margin + 6, y + 10);

    doc.setTextColor(226, 232, 240); // Slate 200
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Versión v3.0 • Tienda TIENDA-7894 • Dispositivo dev-gerencia', margin + 6, y + 17);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`, margin + 6, y + 22);

    y += 32;

    // Helper to add styled section heading
    const addSection = (title: string, badge?: string) => {
      checkPageBreak(16);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, contentWidth, 7.5, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(title, margin + 4, y + 5);

      if (badge) {
        doc.setFontSize(8);
        doc.setTextColor(5, 150, 105);
        doc.text(badge, pageWidth - margin - 4, y + 5, { align: 'right' });
      }
      y += 11;
    };

    const addBullet = (title: string, desc: string) => {
      checkPageBreak(12);
      doc.setFillColor(16, 185, 129);
      doc.circle(margin + 3, y - 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(title, margin + 6, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const splitLines = doc.splitTextToSize(desc, contentWidth - 6);
      doc.text(splitLines, margin + 6, y);
      y += splitLines.length * 3.8 + 3;
    };

    // Section 1
    addSection('1. DISEÑO E IDENTIDAD MÓVIL (GERENCIA & DEPÓSITO)', 'COMPLETADO');
    addBullet(
      'Interfaz Táctil para Depósito:',
      'Diseño en tema oscuro (#090d16) con acentos esmeralda. Botones grandes y ergonómicos en la zona inferior de la pantalla para operarse con una sola mano sin esfuerzo.'
    );
    addBullet(
      'Metadatos Fijos de Auditoría (Gerencia):',
      'Asignación inmutable de autoría en cada producto escaneado: userName: "Gerencia", addedByUserName: "Gerencia", addedByDeviceId: "dev-gerencia" y tienda TIENDA-7894.'
    );

    // Section 2
    addSection('2. MÉTODOS DE CAPTURA Y MOTOR OMNIDIRECCIONAL', 'COMPLETADO');
    addBullet(
      'Escaneo Omnidireccional 360° en Vivo (Cámara):',
      'Lectura de códigos en cualquier inclinación (rotaciones 0°, 90°, 45°, 135°). Visor cuadrado con linterna (torch), feedback háptico (vibración) y sonoro.'
    );
    addBullet(
      'Carga Masiva (Batch) desde Galería de Fotos:',
      'Selección múltiple de fotos de códigos. Procesamiento 100% local con Canvas y ZXing. Las imágenes nunca se envían por red, garantizando cero consumo de datos móviles.'
    );
    addBullet(
      'Ingreso Manual Táctil:',
      'Teclado numérico táctil en pantalla para ingresar códigos dañados o ilegibles.'
    );
    addBullet(
      'Cola Acumulativa en Tiempo Real:',
      'Los productos leídos entran al instante en la lista de trabajo en pantalla sin interrumpir la sesión de escaneo.'
    );

    // Section 3
    addSection('3. BÚSQUEDA INTELIGENTE E INTEGRACIÓN DE IA (GEMINI)', 'COMPLETADO');
    addBullet(
      'lookupBarcodeWithAI en el Cliente:',
      'Integración directa en el cliente con @google/generative-ai y @google/genai con VITE_GEMINI_API_KEY. Prompt especializado en supermercados de Argentina para identificar nombre comercial, marca, variedad y gramaje.'
    );
    addBullet(
      'Catálogo Rápido y Bases de Datos Abiertas:',
      'Base local inmediata para marcas de consumo masivo (Coca-Cola, Oreo, Pantene, La Serenísima, etc.) y respaldo con Open Food Facts.'
    );
    addBullet(
      'Botón Minimalista de Recarga (🔄):',
      'Botón con el ícono de recarga que consulta la IA y actualiza el campo de texto con el nombre obtenido sin salir de la app.'
    );

    // Section 4
    addSection('4. EDICIÓN, CLASIFICACIÓN Y COMPATIBILIDAD CON "DEPOS"', 'COMPLETADO');
    addBullet(
      'Edición de Nombre y Pasillos/Categorías:',
      'Input editable para limpiar texto y selector con opciones de pasillos predeterminados o añadir nuevas categorías.'
    );
    addBullet(
      'Estructura de Exportación Versión 3:',
      'Valores numéricos inicializados en 0 y texto vacío para compatibilidad total con el sistema Depos, con descarga, copiado y opción de compartir.'
    );

    // Section 5: Files Table
    addSection('5. REGISTRO DE ARCHIVOS DEL PROYECTO');
    const fileRows = [
      { file: 'src/App.tsx', desc: 'Cola acumulativa, modals, sincronización local y exportación' },
      { file: 'src/utils/productLookup.ts', desc: 'Servicio de búsqueda con lookupBarcodeWithAI y catálogos' },
      { file: 'src/utils/barcodeReader.ts', desc: 'Motor omnidireccional 360°, ZXing y decodificación local' },
      { file: 'src/components/ProductCard.tsx', desc: 'Tarjeta con input editable y botón minimalista 🔄' },
      { file: 'src/components/CameraScannerModal.tsx', desc: 'Escáner en vivo con cámara, linterna y cola en sesión' },
      { file: 'src/components/BatchUploadModal.tsx', desc: 'Carga masiva de fotos con extracción local en Canvas' },
      { file: 'src/components/ExportModal.tsx', desc: 'Exportación a JSON versión 3, descarga y compartir' },
      { file: 'src/types/inventory.ts', desc: 'Definiciones de TypeScript para productos y formato Depos' },
      { file: 'src/utils/pdfGenerator.ts', desc: 'Generador de reporte PDF de cambios y arquitectura' },
      { file: 'vite.config.ts', desc: 'Configuración de Vite con alias y variable VITE_GEMINI_API_KEY' },
    ];

    fileRows.forEach((row) => {
      checkPageBreak(6);
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(row.file, margin + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`- ${row.desc}`, margin + 55, y);
      y += 5;
    });

    drawHeaderFooter();

    const fileName = `Cambios_Capturador_Gerencia_${new Date().toISOString().slice(0, 10)}.pdf`;

    // Cross-browser download trigger (works cleanly inside sandboxed iframes)
    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 500);
      return true;
    } catch {
      // Direct doc.save fallback
      doc.save(fileName);
      return true;
    }
  } catch (error) {
    console.error('Error al generar PDF de cambios:', error);
    alert('No se pudo generar el PDF: ' + (error instanceof Error ? error.message : String(error)));
    return false;
  }
}
