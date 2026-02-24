# 🔥 AUDITORÍA COMPLETA - IMPRENTA APP
## PROBLEMAS ENCONTRADOS Y SOLUCIONES

### PROBLEMAS CRÍTICOS ENCONTRADOS

#### 1. ❌ PRESUPUESTOS - No se pueden cambiar valores
**Ubicación:** `routes/presupuestos.js` - Ruta de editar
**Problema:** La ruta `/presupuestos/:id/editar` crea un nuevo presupuesto en lugar de actualizar

#### 2. ❌ PRODUCCIÓN - Duplicación de trabajos
**Ubicación:** `routes/pedidos.js` línea 184
**Problema:** Hay rutas GET `/pedidos/en-produccion` duplicadas

#### 3. ❌ CATÁLOGO - Errores al cargar/editar
**Ubicación:** `controllers/catalogoController.js`
**Problema:** Los parámetros de `db.run()` no están pasados correctamente
- Línea 23: `await db.run(..., nombre, tipo...)`  ← FALTA separar parámetros
- Debe ser: `await db.run(..., nombre, tipo, precio_base, minimo || 1)`

#### 4. ❌ GASTOS - Error al registrar
**Ubicación:** `routes/gastos.js` línea 16
**Problema:** Tabla `gastos` no existe en BD o está mal estructura
**Solución:** Verificar `config/db.js` - agregar tabla si falta

#### 5. ❌ PROVEEDORES - Error
**Ubicación:** `routes/proveedores.js` línea 11
**Problema:** Tabla `proveedores` mal referenciada

#### 6. ❌ CAJA DIARIA - No desglosada por método
**Ubicación:** `views/cajaDiaria.ejs`
**Problema:** No muestra desglose (Efectivo, Tarjeta, Transferencia, QR)

#### 7. ❌ DASHBOARD - Falta etiqueta en números
**Ubicación:** `views/home.ejs` líneas sin etiqueta
**Problema:** Los $70.500 no tienen descripción clara

#### 8. ❌ PRESUPUESTO DETALLE - Secciones innecesarias visibles
**Ubicación:** `views/presupuestos/detalle.ejs`
**Problema:** Muestra "Subir Diseño Final" y "Comentarios"

#### 9. ❌ COMPROBANTE - No existe view imprimible
**Ubicación:** No existe `views/pedidos/comprobante.ejs`
**Problema:** No hay recibo para imprimir

#### 10. ❌ ENTREGADOS - Falta botón WhatsApp
**Ubicación:** `views/pedidos/entregados.ejs`
**Problema:** No hay botón para enviar WhatsApp

#### 11. ❌ ESTADO - No redirige al origen
**Ubicación:** `routes/pedidos.js` línea 115
**Problema:** `res.redirect('/pedidos/detalle')` redirige siempre a detalle, no donde se actualizó

#### 12. ❌ PRESUPUESTO - No cambiar cantidad en algunos campos
**Ubicación:** `views/presupuestos/nuevo.ejs`
**Problema:** Hay campos readonly por JavaScript

---

## ✅ SOLUCIONES A APLICAR

### SOLUCIÓN 1: Arreglar Catálogo (catalogoController.js)
```javascript
// ANTES (MALO):
await db.run('INSERT INTO...', nombre, tipo, precio_base, minimo || 1)

// DESPUÉS (BIEN):
await db.run('INSERT INTO catalogo_productos...VALUES(?,?,?,?)', nombre, tipo, parseFloat(precio_base), parseInt(minimo) || 1)
```

### SOLUCIÓN 2: Arreglar Presupuestos Edición
- Agregar ruta POST `/presupuestos/:id/editar` que actualice, no cree uno nuevo

### SOLUCIÓN 3: Arreglar Producción (Quitar duplicados)
- Revisar routes/pedidos.js - hay 2 rutas GET `/en-produccion`

### SOLUCIÓN 4: Crear Comprobante Imprimible
- Nueva view: `views/pedidos/comprobante.ejs`
- Nueva ruta: `GET /pedidos/:id/comprobante`

### SOLUCIÓN 5: Agregar WhatsApp en Entregados
- Botón en `views/pedidos/entregados.ejs`
- Enviar: "Hola, tu pedido #X está listo. Deuda: $Y. Venite a retirarlo"

### SOLUCIÓN 6: Desglosar Caja Diaria por Método
- Modificar `views/cajaDiaria.ejs` tabla
- Agregar columna "Método de Pago" a cada movimiento

### SOLUCIÓN 7: Agregar Tabla Gastos y Proveedores a BD
- Si no existen en `config/db.js`

---

## PRIORIDAD DE ARREGLOS

**HORAS 1-2: CRÍTICOS**
1. Catálogo - arreglar errores de parámetros
2. Gastos - verificar tabla existe
3. Proveedores - verificar tabla existe

**HORAS 2-4: FUNCIONALIDAD**
4. Presupuesto - permitir editar valores
5. Producción - quitar duplicados
6. Comprobante - crear view imprimible

**HORAS 4-6: MEJORAS**
7. WhatsApp - agregar botón
8. Caja - desglosar por método
9. Redirecciones - redirigir al origen

---

## VERIFICACIÓN NECESARIA

```
✅ Verificar config/db.js
  - Tabla gastos existe
  - Tabla proveedores existe
  - Todas las columnas correctas

✅ Verificar routes/
  - No hay rutas duplicadas
  - Parámetros correctos en db.run()

✅ Verificar views/
  - home.ejs tiene etiquetas claras
  - presupuestos/detalle.ejs sin secciones innecesarias
  - cajaDiaria.ejs desglosada

✅ Verificar controllers/
  - catalogoController.js parámetros correctos
  - presupuestosController.js edición funciona
```

---

**ESTADO:** 12 Problemas identificados
**PRÓXIMO PASO:** Comenzar reparación sistemática
