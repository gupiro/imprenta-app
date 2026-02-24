# 📖 MANUAL DE USO - SISTEMA DE GESTIÓN DE IMPRENTA

## 🚀 INICIO RÁPIDO

### Arrancar el Servidor
```bash
npm start
```

El servidor estará disponible en: `http://localhost:3000`

**Acceso:** Sin contraseña (modo testing)

---

## 📋 FLUJOS OPERATIVOS

### 1️⃣ CREAR UN PRESUPUESTO

**Acceso:** Presupuestos → Nuevo Presupuesto

**Pasos:**
1. Seleccionar cliente existente o llenar datos de nuevo cliente
2. Click "➕ Agregar Item"
3. Para cada item:
   - Seleccionar producto (Lona, Fotocopias, etc.)
   - Los campos dinámicos aparecen según el tipo:
     - **Lona:** Ingresar Ancho (m) y Alto (m) → calcula m² automático
     - **Fotocopias:** Ingresar Cantidad
   - Precio unitario se completa automático
   - Opcional: Agregar descuento ($ o %)
4. Agregar más items si es necesario
5. Click "✅ Guardar Presupuesto"

**Resultado:** Presupuesto creado y visible en lista

---

### 2️⃣ EDITAR UN PRESUPUESTO

**Acceso:** Presupuestos → Abrir presupuesto → Click "✏️ Editar"

**Qué se puede hacer:**
- Cambiar cliente
- Modificar datos de contacto
- Editar items existentes
- Agregar nuevos items
- Eliminar items
- Cambiar descuentos

**Pasos:**
1. Hacer cambios deseados
2. Los cálculos se actualizan automáticamente
3. Click "💾 Guardar Cambios"

**Resultado:** Presupuesto actualizado en BD

---

### 3️⃣ CONVERTIR PRESUPUESTO A PEDIDO

**Acceso:** Presupuestos → Abrir presupuesto → Click "✅ Aprobar presupuesto → Crear pedido"

**Qué pasa:**
- Se crea automáticamente un pedido con los datos del presupuesto
- El presupuesto se marca como "usado"
- Se redirige al detalle del pedido creado

**Resultado:** Nuevo pedido en estado PENDIENTE

---

### 4️⃣ COBRAR UN PEDIDO

**Acceso:** Pedidos → Abrir pedido → Scroll "💰 Resumen Financiero" → Click "💳 Cancelar Deuda"

**Modal:**
1. Ingresar monto a pagar
2. Seleccionar método (Efectivo, Transferencia, Tarjeta, etc.)
3. Click "✅ Cobrar & Registrar en Caja"

**Qué pasa automáticamente:**
- Actualiza monto_entregado en pedido
- Actualiza saldo del pedido
- Registra movimiento en Caja Diaria
- Cambia estado a PAGADO si saldo = 0

**Resultado:** Pago registrado en sistema + aparece en Caja Diaria

---

### 5️⃣ VER CAJA DIARIA

**Acceso:** Caja → Caja Diaria

**Qué se ve:**
- Todos los movimientos (ingresos/egresos) de hoy
- Resumen: Ingresos totales, Egresos totales, Balance
- Incluye pagos de pedidos automáticamente

---

## 💡 TIPS DE USO

### Búsqueda de Clientes
- Puede seleccionar cliente existente de la lista
- O ingresar nombre nuevo (se crea automáticamente)

### Cálculo de Metros Cuadrados
Ejemplo: Si ingresas Ancho=2m y Alto=3m
- Sistema calcula automáticamente: 2 × 3 = 6 m²
- Precio se multiplica por 6 m²

### Descuentos
Dos formas de aplicar:
- **Porcentaje:** Ingresar 0.1 para 10% de descuento
- **Monto fijo:** Ingresar 500 para $500 de descuento

### Total Automático
Mientras editas items:
- El total se actualiza en tiempo real
- No necesitas calcular nada manualmente
- Se ve en el card azul abajo

---

## 🔍 NAVEGACIÓN

| Sección | URL | Función |
|---------|-----|---------|
| Home | `/` | Dashboard principal |
| Presupuestos | `/presupuestos` | Listar presupuestos |
| Nuevo Presupuesto | `/presupuestos/nuevo` | Crear presupuesto |
| Editar Presupuesto | `/presupuestos/:id/editar` | Modificar presupuesto |
| Pedidos | `/pedidos/pendientes` | Trabajos encargados |
| Nuevo Pedido | `/pedidos/nuevo` | Crear pedido |
| Caja Diaria | `/caja-diaria` | Ingresos/egresos del día |
| Clientes | `/clientes` | Gestión de clientes |

---

## ⚠️ RESTRICCIONES ACTUALES (Testing)

- ✅ Acceso sin autenticación
- ✅ Crear presupuestos ilimitados
- ✅ Editar presupuestos
- ✅ Crear pedidos
- ✅ Cobrar pedidos
- ✅ Ver caja diaria

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Presupuesto no se guarda
- Verificar que haya ingresado nombre y teléfono del cliente
- Verificar que haya al menos 1 item agregado
- Ver consola del navegador (F12) para errores

### Los campos dinámicos no aparecen al seleccionar Lona
- Asegurarse de que el producto "Lona" esté en catálogo
- Recargar página
- Verificar consola del navegador

### Caja no muestra el pago del pedido
- Esperar 2-3 segundos después de cobrar
- Recargar página
- Verificar que el pago se haya registrado en BD (se verá en el detalle del pedido)

---

## 📞 CONTACTO Y SOPORTE

Este sistema está en **FASE 1 - Funcional**.

Para mejoras o bugs, contactar al equipo técnico con:
1. Descripción del problema
2. Pasos para reproducir
3. Screenshot/Video si es posible

---

**Manual de Uso - Sistema de Gestión de Imprenta v1.0** ✅

