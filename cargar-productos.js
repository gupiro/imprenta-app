const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./imprenta.db');

// Datos extraídos de la imagen
const productos = [
  // TALONARIOS
  { nombre: 'Talonario 1/2 Oficio x Duplicado', codigo: 'TAL-001', precio: 6500, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Talonario 1/2 Oficio x Triplicado', codigo: 'TAL-002', precio: 7500, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Talonario A4 Duplicado', codigo: 'TAL-003', precio: 12000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Talonario A4 x Triplicado', codigo: 'TAL-004', precio: 17000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Talonario 1/2', codigo: 'TAL-005', precio: 5000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Talonario 1/3', codigo: 'TAL-006', precio: 4000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Talonario Oficio x Duplicado', codigo: 'TAL-007', precio: 12000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Talonario Oficio x Triplicado', codigo: 'TAL-008', precio: 20000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Talonario Oficio x Quadrup', codigo: 'TAL-009', precio: 24000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'A4 Logo Color', codigo: 'TAL-010', precio: 10000, tipo: 'otro', unidad: 'unidad' },
  { nombre: '1/2 Oficio Logo Color', codigo: 'TAL-011', precio: 6000, tipo: 'otro', unidad: 'unidad' },

  // ENTRADAS Y COMÚN
  { nombre: 'Entradas 6 Tal', codigo: 'ENT-001', precio: 12000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Entradas Logo Color 8 Tal', precio: 8000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Entradas 12 Tal', codigo: 'ENT-002', precio: 21600, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Entradas Logo Color', codigo: 'ENT-003', precio: 6000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Entradas Full Color', codigo: 'ENT-004', precio: 8000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'TAL.ABROCHADOS', codigo: 'ENT-005', precio: 2500, tipo: 'otro', unidad: 'unidad' },

  // BONO CONTRIBUCIÓN
  { nombre: 'Bono Contribución 500 Nº', codigo: 'BONO-001', precio: 16500, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Bono Contribución 1000 Nº', codigo: 'BONO-002', precio: 33000, tipo: 'otro', unidad: 'unidad' },

  // IMPRESIÓN COLOR
  { nombre: 'Impresión Color A4', codigo: 'IMP-A4-001', precio: 500, tipo: 'impresion', unidad: 'unidad', precioAlternativo: -300 },
  { nombre: 'Impresión Color A3', codigo: 'IMP-A3-001', precio: 1000, tipo: 'impresion', unidad: 'unidad' },
  { nombre: 'Impresión Color A4 Cartulina', codigo: 'IMP-A4-CART', precio: 1500, tipo: 'impresion', unidad: 'unidad', precioAlternativo: 900 },
  { nombre: 'Impresión Color A3 Cartulina', codigo: 'IMP-A3-CART', precio: 3000, tipo: 'impresion', unidad: 'unidad' },
  { nombre: 'Impresión Papel IMP/B Nº A4', codigo: 'IMP-PAPEL-001', precio: 150, tipo: 'impresion', unidad: 'unidad', precioAlternativo: 150 },
  { nombre: 'Impresión Papel IMP/B Nº A3', codigo: 'IMP-PAPEL-003', precio: 300, tipo: 'impresion', unidad: 'unidad' },

  // FOTOGRÁFICO
  { nombre: 'Fotográfico', codigo: 'FOTO-001', precio: 2000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Fotográfico Papel', codigo: 'FOTO-PAPEL-001', precio: 13000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Fotocopias Blanco y Negro', codigo: 'FOTOC-BN-001', precio: 150, tipo: 'fotocopia', unidad: 'unidad' },
  { nombre: 'Fotocopias Color', codigo: 'FOTOC-COLOR-001', precio: 300, tipo: 'fotocopia', unidad: 'unidad' },
  { nombre: 'Fotocopias 150 Blanco/Negro', codigo: 'FOTOC-BN-150', precio: 150, tipo: 'fotocopia', unidad: 'unidad' },
  { nombre: 'Fotocopias 150 Blanco/Negro A3', codigo: 'FOTOC-BN-A3', precio: 180, tipo: 'fotocopia', unidad: 'unidad' },

  // TARJETAS
  { nombre: 'Tarjeta Personal', codigo: 'TARJ-PERS-001', precio: 12000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Tarjeta Personal 10x15', codigo: 'TARJ-PERS-10x15', precio: 16000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Tarjetas Cartulina 1/8', codigo: 'TARJ-CART-1/8', precio: 250, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Tarjetas Cartulina 1/4', codigo: 'TARJ-CART-1/4', precio: 150, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Tarjetas Certificados A3', codigo: 'TARJ-CERT-A3', precio: 2000, tipo: 'otro', unidad: 'unidad' },

  // BANNER Y LONA
  { nombre: 'Banner Público', codigo: 'BANNER-001', precio: 30000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Lona Front', codigo: 'LONA-FRONT-001', precio: 500, tipo: 'lona', unidad: 'm2' },
  { nombre: 'Lona Back', codigo: 'LONA-BACK-001', precio: 14000, tipo: 'lona', unidad: 'm2' },
  { nombre: 'Lona Front High', codigo: 'LONA-FRONT-HIGH', precio: 500, tipo: 'lona', unidad: 'm2' },
  { nombre: 'Vinilo BB', codigo: 'VINILO-BB-001', precio: 11500, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Vinilo TR', codigo: 'VINILO-TR-001', precio: 16500, tipo: 'otro', unidad: 'unidad' },

  // SELLOS Y DISTINTIVOS
  { nombre: 'Sello Público', codigo: 'SELLO-PUB', precio: 30000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Sello Bolsillo', codigo: 'SELLO-BOL', precio: 3000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Cambio', codigo: 'CAMBIO-001', precio: 5000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Carnet', codigo: 'CARNET-001', precio: 2000, tipo: 'otro', unidad: 'unidad' },

  // 3D Y OTROS
  { nombre: 'Llaveros', codigo: '3D-LLAVERO', precio: 2000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Plastificado', codigo: '3D-PLAST', precio: 500, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Anillado', codigo: '3D-ANILLA', precio: 6000, tipo: 'otro', unidad: 'unidad' },

  // SUBLIMADO
  { nombre: 'Sublimado en Gorra', codigo: 'SUBL-GORRA', precio: 6500, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Sublimado en DIE', codigo: 'SUBL-DIE', precio: 1500, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Estampado en Gorra', codigo: 'ESTAMP-GORRA', precio: 1500, tipo: 'otro', unidad: 'unidad' },

  // ACCESORIOS Y SERVICIOS
  { nombre: 'Micro', codigo: 'MICRO-001', precio: 17000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Ploteo Tapa', codigo: 'PLOTEO-TAPA', precio: 5400, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Cerámica', codigo: 'CERAMICA-001', precio: 10000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Gremio', codigo: 'GREMIO-001', precio: 9000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Canvas', codigo: 'CANVAS-001', precio: 18200, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Bandera 1.50x1', codigo: 'BANDERA-150x1', precio: 15000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Mueble', codigo: 'MUEBLE-001', precio: 2500, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Acrílico', codigo: 'ACRILICO-001', precio: 1500, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'UNSA', codigo: 'UNSA-001', precio: 0, tipo: 'otro', unidad: 'unidad' },

  // RESMAS Y PAPELES
  { nombre: 'Resma Logo Color', codigo: 'RESMA-LOGO-001', precio: 60000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Resma 1/Azul', codigo: 'RESMA-AZUL-001', precio: 25000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Resma Encolada Azul', codigo: 'RESMA-ENCOL-AZUL', precio: 14300, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Resma 1/ Negra', codigo: 'RESMA-NEGRA-001', precio: 27500, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Resma Encolado', codigo: 'RESMA-ENCOL-001', precio: 3500, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Talonarios 3 500', codigo: 'TALONARIOS-3500', precio: 3500, tipo: 'otro', unidad: 'unidad' },

  // CLÍNICA
  { nombre: 'Clínica', codigo: 'CLINICA-001', precio: 0, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Certificados A3', codigo: 'CERT-A3', precio: 2000, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Adhesivo', codigo: 'ADHESIVO-001', precio: 2500, tipo: 'otro', unidad: 'unidad' },

  // TARJETA Y CARÁTULA
  { nombre: 'Carátula A/L', codigo: 'CARATULA-AL', precio: 350, tipo: 'otro', unidad: 'unidad' },
  { nombre: 'Ficha 10x14', codigo: 'FICHA-10x14', precio: 150, tipo: 'otro', unidad: 'unidad' },

  // PATENTE
  { nombre: 'Patente', codigo: 'PATENTE-001', precio: 2500, tipo: 'otro', unidad: 'unidad' }
];

console.log(`📦 Cargando ${productos.length} productos...`);

db.serialize(() => {
  let insertados = 0;
  let actualizados = 0;

  productos.forEach((p, idx) => {
    // Generar código si no tiene
    const codigo = p.codigo || `PROD-${String(idx + 1).padStart(4, '0')}`;

    // Verificar si existe
    db.get('SELECT id FROM catalogo_productos WHERE codigo = ?', codigo, (err, row) => {
      if (row) {
        // Actualizar
        db.run(
          'UPDATE catalogo_productos SET nombre = ?, precio_base = ?, tipo = ?, unidad = ?, activo = 1 WHERE codigo = ?',
          p.nombre, p.precio, p.tipo, p.unidad, codigo,
          function(err) {
            if (err) console.error(`❌ Error actualizando ${p.nombre}:`, err.message);
            else {
              actualizados++;
              console.log(`✏️  [${actualizados}] ${p.nombre} - $${p.precio}`);
            }
          }
        );
      } else {
        // Insertar
        db.run(
          'INSERT INTO catalogo_productos (codigo, nombre, precio_base, tipo, unidad, activo) VALUES (?, ?, ?, ?, ?, 1)',
          codigo, p.nombre, p.precio, p.tipo, p.unidad,
          function(err) {
            if (err) console.error(`❌ Error insertando ${p.nombre}:`, err.message);
            else {
              insertados++;
              console.log(`✅ [${insertados}] ${p.nombre} - $${p.precio}`);
            }
          }
        );
      }
    });
  });

  // Esperar 2 segundos y cerrar
  setTimeout(() => {
    db.all('SELECT COUNT(*) as total, SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos FROM catalogo_productos', (err, rows) => {
      const { total, activos } = rows[0];
      console.log(`\n✅ Operación completada:`);
      console.log(`   Total productos: ${total}`);
      console.log(`   Activos: ${activos}`);
      console.log(`   Insertados: ${insertados}`);
      console.log(`   Actualizados: ${actualizados}`);
      db.close();
    });
  }, 2000);
});
