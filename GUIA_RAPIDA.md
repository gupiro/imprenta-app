# 🚀 GUÍA RÁPIDA - SISTEMA DE IMPRENTA V2

## 🎯 INICIO RÁPIDO

### 1. **Iniciar el servidor**
```bash
npm start
```
Abre: **http://localhost:3000**

### 2. **Credenciales de acceso**
- **Usuario:** admin
- **Contraseña:** admin123

---

## 📋 TAREAS PRINCIPALES

### ➕ Crear un Pedido Nuevo

1. **Crear Cliente** (si no existe)
   - Menú → Clientes → "Agregar Cliente"
   - Ingresa: Nombre, teléfono, email
   - Guarda

2. **Crear Presupuesto**
   - Menú → Presupuestos → "Nuevo Presupuesto"
   - Selecciona cliente
   - Agrega items (producto, cantidad, precio)
   - Aplica descuento si necesitas
   - Guarda

3. **Crear Pedido**
   - Menú → Pedidos → "Nuevo Pedido"
   - Elige presupuesto O cliente directo
   - Agrega productos
   - Define monto entregado (pago inicial)
   - Crea pedido

4. **Cobrar Deuda** (Integración Caja)
   - Menú → Pedidos → "Pendientes"
   - Click en pedido → "Cancelar Deuda"
   - Ingresa monto a cobrar
   - Método de pago (Efectivo, Tarjeta, etc)
   - ✅ Se registra automáticamente en caja

---

## 📊 VER DATOS

### Dashboard Ejecutivo
**Menú → Dashboard**
- Estadísticas en tiempo real
- Gráficos de ingresos (últimos 7 días)
- Estado de pedidos (proporción visual)
- Top 5 deudores
- Stock bajo

### Reportes
**Menú → Reportes**
- Reporte Mensual (ingresos, egresos, ganancia)
- Reporte de Clientes (total gastado por cliente)
- Reporte de Deudores (quién debe cobrar)
- Movimientos de Stock (historial)

### Generar PDF
**En cualquier pedido:**
- Click derecho en número de pedido
- "Descargar PDF" o
- Menú Reportes → PDF de pedido específico

---

## 📦 GESTIONAR STOCK

### Ver Stock Actual
**Menú → Stock**
- Tabla con todos los artículos
- Cantidad actual vs mínimo
- Valor total del inventario
- Alertas de stock bajo

### Registrar Movimiento
**Menú → Stock → Nuevo Movimiento**
1. Selecciona producto
2. Elige tipo:
   - **Entrada** = Recibir del proveedor
   - **Salida** = Usar en pedido
   - **Ajuste** = Corrección de inventario
3. Ingresa cantidad
4. Notas (opcional)
5. Guarda

### Ver Historial
**Menú → Stock → Historial**
- Últimos 50 movimientos
- Quién lo registró y cuándo
- Motivo del movimiento

---

## 💰 CAJA DIARIA

### Ver Caja del Día
**Menú → Caja**
- Todos los movimientos del día
- Resumen: Ingresos, Egresos, Saldo
- Se actualiza automáticamente al cobrar pedidos

---

## 📝 EDITAR PRESUPUESTO

**Menú → Presupuestos → Ver Presupuesto → Botón Editar**
- Modifica items existentes
- Agrega nuevos items
- Cambia precios
- Aplica descuentos
- Recalcula total automáticamente

---

## 👥 GESTIONAR CLIENTES

### Crear Cliente
- Menú → Clientes → "Agregar"
- Datos: Nombre, teléfono, email, dirección, CUIT
- Guarda

### Ver Historial de Cliente
- Menú → Clientes
- Click en cliente
- Historial de pedidos
- Total gastado
- Deuda pendiente

---

## ✨ CARACTERÍSTICAS ESPECIALES

### Campos Dinámicos
- **Lona:** Ingresa ancho/alto → Calcula m² automático
- **Fotocopia:** Ingresa cantidad
- **Otros:** Cantidad estándar

### Descuentos
- Por item en presupuesto
- Se aplican al total
- Se calcula deuda correctamente

### Integración Automática
- Cobrar pedido → Se registra en caja
- Caja se actualiza en dashboard
- Deuda se calcula automáticamente

---

## 🔍 BÚSQUEDAS RÁPIDAS

**APIs de Autocomplete** (en formularios con search):
- Busca cliente → Obtiene teléfono, email
- Busca producto → Obtiene precio, unidad
- Busca presupuesto → Obtiene detalles

---

## 📱 ACCEDER DESDE MÓVIL

- Menú se adapta automáticamente
- Tablas son scrolleables
- Formularios responsive
- Botones más grandes

**Accede desde:** http://localhost:3000 (desde cualquier dispositivo en la red)

---

## 🚨 SI ALGO FALLA

1. **Puerto ocupado:**
   ```bash
   taskkill /F /IM node.exe
   npm start
   ```

2. **Base de datos corrupta:**
   - Elimina `imprenta.db`
   - Reinicia servidor
   - Se crea automáticamente

3. **Olvidé contraseña:**
   - Usuario admin siempre funciona: `admin123`
   - O reinicia BD (ver arriba)

---

## 💡 CONSEJOS

- ✅ Siempre crea cliente antes de pedido
- ✅ Usa presupuestos para cotizar
- ✅ Registra movimientos de stock regularmente
- ✅ Genera reportes mensualmente
- ✅ Guarda PDFs de pedidos importantes
- ✅ Verifica dashboard cada mañana

---

## 📞 SOPORTE

El sistema está completamente funcional. Si tienes dudas:
1. Lee esta guía completa
2. Revisa PROYECTO_V2_COMPLETADO.md para detalles técnicos
3. Verifica BD: imprenta.db (SQLite)

---

**¡Listo para usar! 🎉**
**Versión:** 2.0.0
**Estado:** Operacional
**Última actualización:** 2026
