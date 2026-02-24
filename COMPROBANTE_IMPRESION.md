# 🖨️ GUÍA: Comprobante de Pedido A5 (Impresable)

**Actualización:** 2026-02-23
**Tamaño:** A5 (148mm × 210mm)
**Membrete:** Imprenta El Gráfico

---

## ✨ Lo Nuevo

### Datos del Negocio Actualizados
```
📍 Imprenta El Gráfico
📍 El Gráfico de Orán - Salta
📱 3878 22-4908
```

Estos datos aparecen en:
- ✅ Encabezado (Membrete)
- ✅ Pie de página
- ✅ Todos los comprobantes y recibos

---

## 🖨️ Cómo Imprimir un Comprobante

### Paso 1: Crear o Buscar el Pedido
1. Ir a `http://localhost:3000/pedidos/detalle/[ID-PEDIDO]`
2. O buscar el pedido en Pendientes, En Producción, Listos, Entregados

### Paso 2: Imprimir Comprobante
1. Hacer click en botón **"🖨️ Imprimir Comprobante"** (arriba a la izquierda)
2. Se abrirá el comprobante en una nueva pestaña

### Paso 3: Imprimir en A5
Opción A - Navegador (Recomendado):
```
1. Presionar: Ctrl + P (Windows) o Cmd + P (Mac)
2. En "Tamaño del papel" seleccionar: A5
3. En "Márgenes" seleccionar: Mínimo
4. En "Encabezados y pies" desactivar
5. Click en "Imprimir"
```

Opción B - Guardar como PDF:
```
1. Presionar: Ctrl + P
2. Destino: "Guardar como PDF"
3. Tamaño del papel: A5
4. Click en "Guardar"
```

---

## 📄 Contenido del Comprobante

El comprobante A5 incluye:

### Encabezado (Membrete)
```
    Imprenta El Gráfico
  El Gráfico de Orán - Salta
         📱 3878 22-4908
```

### Cuerpo
- **Número de Pedido:** #123
- **Fecha:** 15/02/2026
- **Estado:** ENTREGADO / LISTO / EN PRODUCCIÓN / etc
- **Cliente:** Nombre y teléfono (si existe)
- **Tabla de productos:** Material, Cantidad, Precio Unitario, Subtotal
- **Total:** Monto total del pedido
- **Descuento:** Si aplica
- **Estado de Pago:** Pagado / Parcial / Pendiente
- **Monto Pagado:** Adelanto registrado
- **Método de Pago:** Efectivo, Transferencia, Tarjeta, QR

### Pie de Página
```
Gracias por su confianza
📞 3878 22-4908 | El Gráfico de Orán - Salta
Este comprobante es válido como prueba de compra
```

---

## 🎯 Casos de Uso

### 1️⃣ Cliente Retira Pedido
**Cuando:** El pedido está LISTO
**Acción:**
1. Imprimir comprobante A5
2. Darle al cliente para que se lleve
3. Cliente presenta el papel al retirar

### 2️⃣ Pago a Plazos
**Cuando:** El cliente paga parcialmente
**Acción:**
1. Crear comprobante con estado "PAGO PARCIAL"
2. Muestra la deuda restante
3. Cliente tiene constancia del pago

### 3️⃣ Pedido Completamente Pagado
**Cuando:** El cliente pagó todo
**Acción:**
1. Comprobante muestra "COMPLETAMENTE PAGADO"
2. Sirve como factura/recibo

---

## ⚙️ Configuración Técnica

### Archivo Editado
- `views/pedidos/comprobante.ejs`

### Cambios Realizados
- ✅ Formato A5 (148mm × 210mm)
- ✅ Membrete con datos del negocio
- ✅ Teléfono: 3878 22-4908
- ✅ Dirección: El Gráfico de Orán - Salta
- ✅ Optimizado para impresión térmica o inkjet
- ✅ Estilos CSS para impresión `@page` y `@media print`
- ✅ Sin márgenes innecesarios

### Botón de Acceso
Ubicación: **Detalle del Pedido**
- Visible en TODAS las vistas de detalle
- Se abre en nueva pestaña (target="_blank")
- Fácil acceso desde cualquier estado del pedido

---

## 📋 Checklist de Impresión

Antes de imprimir, verificar:
- ✅ Papel A5 cargado en la impresora
- ✅ Tinta / Tóner suficiente
- ✅ Alineación correcta del papel
- ✅ Seleccionar tamaño A5 en el diálogo de impresión
- ✅ Márgenes: Mínimo
- ✅ Escala: 100% (no encoger a página)

---

## 🎨 Personalización Futura

Cuando quieras agregar logo o cambiar diseño:
1. Logo: Colocar en `public/images/logo.png`
2. Colores: Editar estilos CSS en `views/pedidos/comprobante.ejs`
3. Datos empresa: Actualizar el membrete

---

## ✅ Estado

El comprobante está **100% funcional** y listo para imprimir.

**Próximos pasos opcionales:**
1. Prueba con una impresora real
2. Ajusta márgenes si es necesario
3. Agrega logo si lo deseas
4. Cambia colores del membrete si prefieres

---

**¿Preguntas sobre impresión?** Verifica que:
1. El navegador está actualizando correctamente
2. La impresora está configurada para A5
3. Los márgenes están en mínimo en el diálogo de impresión

