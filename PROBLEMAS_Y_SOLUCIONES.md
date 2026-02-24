# 🔧 PROBLEMAS ENCONTRADOS Y SOLUCIONES

## 🚨 PROBLEMA 1: Error en detalle.ejs
**Status:** ✅ **ARREGLADO**
- **Error:** `SyntaxError: missing ) after argument list`
- **Causa:** Paréntesis mal cerrados en forEach de imágenes (líneas 189-206)
- **Solución:** Reorganicé los tags EJS correctamente para cerrar los bucles

---

## 💰 PROBLEMA 2: Precio no coincide en lista de pendientes
**Status:** 🔍 **INVESTIGANDO**
- **Descripción:** Al crear un pedido, el precio total es diferente en `/pedidos/pendientes`
- **Posibles causas:**
  1. El precio de `nuevo.ejs` calcula mal (descuentos)
  2. En `pendientes.ejs` no se incluyen todos los productos
  3. Falta sumar descuentos al precio final

**Acción:** Necesito revisar cómo se calcula el precio en ambas vistas

---

## 👨‍💼 PROBLEMA 3: Vendedor sin acceso a Caja Diaria
**Status:** ⏳ **PENDIENTE**
- **Problema:** Usuarios con rol "vendedor" no ven Caja Diaria
- **Causa:** En `server.js` línea 70, Caja Diaria solo está en `['admin','empleado']`
- **Solución:** Agregar 'vendedor' a la lista de roles que ven Caja Diaria

```javascript
// Cambiar de:
{ name: 'caja-diaria', label: 'Caja', url: '/caja-diaria', roles: ['admin','empleado'] },

// A:
{ name: 'caja-diaria', label: 'Caja', url: '/caja-diaria', roles: ['admin','empleado','vendedor'] },
```

---

## 📱 PROBLEMA 4: WhatsApp no tiene ruta de API
**Status:** ⏳ **PENDIENTE**
- **Problema:** El botón WhatsApp en detalle.ejs llama a `enviarWhatsApp()` que necesita `/api/pedidos/:id/cliente-phone`
- **Solución:** Agregar esta ruta en `routes/pedidos.js`:

```javascript
// Agregar antes de "return router;" en routes/pedidos.js
router.get('/:id/cliente-phone', async (req, res) => {
  try {
    const pedido = await db.get(
      'SELECT c.phone FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?',
      req.params.id
    );
    res.json({ phone: pedido?.phone || null });
  } catch (err) {
    res.json({ phone: null });
  }
});
```

---

## 🧾 PROBLEMA 5: No hay recibo de "Trabajo Listo"
**Status:** ⏳ **PENDIENTE**
- **Descripción:** Cuando un trabajo está LISTO, debería poder imprimirse un recibo
- **Solución:** Crear una ruta `/pedidos/:id/recibo-listo` que genere un PDF con:
  - Número de pedido
  - Cliente
  - Productos
  - Estado: LISTO PARA RETIRAR
  - Fecha de listo
  - QR con código de pedido

---

## 📊 PROBLEMA 6: No hay impresión de Caja Diaria
**Status:** ⏳ **PENDIENTE**
- **Descripción:** Usuario quiere imprimir la sábana de caja del día
- **Solución:** Agregar botón "Imprimir Caja" en `/caja-diaria` que genere PDF con:
  - Fecha
  - Todos los ingresos del día (nombre, concepto, monto, método)
  - Todos los egresos del día
  - Total ingreso
  - Total egreso
  - Saldo neto

---

## 🔄 PROBLEMA 7: Cancelación de deuda no se registra en Caja
**Status:** ⚠️ **PARCIALMENTE ARREGLADO**
- **Descripción:** Cuando se cancela un pedido, el monto adelantado debería volver a caja como EGRESO
- **Lo que ya está:** El pago se registra como ingreso
- **Lo que falta:** La cancelación de un pedido debería registrar un EGRESO (devolución)
- **Solución:** En `/pedidos/:id/cancelar-pedido`, agregar:

```javascript
// Si hay monto_entregado, registrar como EGRESO (devolución)
if (pedido.monto_entregado > 0) {
  const concepto = `Devolución Cancelación Pedido #${id} - ${cliente.name}`;
  await db.run(
    'INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, pedido_id, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)',
    'egreso', concepto, 'Devoluciones', pedido.monto_entregado, pedido.medio_pago || 'Efectivo', id, fecha_cancelacion
  );
}
```

---

## 📋 RESUMEN DE CAMBIOS NECESARIOS

| # | Problema | Prioridad | Estado |
|---|----------|-----------|--------|
| 1 | Error en detalle.ejs | 🔴 ALTA | ✅ ARREGLADO |
| 2 | Precio no coincide | 🔴 ALTA | 🔍 INVESTIGANDO |
| 3 | Vendedor sin Caja | 🟡 MEDIA | ⏳ PENDIENTE |
| 4 | WhatsApp sin ruta | 🟡 MEDIA | ⏳ PENDIENTE |
| 5 | Sin recibo Listo | 🟢 BAJA | ⏳ PENDIENTE |
| 6 | Sin impresión Caja | 🟢 BAJA | ⏳ PENDIENTE |
| 7 | Cancelación sin egreso | 🟡 MEDIA | ⏳ PENDIENTE |

---

## 📈 RECOMENDACIONES ADICIONALES

1. **Dashboard por Rol:**
   - Admin: Ver todo (deudores, stock, finanzas)
   - Vendedor: Ver ventas, caja, presupuestos
   - Operario: Ver producción, estados, caja
   - Empleado: Ver solo lo que toca

2. **Validaciones de Precio:**
   - Validar que el precio en nuevo.ejs = suma de productos
   - Verificar que no haya decimales incorrectos (redondeo)

3. **Historial de Cambios:**
   - Agregar tabla `pedidos_historial` para registrar:
     - Cambios de estado
     - Cambios de precio
     - Cambios de cliente
     - Quién hizo cada cambio y cuándo

4. **Notificaciones:**
   - Email cuando pedido cambia a estado LISTO
   - WhatsApp automático cuando se cobra deuda
   - Recordatorio diario de pedidos sin cobrar

5. **Reportes:**
   - Pedidos por estado
   - Clientes con más deuda
   - Productos más vendidos
   - Ganancias por día/mes
   - Tiempo promedio de producción

6. **Seguridad:**
   - No mostrar precios de costo a vendedores
   - Auditoría de quién modifica cada pedido
   - Logs de acceso

---

**Próximo paso:** Ejecutar los cambios de ALTA prioridad primero.
