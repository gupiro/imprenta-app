# 📋 Tareas Pendientes - Sesión Actual

## ✅ Completadas

1. ✅ Botones WhatsApp y Cobrar en `/pedidos/listos`
2. ✅ Impresión/PDF en Caja Diaria
3. ✅ Reportes por día (ruta creada)

## ⏳ Pendientes

### 1️⃣ Crear Vista de Reporte Diario
**Archivo a crear:** `views/reportes/diario.ejs`
**Contenido necesario:**
- Fecha seleccionable
- Resumen: Ingresos, Egresos, Saldo
- Desglose por método de pago
- Tabla de movimientos del día
- Tabla de pedidos creados ese día
- Botones para imprimir/exportar

### 2️⃣ Códigos de Productos Correlativos
**Tarea:** Actualizar códigos de los 72 productos
**Formato requerido:** `NNN-X` donde:
- `NNN` = número correlativo (001, 002, 003... 072)
- `X` = letra del grupo del producto

**Grupos de productos:**
- T = Talonarios (11 productos)
- E = Entradas (6 productos)
- B = Bono Contribución (2 productos)
- I = Impresión (6 productos)
- F = Fotográfico/Fotocopias (6 productos)
- J = Tarjetas (5 productos)
- L = Lona/Banner/Vinilo (6 productos)
- S = Sellos/Distintivos (4 productos)
- D = 3D/Sublimado (3 productos)
- A = Accesorios y Servicios (varios)
- R = Resmas y Papeles (6 productos)
- C = Clínica/Tarjeta/Caratula (4 productos)
- P = Patente (1 producto)

**Ejemplo:**
- `001-T` = Talonario 1/2 Oficio x Duplicado
- `002-T` = Talonario 1/2 Oficio x Triplicado
- `003-E` = Entradas 6 Tal
- etc.

### 3️⃣ Revisar y Actualizar Precios
**Necesario:** Precios reales para Orán, Salta (ni baratos ni caros)
**Productos a revisar:**
- TODOS los 72 productos
- Comparar con precios de mercado local
- Ajustar si es necesario

**Ejemplos que pueden estar incorrectos:**
- Talonarios: $6500-$24000 (verificar)
- Impresión: $150-$3000 (verificar)
- Lona: $500/m2 (verificar)
- Servicios: $1500-$30000 (verificar)

---

## 🎯 Orden de Prioridad

1. **PRIMERO:** Crear vista de reporte diario (rápido)
2. **SEGUNDO:** Actualizar códigos de productos (manual pero sistemático)
3. **TERCERO:** Revisar y actualizar precios (requiere investigación)

---

## 📝 Notas

- Los códigos correlativos es muy importante para mantener orden
- Los precios deben ser consultados con mercado local
- Una vez hecho, no cambiará frecuentemente

