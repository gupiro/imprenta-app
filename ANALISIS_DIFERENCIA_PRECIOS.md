# 🔍 ANÁLISIS: Diferencia de Precios (ENCONTRADO EL BUG)

## El Problema

El usuario reporta: "Cuando creo un pedido, el precio en `nuevo.ejs` no coincide con el que aparece en `pendientes.ejs`"

## Análisis del Código

### Frontend (nuevo.ejs) - Cálculo CORRECTO ✅

**Paso 1: Precio por línea de producto (línea 411-432)**
```javascript
// Para CADA producto:
function calcularPrecio(idx) {
  const precioBase = parseFloat(preciounit_${idx}.value) || 0;  // Ej: $500
  const cantidad = parseFloat(cantidad_${idx}.value) || 1;      // Ej: 2
  const descuento = parseFloat(descuento_${idx}.value) || 0;    // Ej: 10%

  let precioUnitario = precioBase;
  if (ancho && alto) {
    precioUnitario = (ancho * alto) * precioBase;  // Para lona: m2 * precio
  }

  const subtotal = precioUnitario * cantidad;      // 500 * 2 = 1000
  const descuentoMonto = subtotal * (descuento / 100);  // 1000 * 10% = 100
  const precioFinal = subtotal - descuentoMonto;   // 1000 - 100 = 900

  document.getElementById('precio_${idx}').value = precioFinal.toFixed(2);  // Guarda: 900
}
```

**Paso 2: Total general (línea 434-447)**
```javascript
function recalcularTotal() {
  let suma = 0;
  // Suma todos los precio[] (que son los precioFinal de cada línea)
  document.querySelectorAll('input[name="precio[]"]').forEach(input => {
    suma += parseFloat(input.value) || 0;
  });

  const descuentoGeneral = parseFloat(descuentoGeneral.value) || 0;  // Ej: 5%
  const descuentoMonto = suma * (descuentoGeneral / 100);            // suma * 5%
  const total = suma - descuentoMonto;                               // suma - 5%

  document.getElementById('totalPedido').value = total.toFixed(2);   // Valor que se envía!
}
```

✅ **El frontend calcula CORRECTAMENTE el total**

---

### Backend (routes/pedidos.js) - EL BUG ESTÁ AQUÍ 🐛

**Línea 75-79: Guardar el precio total**
```javascript
const precio = parseFloat(precioTotalPedido) || 0;  // Viene del frontend ✅
const infoPed = await db.run(
  'INSERT INTO pedidos (..., precio, ...) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  clientId, precio, ...  // Esto debería estar BIEN
);
```

**PERO... línea 100 tiene un BUG CRÍTICO:**
```javascript
// ❌ AQUÍ ESTÁ EL PROBLEMA:
const preciosArr = [].concat(req.body.precio || []).map(v => parseFloat(v) || 0);
// preciosArr[i] contiene: precioFinal (que ya es cantidad * precio - descuento)

const cantidadesArr = [].concat(cantidad || []).map(v => parseInt(v) || 1);
// cantidadesArr[i] contiene: la cantidad

for (let i = 0; i < materiales.length; i++) {
  const qty = cantidadesArr[i] || 1;  // Ej: 2
  const precioUnitario = preciosArr[i] || 0;  // Ej: 900 (YA INCLUYE CANTIDAD)
  const precioTotal = precioUnitario * qty;  // ❌ 900 * 2 = 1800 (INCORRECTO!)

  // Esto afecta a la tabla productos
  await db.run('INSERT INTO productos (..., precio, ...) VALUES (..., ?, ...)',
    ..., precioTotal, ...);
}
```

## El Impacto

**En la tabla `productos` (detalles):**
- Se guarda un precio DUPLICADO (2x lo correcto)
- Pero esto NO afecta a pendientes.ejs porque no suma desde aquí

**En la tabla `pedidos` (resumen):**
- Línea 75 guarda: `precio = parseFloat(precioTotalPedido)` ✅ CORRECTO
- Esto es lo que ve pendientes.ejs ✅ DEBERÍA ser correcto

---

## ¿Dónde está realmente el problema?

Necesito verificar 3 cosas:

### Opción A: ¿El precio se está modificando en otro lugar?
Buscar en routes/pedidos.js si hay algún UPDATE que modifique pedidos.precio

### Opción B: ¿Hay un problema de redondeo?
- Frontend: suma 900 + 800 + 700 = 2400
- Menos descuento: 2400 * 5% = 120
- Total: 2400 - 120 = 2280.00
- ¿Pero qué si hay decimales perdidos en el proceso?

### Opción C: ¿El form no está transmitiendo correctamente precioTotalPedido?
- En nuevo.ejs línea 151: `<input type="number" ... name="precioTotalPedido" ...>`
- ¿Este valor se está transmitiendo al servidor?

---

## SOLUCIÓN RECOMENDADA

### Paso 1: Corregir el bug de cantidad duplicada (línea 100)

**CAMBIAR DE:**
```javascript
const precioUnitario = preciosArr[i] || 0;
const precioTotal = precioUnitario * qty;
```

**A:**
```javascript
// preciosArr[i] ya contiene el precio final con cantidad incluida
const precioTotal = preciosArr[i] || 0;
```

### Paso 2: Agregar validación de integridad

Después de guardar el pedido, verificar que:
```javascript
const sumProductos = preciosArr.reduce((a, b) => a + parseFloat(b || 0), 0);
console.log('Precio guardado:', precio, '| Suma productos:', sumProductos);
if (Math.abs(precio - sumProductos) > 0.01) {
  console.warn('⚠️ Discrepancia de precio detectada!');
}
```

### Paso 3: Investigar si hay UPDATE que modifique el precio

Buscar todos los UPDATE de `pedidos` que incluyan `precio =`

---

## Prueba para Replicar el Bug

1. **Crear pedido de prueba con detalles:**
   - Producto 1: $1000 x 2 = $2000, menos 10% = $1800
   - Producto 2: $500 x 1 = $500, sin descuento = $500
   - Subtotal: $2300
   - Descuento general: 10% = -$230
   - **TOTAL ESPERADO: $2070**

2. **Verificar en las dos vistas:**
   - En nuevo.ejs justo antes de guardar: ¿dice $2070?
   - En pendientes.ejs después de guardar: ¿dice $2070?
   - En la base de datos (SQL): `SELECT id, precio FROM pedidos WHERE id=XX;` ¿dice 2070?

3. **Si hay discrepancia:**
   - Anotar exactamente cuál es la diferencia
   - Ej: frontend dice $2070, pendientes dice $2080
   - Ej: producto 1 fue sumado 2 veces
   - Ej: descuento general no se aplicó

---

## Estado

🔴 **CRÍTICO** - Bug identificado pero requiere prueba de campo
El usuario debe verificar con datos reales para confirmar dónde está el error exacto.

