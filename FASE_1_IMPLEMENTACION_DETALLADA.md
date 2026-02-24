# 🚀 IMPLEMENTACIÓN FASE 1 - GUÍA PARA EL DESARROLLADOR

## Estado Actual del Problema

Tu proyecto tiene un **error crítico en el repositorio** que hace que no arranche:
- El archivo `routes/pedidos.js` hace `require('../database')` que **no existe**
- El archivo debería recibir `db` como parámetro (como hacen otros routes)
- Esto necesita una reparación antes de cualquier otra mejora

---

## ✅ SOLUCIÓN 0: REPARAR EL REPOSITORIO

### Paso 1: Corregir routes/pedidos.js
El archivo debe cambiar de:
```javascript
const db = require('../database');
```

A un export que reciba `db` como parámetro:
```javascript
module.exports = (db) => {
  const router = express.Router();
  // ... resto del código ...
  return router;
};
```

### Paso 2: Indentación
Todo el código dentro debe estar indentado 2 espacios dentro del `module.exports = (db) => {`

---

## 🎯 FASE 1: LAS 4 MEJORAS INMEDIATAS

Una vez reparado el repositorio, estas son las mejoras a implementar:

### [1.1] EDITAR PRESUPUESTOS (Nuevo formulario)

**Archivos a crear:**
- `views/presupuestos/editar.ejs` ✅ YA CREADO

**Archivos a modificar:**
- `routes/presupuestos.js` - Agregar rutas GET y POST para editar
- `views/presupuestos/detalle.ejs` - Botón "Editar"
- `config/db.js` - Agregar campos `descuento` y `estado` a tabla `presupuestos`

**Rutas a agregar:**
```javascript
// GET: mostrar formulario
router.get('/:id/editar', async (req, res) => { ... })

// POST: guardar cambios
router.post('/:id/editar', upload.single('archivo_imagen'), async (req, res) => { ... })
```

**BD:** Ejecutar migraciones:
```sql
ALTER TABLE presupuestos ADD COLUMN descuento REAL DEFAULT 0;
ALTER TABLE presupuestos ADD COLUMN estado TEXT DEFAULT 'PENDIENTE';
```

---

### [1.2] CANCELAR DEUDA - Integración Pedidos → Caja

**Archivos a modificar:**
- `routes/pedidos.js` - Agregar ruta POST
- `views/pedidos/detalle.ejs` - Botón + Modal

**Ruta a agregar:**
```javascript
router.post('/:id/cancelar-deuda', checkPermission, (req, res) => {
  // 1. Leer datos de formulario: monto_a_pagar, metodo_pago
  // 2. Validar que monto ≤ saldo
  // 3. Actualizar pedido: monto_entregado += monto, monto_restante -=monto
  // 4. Insertar AUTOMÁTICAMENTE en movimientos_caja
  // 5. Redirigir con flash success
})
```

**Modal HTML:**
```html
<div class="modal" id="modalCancelarDeuda">
  <form method="POST" action="/pedidos/:id/cancelar-deuda">
    <input type="number" name="monto_a_pagar" required>
    <select name="metodo_pago" required>
      <option>Efectivo</option>
      <option>Transferencia</option>
      <option>Tarjeta</option>
    </select>
  </form>
</div>
```

**BD:** Asegurarse de que la tabla `pedidos` tenga:
- `monto_entregado` (decimal)
- `monto_restante` (decimal)  
- `fecha_pago` (text)
- `medio_pago` (text)
- `estado_pago` (text: PENDIENTE, PARCIAL, PAGADO)

---

### [1.3] AUTOCOMPLETE EN BÚSQUEDAS

**Archivos a modificar:**
- `views/presupuestos/nuevo.ejs` - Cliente select → autocomplete
- `views/pedidos/nuevo.ejs` - Cliente select → autocomplete
- `public/js/autocomplete.js` - Crear librería reutilizable

**Opciones:**
1. **Selectize.js** (recomendado - muy simple)
2. **Typeahead.js** (más avanzado)

**Instalación:**
```bash
npm install selectize
```

**Uso en HTML:**
```html
<select name="cliente_id" class="autocomplete-clients">
  <option value="">Escribir nombre...</option>
  <!-- Se llena dinámicamente -->
</select>

<script>
  $('select.autocomplete-clients').selectize({
    valueField: 'id',
    labelField: 'name',
    searchField: 'name',
    load: function(query, callback) {
      fetch(`/api/clientes?search=${query}`)
        .then(r => r.json())
        .then(data => callback(data))
        .catch(() => callback());
    }
  });
</script>
```

**Endpoints ya existentes:**
- `GET /api/clientes?search=nombre`
- `GET /api/productos?search=nombre`

---

### [1.4] LIMPIAR RUTAS DUPLICADAS DE PEDIDOS

**Archivos a modificar:**
- `routes/pedidos.js` - Eliminar rutas viejas
- `server.js` - Actualizar imports

**Rutas a ELIMINAR:**
- `/pedidos/nuevo-antiguo` ❌
- `/pedidos/nuevo-con-catalogo` ❌ (mantener si se usa)
- `/pendientes` → redirigir a `/pedidos?estado=PENDIENTE`
- `/revision` → redirigir a `/pedidos?estado=EN_REVISION`

**Rutas a MANTENER:**
- `GET  /pedidos` → lista con filtro por estado (query param)
- `GET  /pedidos/nuevo` → formulario único
- `POST /pedidos/nuevo` → crear pedido
- `GET  /pedidos/detalle/:id` → detalle

---

## 📊 ESTIMACIÓN DE TIEMPO (CORRECTA)

| Tarea | Tiempo | Dependencia |
|-------|--------|-------------|
| [0] Reparar BD y rutas | 30 min | - |
| [1.1] Editar presupuestos | 1 hora | [0] |
| [1.2] Cancelar deuda | 45 min | [0] |
| [1.3] Autocomplete | 1 hora | [0] |
| [1.4] Limpiar rutas | 30 min | [0] |
| **TOTAL FASE 1** | **~4 horas** | - |

---

## 🔧 PRÓXIMOS PASOS INMEDIATOS

### PRI0: Arreglar el repositorio
1. Abre `routes/pedidos.js`
2. Encuentra la línea `const db = require('../database');`
3. Elimínala
4. Envuelve todo el código en `module.exports = (db) => { ... }`
5. Indenta el contenido

### PRIO 1: Rutas de presupuestos
1. Las vistas (`editar.ejs`, botón en detalle) ya están creadas
2. Solo falta agregar las rutas en `routes/presupuestos.js`

### PRIO 2: Modal de cancelar deuda
1. El modal HTML ya está en `views/pedidos/detalle.ejs`
2. Solo falta la ruta POST en `routes/pedidos.js`

### PRIO 3: Autocomplete
1. Instalar librería (selectize o typeahead)
2. Crear scripts JS reutilizables
3. Aplicar a formularios

---

## ⚠️ ADVERTENCIAS

1. **No confundir formatos de BD:**
   - Las rutas usan `db.prepare()` (better-sqlite3 sync)
   - El config/db.js usa `await db.run()` (sqlite async)
   - Mantenerse consistente en cada archivo

2. **Validaciones en cliente Y servidor:**
   - Validar monto en cliente (HTML)
   - Validar monto en servidor (POST handler)
   - Nunca confiar solo en cliente

3. **Testing:**
   - Crear usuario de test
   - Probar flujo completo presupuesto → pedido → pago
   - Verificar que caja_diaria reciba movimiento automático

---

## 📝 CHECKLIST FINAL

- [ ] Reparar require en pedidos.js
- [ ] Agregar rutas editar presupuestos  
- [ ] Agregar ruta cancelar deuda
- [ ] Agregar modal en detalle.ejs
- [ ] Verificar movimientos_caja se registran
- [ ] Agregar campos de descuento y estado a presupuestos
- [ ] Implementar autocomplete
- [ ] Limpiar rutas viejas
- [ ] Testear flujo completo
- [ ] Documentar cambios

---

## 🎁 BONUS: Scripts SQL Para Setup

```sql
-- Agregar campos faltantes
ALTER TABLE presupuestos ADD COLUMN descuento REAL DEFAULT 0;
ALTER TABLE presupuestos ADD COLUMN estado TEXT DEFAULT 'PENDIENTE';

-- Verificar estructura
PRAGMA table_info(presupuestos);
PRAGMA table_info(pedidos);
PRAGMA table_info(movimientos_caja);
```

---

¿Necesitas ayuda con algún punto específico? Dime cuál es el primer paso que quieres hacer.
