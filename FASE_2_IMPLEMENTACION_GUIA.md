# 🚀 FASE 2 - GUÍA DE IMPLEMENTACIÓN COMPLETA

## Estado Actual
✅ FASE 1 completada:
- Editar presupuestos con múltiples items
- Integración Pedidos ↔ Caja (cancelar deuda)
- Campos dinámicos por tipo de producto
- Acceso libre para testing

---

## 📋 FASE 2: LAS 4 MEJORAS PRINCIPALES

### [2.1] STOCK DESCONECTA AUTOMÁTICO ⏱️ 2 horas

**Objetivo:** Cuando creas un pedido, resta automáticamente del stock.

**Pasos:**

1. **Agregar tabla de movimientos_stock** en `config/db.js`:
```javascript
await db.run(`
  CREATE TABLE IF NOT EXISTS movimientos_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER REFERENCES stock(id),
    tipo TEXT,
    cantidad REAL,
    pedido_id INTEGER REFERENCES pedidos(id),
    fecha TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);
```

2. **Modificar `/pedidos/nuevo` POST** en `routes/pedidos.js`:
   - Después de crear el pedido, por cada producto:
     - Buscar en `stock` si existe ese material
     - Restar cantidad
     - Registrar movimiento en `movimientos_stock`
     - Si stock queda bajo mínimo, mostrar alerta

3. **Crear alerta en dashboard** si stock está bajo

---

### [2.2] PDF PROFESIONAL ⏱️ 3 horas

**Objetivo:** Generar PDFs de presupuestos y pedidos con formato factura.

**Pasos:**

1. **Instalar librería:**
   ```bash
   npm install puppeteer
   ```

2. **Crear controlador** `controllers/pdfController.js`:
```javascript
module.exports = (db) => {
  return {
    generarPDFPresupuesto: async (id) => {
      const presupuesto = await db.get('SELECT * FROM presupuestos WHERE id = ?', id);
      const items = await db.all('SELECT * FROM presupuesto_items WHERE presupuesto_id = ?', id);
      
      // Generar HTML
      const html = `
        <h1>PRESUPUESTO #${id}</h1>
        <h2>Imprenta El Gráfico</h2>
        ...
        <table>
          ${items.map(i => `<tr><td>${i.descripcion}</td><td>${i.cantidad}</td>...`).join('')}
        </table>
      `;
      
      // Convertir a PDF con puppeteer
      return html;
    }
  };
};
```

3. **Crear ruta** en `routes/presupuestos.js`:
```javascript
router.get('/:id/pdf', checkPermission, async (req, res) => {
  const pdf = await pdfController.generarPDFPresupuesto(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.send(pdf);
});
```

4. **Agregar botón en vista** `views/presupuestos/detalle.ejs`:
```html
<a href="/presupuestos/<%= presupuesto.id %>/pdf" class="btn btn-info">📄 Descargar PDF</a>
```

---

### [2.3] AUTOCOMPLETE EN BÚSQUEDAS ⏱️ 2 horas

**Objetivo:** Buscar clientes/productos mientras escribes (como Caja Diaria).

**Pasos:**

1. **Instalar Selectize.js:**
   ```bash
   npm install selectize
   ```

2. **Copiar script en `layout.ejs`:**
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/selectize.js/0.12.6/css/selectize.bootstrap-3.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/selectize.js/0.12.6/js/standalone/selectize.min.js"></script>
```

3. **Aplicar a presupuestos** `views/presupuestos/nuevo.ejs`:
```html
<select name="cliente_id" id="selectClientes" class="form-select"></select>

<script>
  $('#selectClientes').selectize({
    valueField: 'id',
    labelField: 'name',
    searchField: 'name',
    options: <%- JSON.stringify(clientes) %>,
    create: false
  });
</script>
```

4. **Crear API en `routes/api/clientes.js`:**
```javascript
router.get('/buscar', async (req, res) => {
  const q = req.query.q || '';
  const clientes = await db.all(
    'SELECT id, name FROM clients WHERE name LIKE ? LIMIT 10',
    `%${q}%`
  );
  res.json(clientes);
});
```

---

### [2.4] DASHBOARD MEJORADO ⏱️ 2.5 horas

**Objetivo:** Gráficos, resumen ejecutivo, alertas.

**Pasos:**

1. **Instalar Chart.js:**
   ```bash
   npm install chart.js
   ```

2. **Crear endpoint en `server.js`** para datos del dashboard:
```javascript
app.get('/api/dashboard-data', authMiddleware.isAuthenticated, async (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10);
  
  const ingresoHoy = await db.get(
    'SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo="ingreso" AND DATE(fecha)=?',
    hoy
  );
  
  const deuda = await db.get(
    'SELECT COALESCE(SUM(monto_restante), 0) AS total FROM pedidos WHERE monto_restante > 0'
  );
  
  const stockBajo = await db.all(
    'SELECT nombre, cantidad, stock_minimo FROM stock WHERE cantidad <= stock_minimo LIMIT 5'
  );
  
  res.json({ ingresoHoy, deuda, stockBajo });
});
```

3. **Actualizar vista** `views/home.ejs` con gráficos

---

## 🎯 PRIORIZACIÓN RECOMENDADA

**Semana 1:**
- [2.1] Stock automático (crítico para operación)
- [2.3] Autocomplete (mejora UX)

**Semana 2:**
- [2.2] PDF profesional (necesario para clientes)
- [2.4] Dashboard (visibilidad)

---

## 📊 ESTIMACIÓN TOTAL

| Feature | Tiempo | Complejidad |
|---------|--------|-------------|
| Stock automático | 2h | Media |
| PDF | 3h | Alta |
| Autocomplete | 2h | Baja |
| Dashboard | 2.5h | Media |
| **TOTAL** | **9.5h** | - |

---

## 🔧 TECNOLOGÍAS NECESARIAS

```bash
npm install puppeteer selectize chart.js
```

---

## 📝 PRÓXIMOS PASOS

1. **Implementar [2.1]** - Stock automático (crítico)
2. **Implementar [2.3]** - Autocomplete (mejora UX)
3. **Implementar [2.2]** - PDF (necesario)
4. **Implementar [2.4]** - Dashboard (bonificación)

---

## ✅ FASE 1 + 2 = SISTEMA COMPLETO

Al terminar FASE 2, tendrás:

✅ Presupuestos editables con múltiples items
✅ Pedidos con descuento de stock automático
✅ Integración Caja automática
✅ PDFs profesionales
✅ Búsquedas inteligentes
✅ Dashboard ejecutivo

**= Sistema de gestión de imprenta PROFESIONAL Y FUNCIONAL** 🎉

---

## 💡 BONUS: FASE 3 (futuro)

- Notificaciones por email/WhatsApp automáticas
- Reportes por período
- Gestión de proveedores mejorada
- Integraciones con APIs externas

