# 📊 ANÁLISIS COMPLETO DEL SISTEMA DE GESTIÓN DE IMPRENTA

**Fecha:** $(date)
**Versión:** 1.0

---

## 🎯 RESUMEN EJECUTIVO

Tu sistema es una **aplicación Node.js + Express + SQLite** para gestionar integralmente una imprenta. Tiene módulos para:
- ✅ Presupuestos (entrada de clientes)
- ✅ Pedidos (producción)
- ✅ Caja Diaria (ingresos/egresos)
- ✅ Stock (materiales)
- ✅ Gastos (contabilidad básica)
- ✅ Clientes (CRM simple)
- ✅ Proveedores (gestión)
- ✅ Usuarios (control de roles)

**Estado:** Funcional pero con gaps operativos que limitan su eficiencia

---

## 📐 ARQUITECTURA ACTUAL

### Stack Técnico
```
Frontend:   EJS (templates) + Bootstrap 5 + JavaScript vanilla
Backend:    Node.js + Express + sqlite (async wrapper)
BD:         SQLite (archivo: imprenta.db)
Uploads:    /public/uploads (imágenes)
Autenticación: Session-based + roles (admin, vendedor, operador)
```

### Estructura de Carpetas
```
imprenta-app/
├── config/
│   ├── db.js              ← Inicialización BD con migraciones
│   └── multer.js          ← Manejo de uploads
├── controllers/           ← Lógica de negocio
│   ├── cajaController.js
│   ├── pedidosController.js
│   ├── presupuestosController.js
│   ├── clientesController.js
│   └── ...
├── routes/
│   ├── api/               ← APIs JSON
│   ├── presupuestos.js
│   ├── pedidos.js
│   ├── gastos.js
│   ├── stock.js
│   ├── clientes.js
│   └── ...
├── views/
│   ├── presupuestos/
│   ├── pedidos/
│   ├── Caja/
│   ├── stock/
│   ├── partials/
│   └── layout.ejs         ← Template principal
├── public/
│   ├── uploads/           ← Imágenes de pedidos/presupuestos
│   ├── css/
│   └── js/
├── middleware/
│   └── permissions.js     ← Control de acceso
└── server.js              ← Punto de entrada
```

---

## 🔄 FLUJO DE NEGOCIO ACTUAL

### 1️⃣ FLUJO DE PRESUPUESTOS
```
Entrada Externa (cliente) o Interna
    ↓
/presupuestos/publico (formulario web) o /presupuestos/nuevo (admin)
    ↓
Crear presupuesto con:
  - Datos cliente
  - Producto del catálogo (con cálculo m² o unidad)
  - Archivo de referencia (opcional)
    ↓
Listar presupuestos + estado "usado" (binario)
    ↓
Enviar por WhatsApp (integración)
    ↓
Aprobar → Crear Pedido (marcar usado=1)
```

**Estado:** ✅ Funciona, pero sin edición post-creación

---

### 2️⃣ FLUJO DE PEDIDOS
```
Entrada: Presupuesto aprobado OR Nuevo pedido manual

Crear pedido:
  - Cliente (seleccionar o crear)
  - Productos (tabla `productos` + cantidad/dimensiones)
  - Seña + saldo
  - Medio de pago
  - Fecha entrega

Estados del pedido (4):
  PENDIENTE → EN_PRODUCCION → LISTO → ENTREGADO

Flujo visual:
  /pedidos?estado=PENDIENTE     (Trabajos encargados)
       ↓
  Subir diseño → EN_PRODUCCION
       ↓
  Finalizar diseño → LISTO (notificar cliente por WhatsApp)
       ↓
  Entregar + Cobrar → ENTREGADO

Seguimiento:
  - Comentarios en la revisión
  - Imágenes adjuntas
  - Historial de cambios
```

**Estado:** ✅ Funciona, pero:
- ❌ No integra pagos de pedidos con caja
- ❌ No hay opción "cancelar deuda" desde LISTO/ENTREGADO
- ❌ Rutas duplicadas (/pendientes, /nuevo-antiguo, etc.)

---

### 3️⃣ FLUJO DE CAJA DIARIA
```
Página: /caja-diaria

Resumen:
  - Ingresos (hoy)
  - Egresos (hoy)
  - Balance (hoy)

Registrar movimiento:
  INGRESO:
    - Producto del catálogo (autocomplete)
    - Cálculo automático por m² o unidad
    - Nuevo producto + precio base (crea en catálogo)
    - Medio de pago
    
  EGRESO:
    - Categoría predefinida (Insumos, Sueldos, etc.)
    - Descripción
    - Monto manual
    - Medio de pago

Tabla de movimientos (hoy):
  - Tipo, Concepto, Categoría, Monto, Medio, Hora

Base de datos:
  movimientos_caja (fecha, tipo, concepto, monto, etc.)
```

**Estado:** ✅ Funciona bien, pero:
- ❌ No recibe movimientos automáticos de pagos de pedidos
- ❌ No hay reporte de "pagos pendientes" de clientes

---

### 4️⃣ FLUJO DE STOCK
```
Gestión simple de materiales:
  - Nombre, unidad (kg, metro, m², etc.)
  - Cantidad actual
  - Stock mínimo (alerta si < mínimo)
  - Costo unitario
  - Proveedor asociado

Acciones:
  - Agregar material
  - Actualizar cantidad (ingreso/egreso)
  - Alertas de stock bajo

Base de datos:
  stock (nombre, cantidad, stock_minimo, precio_costo, etc.)
```

**Estado:** ✅ Funciona, pero:
- ❌ No desconecta stock cuando se crea pedido
- ❌ No hay historial de movimientos (entrada/salida)
- ❌ No integra compras a proveedores

---

### 5️⃣ FLUJO DE GASTOS
```
Registro simple de gastos mensuales:
  - Fecha, categoría, descripción, monto
  - Estado pago (pendiente/pagado)
  - Proveedor asociado (opcional)

Tabla: gastos

Acciones:
  - Listar por mes
  - Crear gasto
  - Marcar como pagado
  - Eliminar

Base de datos:
  gastos (fecha, categoria, descripcion, monto, estado_pago, proveedor_id)
```

**Estado:** ✅ Básico pero funciona

---

### 6️⃣ RELACIONES BD ACTUAL

```
PRESUPUESTOS
  ├─ cliente_id → CLIENTS
  ├─ producto_id → CATALOGO_PRODUCTOS
  └─ usado (0/1)

PEDIDOS
  ├─ client_id → CLIENTS
  ├─ estado (PENDIENTE, EN_PRODUCCION, LISTO, ENTREGADO)
  ├─ presupuesto_id → PRESUPUESTOS (opcional)
  ├─ senia, saldo
  └─ revision_archivo (JSON array)

PRODUCTOS (items dentro de pedido)
  ├─ pedido_id → PEDIDOS
  ├─ material, ancho, alto, cantidad
  ├─ precio (total calculado)
  └─ imagenes (JSON array)

CATALOGO_PRODUCTOS
  ├─ nombre, tipo (unidad/metro_cuadrado)
  ├─ precio_base, precio_costo
  ├─ minimo
  └─ publico (0/1)

CLIENTS
  ├─ name, address, phone, email
  └─ cuit

MOVIMIENTOS_CAJA
  ├─ tipo (ingreso/egreso)
  ├─ concepto
  ├─ categoria
  ├─ monto
  ├─ metodo_pago
  └─ fecha

STOCK
  ├─ nombre, unidad
  ├─ cantidad, stock_minimo
  ├─ precio_costo
  └─ proveedor_id → PROVEEDORES

GASTOS
  ├─ fecha, categoria, descripcion
  ├─ monto, estado_pago
  └─ proveedor_id → PROVEEDORES

PROVEEDORES
  ├─ nombre, telefono, email
  ├─ rubro, saldo_deuda
  └─ fecha_alta

USERS
  ├─ username, password
  ├─ rol (admin, vendedor, operador)
  └─ permisos (JSON)
```

---

## ❌ PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICOS (Afectan operación diaria)

1. **Desconexión Pedidos ↔ Caja**
   - Un pedido ENTREGADO con dinero recibido NO se registra automáticamente en caja
   - Hay que entrar dos veces al sistema: pedidos + caja
   - Riesgo: dinero no contabilizado

2. **Sin edición de Presupuestos**
   - Si creas un presupuesto con error, hay que borrarlo y crear uno nuevo
   - No hay descuentos dinámicos
   - No hay estado de "rechazado/pendiente"

3. **Rutas duplicadas en Pedidos**
   - `/pedidos/nuevo` (nuevo-optimizado.ejs)
   - `/pedidos/nuevo-antiguo` (antiguo)
   - `/pedidos/nuevo-con-catalogo` (obsoleto)
   - `/pedidos/pendientes` (GET html)
   - `/pedidos?estado=PENDIENTE` (GET json)
   - **Confusión de qué usar**

4. **Sin desconexión de Stock**
   - Un pedido se crea, pero NO descuenta del stock
   - No hay visibilidad si hay materiales disponibles
   - No hay avisos de comprar cuando stock bajo

5. **Relación Gastos ↔ Proveedores débil**
   - Un gasto se marca como pagado pero NO actualiza `saldo_deuda` en proveedor
   - No hay gestión real de deuda con proveedores

---

### 🟠 MAYORES (Usabilidad y control)

6. **Sin búsqueda de Cliente/Producto en varios módulos**
   - Presupuestos: select estático (lento con muchos clientes)
   - Gastos: sin autocomplete
   - Stock: sin búsqueda
   - **Caja Diaria sí tiene autocomplete** (buen ejemplo)

7. **Sin historial de cambios**
   - Un pedido se modifica pero no hay auditoría
   - No se sabe quién cambió qué
   - Imposible trackear cambios maliciosos

8. **Sin reporte de "Clientes con deuda"**
   - No hay forma de ver rápidamente quién debe dinero
   - No hay notificaciones de cobro vencido

9. **Cálculo de margen sin visibilidad**
   - Precio venta vs precio costo no está visible
   - Imposible saber si pedido es rentable
   - No hay dashboard de rentabilidad

10. **Datos de Cliente incompletos**
    - No hay campos para: domicilio, condición fiscal, régimen IVA
    - Límite de crédito no está gestionado
    - No hay historial de relación (cuánto gastó, cuándo)

---

### 🟡 MENORES (Mejoras de UX)

11. **Sin exportación a PDF/Excel**
    - Reportes solo visuales
    - Imposible compartir con contable

12. **Sin notificaciones por Email/WhatsApp automáticas**
    - Solo botones manuales para WhatsApp
    - Sin recordatorios de pago vencido

13. **Diseño inconsistente**
    - Algunos modals, otros formularios
    - Algunas tablas responsive, otras no

---

## ✅ FORTALEZAS ACTUALES

1. ✅ **Base de datos bien estructurada** - Migraciones automáticas, sin roturas
2. ✅ **Cálculos dinámicos m² y unidad** - Presupuestos con autocalc
3. ✅ **Caja Diaria con autocomplete** - Buena UX
4. ✅ **Integración WhatsApp** - Notificaciones nativas
5. ✅ **Control de roles y permisos** - Vendedor/operador/admin
6. ✅ **Upload de archivos y thumbnails** - Con sharp.js
7. ✅ **Comentarios en pedidos** - Colaboración entre equipo

---

## 🚀 OPORTUNIDADES DE MEJORA (Priorizadas)

### FASE 1: CONECTAR OPERACIONES (Impacto ALTO - 8-10 horas)

**[P1.1] Edición de Presupuestos**
- Permitir editar presupuesto después de crear
- Agregar estados: PENDIENTE, APROBADO, RECHAZADO, CONVERTIDO
- Agregar descuentos (% o monto fijo) con recalc automático
- Agregar campo "razón_rechazo" para auditoría

**[P1.2] Integración Pedidos → Caja**
- Crear ruta: `POST /pedidos/:id/cancelar-deuda`
- Modal en `/pedidos/detalle/:id` para "Cobrar" o "Cancelar deuda"
- Registrar automáticamente en `movimientos_caja`
- Actualizar `saldo_deuda` del pedido a 0
- Flash: "Pedido pagado ✅ + $XXX registrado en caja"

**[P1.3] Unificar Rutas de Pedidos**
- Mantener SOLO: `/pedidos` (list) + `/pedidos/nuevo` (form único)
- Redirigir rutas viejas a nuevas
- Limpiar rutas obsoletas

---

### FASE 2: MEJORAR USABILIDAD (Impacto MEDIO - 12-15 horas)

**[P2.1] Autocomplete en todo**
- Clientes en presupuestos (como caja diaria)
- Productos en presupuestos (como nuevo-optimizado)
- Proveedores en gastos y stock
- Implementar con `Selectize.js` o `Typeahead.js`

**[P2.2] Integración Stock ↔ Pedidos**
- Al crear pedido, descontar stock automáticamente
- Alerta si no hay stock: "Stock insuficiente - Queda X" → opción de backorder
- Crear tabla `movimientos_stock` (entrada/salida con razón)
- Reportar cuando stock cae bajo mínimo

**[P2.3] Gestión de Deuda de Proveedores**
- Cuando se paga un gasto: `UPDATE proveedores SET saldo_deuda = 0 WHERE id = ?`
- Dashboard: "Proveedores con Deuda" (deuda vencida + próxima)
- Generar OC (orden de compra) simple

---

### FASE 3: DASHBOARD Y REPORTES (Impacto MEDIO - 10-12 horas)

**[P3.1] Dashboard Ejecutivo**
- Cards: Ingresos/Egresos/Balance (día/mes/año)
- Gráficos: Ventas por tipo de producto, Clientes top, Productos top
- Alertas: Stock bajo, Deuda vencida, Pedidos LISTO hace X días

**[P3.2] Reportes Exportables**
- Reporte mensual (PDF) con ingresos/egresos/neto
- Listado de clientes con deuda (Excel)
- Historial de stock (entradas/salidas)
- Resumen de proveedores

**[P3.3] Auditoría de Cambios**
- Tabla `cambios_auditoria` (pedido_id, campo, valor_antes, valor_despues, usuario, fecha)
- Crear log cuando se edita pedido/presupuesto
- Vista de historial completo

---

### FASE 4: CRM Y COMUNICACIÓN (Impacto BAJO - 8-10 horas)

**[P4.1] Mejorar Datos de Cliente**
- Agregar: Domicilio, Localidad, C.P., Condición fiscal, Teléfono secundario
- Historial de compras (total gastado, último pedido, promedio)
- Límite de crédito

**[P4.2] Notificaciones Automáticas**
- Email al cliente cuando pedido pasa a LISTO
- Recordatorio de pago vencido (3 días después de entrega)
- Resumen semanal al admin

---

## 📋 ROADMAP DE IMPLEMENTACIÓN

### Sprint 1 (Semana 1): CONEXIONES CRÍTICAS
```
✅ [P1.1] Editar presupuestos
✅ [P1.2] Integración Pedidos → Caja (cancelar deuda)
✅ [P1.3] Unificar rutas pedidos
✅ [P2.1.a] Autocomplete básico en presupuestos
```

### Sprint 2 (Semana 2): STOCK Y AUDITORÍA
```
✅ [P2.2] Integración Stock ↔ Pedidos
✅ [P2.3] Deuda proveedores
✅ [P3.3] Auditoría de cambios
✅ [P2.1.b] Autocomplete en gastos/proveedores
```

### Sprint 3 (Semana 3): VISIBILIDAD
```
✅ [P3.1] Dashboard
✅ [P3.2] Reportes exportables
✅ [P4.1] Datos cliente mejorados
```

### Sprint 4 (Semana 4): PULIDO
```
✅ [P4.2] Notificaciones automáticas
✅ Testing y bugfixes
✅ Documentación
```

---

## 🎯 PRÓXIMAS ACCIONES

### Inmediato (Hoy):
1. ¿Confirmas que quieres implementar todo esto?
2. ¿Tienes prioridades diferentes?
3. ¿Hay otros módulos que necesites?

### Si dices SÍ:
1. Empiezo con **Sprint 1** (FASE 1 crítica)
2. Las cambios se harán en tu BD sin romper nada (migraciones automáticas)
3. Te entrego código funcionando + tests

---

## 📊 MÉTRICAS DE MEJORA

**Antes:**
- Tiempo entrada presupuesto → pedido pagado: ~30 min (3 acciones)
- Visibilidad: Revisar 3 vistas para conocer estado
- Rentabilidad: No visible

**Después (Fase 1):**
- Tiempo entrada presupuesto → pedido pagado: ~10 min (1 acción)
- Visibilidad: 1 vista dashboard
- Rentabilidad: Margen visible en cada pedido

---

## 📝 CONCLUSIÓN

Tu sistema **es sólido** pero necesita **integraciones horizontales** (conectar Pedidos ↔ Caja ↔ Stock). 
Esto eliminaría datos duplicados y errores manuales.

La **Fase 1 es crítica** y resolverá 80% de los problemas operativos.
La **Fase 2-4** son mejoras de escalabilidad y reportes.

¿Quieres que comenzemos con Sprint 1? 🚀
