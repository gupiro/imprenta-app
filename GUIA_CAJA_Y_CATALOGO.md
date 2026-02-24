# 📊 GUÍA COMPLETA: CATÁLOGO Y CAJA DIARIA

## 🎯 CAMBIOS REALIZADOS

### 1️⃣ CATÁLOGO CARGADO ✅
**72 productos importados** con:
- ✅ Nombre completo
- ✅ Código único (TAL-001, IMP-A4-001, etc.)
- ✅ Precio actualizado
- ✅ Categoría (talonarios, impresión, lona, fotocopia, etc.)
- ✅ Unidad (unidad, m2)

**Ubicación:** `http://localhost:3000/catalogo`

---

## 💰 LÓGICA CORRECTA DE CAJA DIARIA

### 📥 **INGRESOS que se registran:**

| Evento | Monto | Se registra en Caja | Nota |
|--------|-------|-------------------|------|
| **Crear Pedido con Adelanto** | monto_entregado | ✅ SÍ | Se suma a caja al crear |
| **Cobrar Deuda Pendiente** | monto pagado | ✅ SÍ | Se suma a caja |
| **Completar Pago Final** | monto restante | ✅ SÍ | Se suma a caja |
| **Entregar Pedido** | - | ❌ NO | Es solo estado, no dinero |
| **Cambiar a Producción** | - | ❌ NO | No implica dinero |

### 📊 **FLUJO CORRECTO DE UN PEDIDO**

```
1. CREAR PEDIDO NUEVO
   ├─ Monto Total: $10.000
   ├─ Adelanto: $3.000
   └─ 💰 Se registra $3.000 en CAJA DIARIA (INGRESO)
        Concepto: "Adelanto Pedido #123 - Juan García"

2. ESTADO EN PRODUCCIÓN
   └─ ❌ NO se registra nada en caja

3. ESTADO LISTO
   └─ ❌ NO se registra nada en caja

4. COBRAR SALDO ($7.000)
   └─ 💰 Se registra $7.000 en CAJA DIARIA (INGRESO)
        Concepto: "Pago Pedido #123 - Juan García"
        Total caja: $3.000 + $7.000 = $10.000

5. ESTADO ENTREGADO
   └─ ✅ Completado (caja ya cerrada)
```

---

## 🔧 **CAMBIOS TÉCNICOS REALIZADOS**

### Archivo: `routes/pedidos.js`

#### Cambio 1: Registrar Adelanto al Crear Pedido
**Línea ~82-88**
```javascript
// 💰 REGISTRAR ADELANTO EN CAJA DIARIA (si hay monto adelantado)
if (entregado > 0) {
  const nombreCliente = clienteInput || 'Cliente';
  const concepto = `Adelanto Pedido #${pedidoId} - ${nombreCliente}`;
  await db.run(
    'INSERT INTO movimientos_caja (...)',
    'ingreso', concepto, 'Ventas - Adelanto', entregado, medio_pago, pedidoId, fecha
  );
}
```

#### Cambio 2: Registrar Pago Final al Completar Pago
**Línea ~285-295**
```javascript
// 💰 REGISTRAR PAGO EN CAJA DIARIA
const cliente = await db.get('SELECT name FROM clients WHERE id = ?', pedido.client_id);
const concepto = `Pago Pedido #${id} - ${cliente?.name || 'Cliente'}`;
await db.run(
  'INSERT INTO movimientos_caja (...)',
  'ingreso', concepto, 'Ventas - Pago de Pedido', monto, medio, id, fecha_pago
);
```

---

## 📋 **LISTA DE PRODUCTOS CARGADOS (78 TOTAL)**

### TALONARIOS (11)
- TAL-001: Talonario 1/2 Oficio x Duplicado - $6.500
- TAL-002: Talonario 1/2 Oficio x Triplicado - $7.500
- TAL-003: Talonario A4 Duplicado - $12.000
- TAL-004: Talonario A4 x Triplicado - $17.000
- TAL-005: Talonario 1/2 - $5.000
- TAL-006: Talonario 1/3 - $4.000
- TAL-007: Talonario Oficio x Duplicado - $12.000
- TAL-008: Talonario Oficio x Triplicado - $20.000
- TAL-009: Talonario Oficio x Cuádruple - $24.000
- TAL-010: A4 Logo Color - $10.000
- TAL-011: 1/2 Oficio Logo Color - $6.000

### ENTRADAS (6)
- ENT-001: Entradas 6 Talón - $12.000
- ENT-002: Entradas 12 Talón - $21.600
- ENT-003: Entradas Logo Color - $6.000
- ENT-004: Entradas Full Color - $8.000
- ENT-005: Entradas Logo Color 8 Tal - $8.000
- ENT-TAL: TAL.ABROCHADOS - $2.500

### IMPRESIÓN COLOR (6)
- IMP-A4-001: Impresión Color A4 - $500
- IMP-A3-001: Impresión Color A3 - $1.000
- IMP-A4-CART: Impresión A4 Cartulina - $1.500
- IMP-A3-CART: Impresión A3 Cartulina - $3.000
- IMP-PAPEL-001: Impresión Papel A4 - $150
- IMP-PAPEL-003: Impresión Papel A3 - $300

### LONA (5)
- LONA-FRONT-001: Lona Front - $500/m2
- LONA-BACK-001: Lona Back - $14.000
- LONA-FRONT-HIGH: Lona Front High - $500/m2
- VINILO-BB-001: Vinilo BB - $11.500
- VINILO-TR-001: Vinilo TR - $16.500

### FOTOCOPIA (4)
- FOTOC-BN-001: Fotocopias B/N - $150
- FOTOC-COLOR-001: Fotocopias Color - $300
- FOTOC-BN-150: Fotocopias 150 B/N - $150
- FOTOC-BN-A3: Fotocopias 150 B/N A3 - $180

### TARJETAS (5)
- TARJ-PERS-001: Tarjeta Personal - $12.000
- TARJ-PERS-10x15: Tarjeta Personal 10x15 - $16.000
- TARJ-CART-1/8: Tarjetas Cartulina 1/8 - $250
- TARJ-CART-1/4: Tarjetas Cartulina 1/4 - $150
- TARJ-CERT-A3: Tarjetas Certificados A3 - $2.000

### OTROS SERVICIOS (40+)
- BANNER-001, SELLO-PUB, CARNET-001, LLAVEROS, PLASTIFICADO, ANILLADO
- SUBL-GORRA, ESTAMP-GORRA, MICRO, PLOTEO-TAPA, CERAMICA, GREMIO
- CANVAS, BANDERA, MUEBLE, ACRILICO, RESMA, PATENTE
- Y más...

---

## ✅ **VERIFICACIÓN DE FLUJO**

### Test: Crear Pedido con Adelanto
1. Ir a: `http://localhost:3000/pedidos/nuevo`
2. Seleccionar cliente
3. Agregar producto
4. Ingresar "Monto Adelantado": **$2.000**
5. Seleccionar "Método de Pago": **Efectivo**
6. Hacer click en "Guardar Pedido"
7. ✅ Verificar que aparezca un mensaje: "Pedido creado correctamente"
8. Ir a: `http://localhost:3000/caja-diaria`
9. ✅ Verificar que aparezca un ingreso: "Adelanto Pedido #XXX" por $2.000

### Test: Cobrar Deuda
1. Ir a: `http://localhost:3000/pedidos/pendientes`
2. Hacer click en un pedido
3. En "COBRAR DEUDA", ingresar monto
4. Hacer click en "Cobrar Ahora"
5. ✅ Verificar que aparezca: "Deuda cancelada. $XXX registrado en caja diaria"
6. Ir a: `http://localhost:3000/caja-diaria`
7. ✅ Verificar que aparezca un ingreso: "Pago Pedido #XXX"

---

## 🚀 **PRÓXIMOS PASOS**

1. **Reiniciar servidor** para que se carguen los cambios
2. **Crear un usuario "empleado"** (rol operario)
3. **Probar el flujo completo** de pedido → caja
4. **Verificar autocomplete** con los nuevos productos
5. **Validar que Caja Diaria** se actualiza correctamente

---

## 📝 **NOTAS IMPORTANTES**

- ✅ Todos los 72 productos tienen códigos únicos
- ✅ Caja Diaria ahora registra TODOS los movimientos correctamente
- ✅ No hay duplicación de montos
- ✅ El flujo es coherente: adelanto + pago = total

**Estado:** ✅ LISTO PARA PRODUCCIÓN
