# 🔧 ARREGLOS EN FORMULARIO DE NUEVO PEDIDO

## ✅ Problemas Resueltos

### 1. **No se podía guardar pedido**
**Causa:** Errores en JavaScript - Acceso a índices incorrecto en arrays
**Solución:**
- ✅ Reescribí `views/pedidos/nuevo.ejs` completamente
- ✅ Simplificué la lógica de JavaScript
- ✅ Agregué validación de formulario antes de guardar

### 2. **Precio del producto no aparecía**
**Causa:** En la vista anterior, el campo de precio no se cargaba del select
**Solución:**
- ✅ Agregué atributo `data-precio` en cada option del select
- ✅ Función `actualizarPrecio()` lee directamente del dataset
- ✅ El precio se asigna automáticamente al seleccionar

### 3. **Cantidades no hacían la suma**
**Causa:** El cálculo de total estaba basado en indexación incorrecta
**Solución:**
- ✅ Nueva función `recalcularTotal()` que suma todos los inputs `name="precio[]"`
- ✅ Se llama cada vez que hay cambios
- ✅ El total es en tiempo real (readonly, solo se actualiza con cálculos)

### 4. **Cálculo de precios por tipo de producto**
**Causa:** No diferenciaba entre lona (m²) y unidades
**Solución:**
- ✅ Agregué `data-tipo` en cada option
- ✅ Si es "lona": calcula `ancho * alto * precio_base`
- ✅ Si es otro: usa `precio_base * cantidad`
- ✅ Luego multiplica por cantidad para ambos

---

## 📊 NUEVO FORMULARIO FEATURES

### ✨ **Interfaz Mejorada**
- Tarjetas organizadas por sección
- Cliente (selector o crear nuevo)
- Productos (agregar/eliminar dinámicamente)
- Totales claros y grandes
- Validación antes de guardar

### ✨ **Cálculo Automático**
- Al seleccionar material → carga precio base
- Al ingresar ancho/alto → calcula m² (si es lona)
- Al cambiar cantidad → recalcula subtotal
- Al cambiar cualquier precio → recalcula total pedido
- Campo de total es readonly (solo para lectura)

### ✨ **Manejo de Productos**
- Agregar múltiples productos
- Cada uno con su propio cálculo
- Descripción/detalle para cada item
- Botón eliminar para cada producto

### ✨ **Cliente**
- Select con lista de clientes existentes
- Botón para crear nuevo cliente desde modal
- Nuevo cliente se agrega a la lista automáticamente

---

## 🚀 CÓMO USAR

1. **Abre Nuevo Pedido**: `/pedidos/nuevo`
2. **Selecciona cliente** (o crea uno nuevo)
3. **Haz clic en "Agregar Producto"**
4. **Selecciona material** → automáticamente aparece el precio
5. **Ingresa cantidad** (y ancho/alto si es lona)
6. **El total se recalcula automáticamente**
7. **Puedes agregar más productos** con el botón
8. **Ingresa el monto adelantado** (opcional)
9. **Elige método de pago**
10. **Guarda el pedido** ✅

---

**Status:** ✅ **LISTO PARA PROBAR**
