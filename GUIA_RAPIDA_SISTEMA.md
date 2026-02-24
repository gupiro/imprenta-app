# ⚡ GUÍA RÁPIDA - SISTEMA IMPRENTA APP

## 🚀 INICIO RÁPIDO

### 1. Acceder al Sistema
```
URL:      http://localhost:3000
Usuario:  admin
Password: admin123
```

### 2. Crear Presupuesto
```
Menu → Presupuestos → Nuevo
├─ Nombre cliente
├─ Teléfono
├─ Email (opcional)
├─ Agregar items
│  ├─ Producto/Descripción
│  ├─ Cantidad
│  ├─ Precio unitario
│  └─ Descuento (opcional)
└─ Guardar
```

### 3. Editar Presupuesto
```
Presupuestos → Ver → Editar
├─ Cambiar cantidad, precio, descuento
├─ Los totales se recalculan automáticamente
└─ Guardar cambios
```

### 4. Convertir a Pedido
```
Presupuestos → Ver → Crear Pedido
├─ Se crea pedido con items
├─ Presupuesto marca como "CONVERTIDO"
└─ Redirecciona a detalles del pedido
```

### 5. Cambiar Estado del Pedido
```
Pedidos → Pendientes/Producción/Listos → Detalle
├─ Selector de estado
├─ Seleccionar nuevo estado
└─ Se guarda automáticamente
```

**Estados disponibles:**
- PENDIENTE (rojo) → EN_PRODUCCION (amarillo) → LISTO (azul) → ENTREGADO (verde)

### 6. Registrar Pago
```
Pedidos → Detalle → Cancelar Deuda
├─ Monto a pagar
├─ Método de pago (Efectivo/Transfer/Tarjeta/QR)
├─ Se registra en Caja automáticamente
└─ Se reduce saldo adeudado
```

### 7. Ver Comprobante (NUEVO)
```
Pedidos → Entregados → Detalle → Ver Comprobante
├─ Recibo profesional
├─ Imprimible/PDF
└─ Estado de pago visible
```

### 8. Enviar WhatsApp (NUEVO)
```
Pedidos → Entregados → WhatsApp (si hay deuda)
├─ Obtiene teléfono del cliente
├─ Mensaje: "Pedido #X está listo. Deuda: $Y"
└─ Abre WhatsApp Web
```

---

## 📊 MÓDULOS PRINCIPALES

### Presupuestos
- ✅ Crear presupuesto
- ✅ Editar presupuesto (NUEVO)
- ✅ Cambiar estado
- ✅ Convertir a pedido
- ✅ Imprimir/PDF

### Pedidos
- ✅ Crear pedido
- ✅ Cambiar estado
- ✅ Registrar pago
- ✅ Ver detalles
- ✅ Comprobante (NUEVO)
- ✅ WhatsApp (NUEVO)
- ✅ Cancelar pedido

### Caja Diaria
- ✅ Ingresos/Egresos
- ✅ Desglose por método (NUEVO)
- ✅ Registrar movimientos
- ✅ Ver historial
- ✅ Integración con pedidos

### Catálogo
- ✅ CRUD productos
- ✅ Tipos: Lona, Unidad
- ✅ Precio base y mínimo

### Gastos
- ✅ Registrar gastos
- ✅ Categorizar
- ✅ Marcar pagado
- ✅ Filtrar por mes

### Proveedores
- ✅ CRUD proveedores
- ✅ Contacto
- ✅ Rubro/Categoría

---

## 💳 MÉTODOS DE PAGO

En la caja diaria se desglosan automáticamente:
- 💵 Efectivo
- 🏦 Transferencia
- 💳 Tarjeta
- 📱 QR

---

## 🎯 TAREAS COMUNES

### Crear presupuesto y convertir a pedido
```
1. Presupuestos → Nuevo
2. Llenar datos cliente
3. Agregar items
4. Guardar
5. Ir a detalle → Crear Pedido
```

### Cambiar estado de todos los pedidos
```
Pendientes     → En Producción
En Producción  → Listos
Listos         → Entregados
```

### Cobrar deuda a cliente
```
1. Pedidos → Detalle
2. Botón "Cancelar Deuda"
3. Ingresar monto
4. Seleccionar método pago
5. Se registra automáticamente en Caja
```

### Imprimir recibo del pedido
```
1. Pedidos → Entregado
2. "Ver Comprobante"
3. Botón "Imprimir/PDF"
4. Guardar o imprimir
```

### Enviar WhatsApp al cliente
```
1. Pedidos → Entregados
2. Botón "WhatsApp" (solo si hay deuda)
3. Se envía: "Tu pedido #X está listo. Deuda: $Y"
```

---

## 📱 PANTALLAS PRINCIPALES

### Dashboard
```
Tarjetas KPI:
├─ Pendientes (rojo)
├─ En Producción (amarillo)
├─ Listos (azul)
├─ Entregados (verde)
├─ Presupuestos (púrpura)
├─ Ingresos hoy
├─ Ingresos mes
└─ Clientes activos

Bottom:
├─ Top deudores
└─ Stock bajo
```

### Presupuestos
```
Listado:
├─ ID
├─ Cliente
├─ Precio
├─ Estado
└─ Acciones

Detalle:
├─ Datos cliente
├─ Items con precios
├─ Total
├─ Botones: Editar, Crear Pedido, Eliminar
└─ WhatsApp (si tiene teléfono)
```

### Pedidos
```
Por estado:
├─ Pendientes
├─ En Producción
├─ Listos
└─ Entregados

Detalle:
├─ Cliente
├─ Productos
├─ Estado (selector)
├─ Total
├─ Pago (registrado)
├─ Botones: Cambiar estado, Cancelar deuda
└─ Botones: Comprobante, WhatsApp
```

### Caja Diaria
```
Resumen:
├─ Ingresos
├─ Egresos
└─ Saldo

Desglose:
├─ 💵 Efectivo
├─ 🏦 Transferencia
├─ 💳 Tarjeta
└─ 📱 QR

Tabla:
├─ Tipo (Ingreso/Egreso)
├─ Concepto
├─ Categoría
├─ Método
├─ Monto
└─ Hora
```

---

## 🔑 ATAJOS DE TECLADO

- Tab → Navegar entre campos
- Enter → Enviar formulario
- ESC → Cerrar modal
- Ctrl+P → Imprimir (en comprobante)

---

## ⚠️ TIPS IMPORTANTES

1. **Los totales de presupuestos se calculan automáticamente**
   - No necesitas sumarlos manualmente
   - Se actualiza en tiempo real

2. **Los pagos se registran en Caja automáticamente**
   - Cuando pagas un pedido → se va a Caja
   - Cuando devuelves → se registra como egreso

3. **WhatsApp solo aparece si:**
   - Hay deuda pendiente
   - El cliente tiene teléfono registrado
   - El pedido está ENTREGADO

4. **El comprobante es imprimible:**
   - Optimizado para papel A4
   - Tiene toda la información necesaria
   - Se puede guardar como PDF

5. **Los presupuestos se pueden editar:**
   - Cambiar cantidad, precio, descuento
   - Los totales se recalculan automáticamente
   - No afecta pedidos ya creados

---

## 🆘 TROUBLESHOOTING

### El servidor no inicia
```bash
npm start
# Si da error:
npm install
npm start
```

### No puedo acceder
```
✅ Verificar: http://localhost:3000
✅ Usuario: admin
✅ Password: admin123
```

### No me deja crear pedido
```
✅ Seleccionar cliente
✅ Agregar al menos 1 producto
✅ Ingresar precio total
```

### El WhatsApp no funciona
```
✅ El cliente debe tener teléfono
✅ Debe haber deuda pendiente
✅ Pedido debe estar ENTREGADO
✅ Necesita navegador con acceso a WhatsApp Web
```

### El comprobante no se abre
```
✅ Verificar que el navegador permite popups
✅ Permitir ventanas emergentes para localhost
✅ El pedido debe estar registrado en BD
```

---

## 📞 SOPORTE RÁPIDO

1. Revisar consola del navegador (F12)
2. Verificar logs del servidor (terminal)
3. Comprobar estado de la BD
4. Reiniciar servidor: `npm start`

---

## 🎓 CAPACITACIÓN BÁSICA

### Para vendedor nuevo
1. Crear presupuesto desde cero
2. Editar presupuesto existente
3. Convertir presupuesto a pedido
4. Cambiar estado de pedido

### Para operario
1. Ver pedidos en producción
2. Cambiar estado a "LISTO"
3. Ver detalle de productos
4. Marcar como entregado

### Para administrador
1. Ver dashboard completo
2. Registrar gastos
3. Agregar proveedores
4. Generar reportes
5. Gestionar usuarios

---

**Versión:** 2.0
**Estado:** ✅ Operativo
**Última actualización:** 2024
