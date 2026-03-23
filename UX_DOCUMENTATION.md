# 📐 UX/UI Documentation - Sistema de Gestión Imprenta El Gráfico

## 📋 Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Arquitectura de Información](#arquitectura-de-información)
3. [Sistema de Diseño](#sistema-de-diseño)
4. [Componentes Reutilizables](#componentes-reutilizables)
5. [Paleta de Colores](#paleta-de-colores)
6. [Tipografía](#tipografía)
7. [Flujos de Usuario](#flujos-de-usuario)
8. [Mejores Prácticas](#mejores-prácticas)

---

## 🎯 Visión General

El sistema de gestión de Imprenta El Gráfico es una aplicación web diseñada para simplificar la administración diaria de una imprenta pequeña. La interfaz está diseñada siguiendo principios de **minimalismo**, **claridad** e **intuitibilidad**.

**Objetivos principales:**
- ✅ Interfaz clara y fácil de entender
- ✅ Funcionalidad accesible para usuarios sin formación técnica
- ✅ Gestión eficiente de pedidos, clientes y finanzas
- ✅ Reportes comprensibles sin jerga contable
- ✅ Responsive y funcional en desktop y mobile
- ✅ Dark mode para reducir fatiga ocular

---

## 🗂️ Arquitectura de Información

### Estructura Principal

```
┌─────────────────────────────────────────────┐
│           NAVBAR (Top Navigation)           │
│  [Logo] [Menú] [Tema] [Ayuda] [Perfil]    │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ SIDEBAR         │      MAIN CONTENT         │
│ (Navegación)    │   (Página Actual)        │
│                 │                          │
│ • Inicio        │  [Encabezado]            │
│ • Caja Diaria   │  [Contenido Principal]   │
│ • Producción    │  [Acciones Rápidas]      │
│ • Clientes      │  [Datos/Tablas]          │
│ • Finanzas      │  [Modales]               │
│ • Reportes      │                          │
│ • Admin         │                          │
└─────────────────────────────────────────────┘
```

### Secciones por Rol

#### Admin (Acceso Completo)
- **Operativo Diario:** Caja Diaria, Producción, Clientes
- **Gestión:** Pedidos, Presupuestos, Catálogo
- **Finanzas:** Gastos, Deudas, Reportes, Vencimientos
- **Admin:** Usuarios, Stock, Proveedores

#### Vendedor
- Caja Diaria, Producción, Clientes
- Pedidos, Presupuestos, Catálogo
- Reportes

#### Operador
- Producción, Catálogo, Caja Diaria, Pedidos

#### Recepcionista
- Clientes, Pedidos, Presupuestos, Catálogo, Caja Diaria

---

## 🎨 Sistema de Diseño

### Principios de Diseño

1. **Minimalismo:** Solo elementos necesarios
2. **Claridad:** Información presentada de forma clara
3. **Jerarquía:** Elementos principales destacados
4. **Consistencia:** Patrones visuales uniformes
5. **Accesibilidad:** Legible para todos
6. **Responsividad:** Funciona en todos los dispositivos

### Espaciado (Bootstrap Scale)

```
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
xxl: 3rem (48px)
```

### Bordes y Esquinas

- **Border Radius:** 4px (pequeño), 6px (estándar), 8px (grande)
- **Border Color:** #e5e7eb (light mode), #404854 (dark mode)
- **Border Width:** 1px (estándar)

### Sombras

```
Sutil:  0 1px 3px rgba(0, 0, 0, 0.1)
Normal: 0 4px 12px rgba(0, 0, 0, 0.15)
Fuerte: 0 8px 24px rgba(0, 0, 0, 0.2)
```

---

## 🧩 Componentes Reutilizables

### 1. Card Component
**Archivo:** `views/components/card.ejs`

**Propósito:** Contenedor principal para agrupar contenido relacionado

**Props:**
```javascript
{
  title: "Título de la tarjeta",
  icon: "📊",              // emoji o HTML
  children: "contenido",
  actions: "HTML de botones",
  className: "custom-class",
  style: "custom-styles"
}
```

**Ejemplo de uso:**
```ejs
<%- include('components/card', {
  title: 'Resumen Financiero',
  icon: '💰',
  children: '<p>Total ingresos: $10,000</p>'
}) %>
```

### 2. Modal Component
**Archivo:** `views/components/modal.ejs`

**Propósito:** Diálogos modales para formularios y confirmaciones

**Props:**
```javascript
{
  id: "modalId",
  title: "Título del Modal",
  size: "lg",  // sm, lg, xl
  children: "contenido del body",
  footer: "HTML de botones"
}
```

**Ejemplo de uso:**
```ejs
<%- include('components/modal', {
  id: 'modalNuevoPedido',
  title: 'Nuevo Pedido',
  size: 'lg',
  children: '<form>...</form>',
  footer: '<button class="btn btn-primary">Guardar</button>'
}) %>
```

### 3. Form Group Component
**Archivo:** `views/components/form-group.ejs`

**Propósito:** Campo de formulario consistente con label y validación

**Props:**
```javascript
{
  label: "Nombre del Campo",
  name: "field_name",
  type: "text",           // text, email, number, date, textarea, select
  value: "valor actual",
  required: true,
  disabled: false,
  placeholder: "Escribe aquí...",
  help: "Texto de ayuda",
  error: "Mensaje de error",
  options: [              // para select
    { value: "1", label: "Opción 1" },
    { value: "2", label: "Opción 2" }
  ],
  min: 0,                 // para number
  max: 100,
  step: 1,
  rows: 4                 // para textarea
}
```

**Ejemplo de uso:**
```ejs
<%- include('components/form-group', {
  label: 'Monto',
  name: 'monto',
  type: 'number',
  required: true,
  placeholder: '0.00',
  help: '¿Cuánto es el monto?'
}) %>
```

---

## 🎨 Paleta de Colores

### Colores Principales

| Nombre | Light Mode | Dark Mode | Uso |
|--------|-----------|-----------|-----|
| Primary | #2563eb | #2563eb | Botones, links, acciones |
| Success | #10b981 | #10b981 | Estados positivos, ganancias |
| Danger | #ef4444 | #ef4444 | Estados negativos, gastos |
| Warning | #f59e0b | #f59e0b | Alertas, pendientes |
| Info | #0ea5e9 | #0ea5e9 | Información, detalles |

### Colores Neutrales

| Elemento | Light Mode | Dark Mode |
|----------|-----------|-----------|
| Fondo | #ffffff | #1a1d23 |
| Texto Principal | #1f2937 | #e0e0e0 |
| Texto Secundario | #6b7280 | #b0b8c1 |
| Bordes | #e5e7eb | #404854 |

### Uso de Colores por Contexto

**Finanzas:**
- Ingresos: Verde (#10b981)
- Gastos: Rojo (#ef4444)
- Pendientes: Amarillo (#f59e0b)
- Margen: Azul (#2563eb)

**Pedidos:**
- Pendiente: Amarillo (#f59e0b)
- En Producción: Azul (#3b82f6)
- Listo: Verde (#10b981)
- Entregado: Gris (#6b7280)

---

## 🔤 Tipografía

### Fuentes

- **Sistema:** Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Monoespaciada:** 'Monaco', 'Courier New', monospace

### Escalas de Tamaño

```css
Page Title (h1)    : 2rem   (32px) - Bold (700)
Section Title (h2) : 1.5rem (24px) - Bold (700)
Card Title (h3)    : 1.125rem (18px) - Semibold (600)
Body Text          : 0.9rem (14px) - Regular (400)
Small Text         : 0.875rem (14px) - Regular (400)
Extra Small        : 0.75rem (12px) - Regular (400)
```

### Hauteur de Ligne

- Títulos: 1.2
- Body: 1.6
- Código: 1.5

---

## 👥 Flujos de Usuario

### Flujo 1: Nuevo Pedido

```
1. Admin/Vendedor accede a Dashboard
2. Hace click en "Nuevo Pedido"
3. Modal se abre con form
4. Selecciona cliente (autocomplete)
5. Agrega productos (autocomplete por código/nombre)
6. Ingresa cantidad y detalles
7. Sistema calcula total automáticamente
8. Hace click en "Guardar"
9. Se genera comprobante PDF
10. Pedido aparece en "Pendientes"
```

### Flujo 2: Gestión de Gastos

```
1. Admin accede a Gastos
2. Ve panel educativo (negocio vs personal)
3. Hace click en "Registrar Gasto"
4. Modal con campos:
   - Fecha (hoy por defecto)
   - Tipo (negocio/personal)
   - Categoría (cambia según tipo)
   - Descripción
   - Monto
   - Método de pago
   - Estado (pagado/pendiente)
5. Envía form
6. Sistema registra en movimientos_caja
7. Gasto aparece en tabla filtrable
```

### Flujo 3: Cobrar Deuda

```
1. Admin ve pedido en "Listos"
2. Hace click en botón "Cobrar"
3. Modal de cobro abre
4. Ingresa método de pago
5. Ingresa monto (sugerido: monto_restante)
6. Confirma
7. Sistema:
   - Actualiza monto_restante
   - Registra movimiento en caja
   - Marca como ENTREGADO si monto_restante <= 0
8. Modal cierra y tabla actualiza
```

---

## 📱 Responsividad

### Breakpoints

```
xs: < 576px   (Mobile)
sm: 576px     (Landscape Phone)
md: 768px     (Tablet)
lg: 992px     (Laptop)
xl: 1200px    (Desktop)
xxl: 1400px   (Large Desktop)
```

### Comportamiento Adaptativo

| Elemento | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Sidebar | Visible fijo | Visible fijo | Menú hamburguesa |
| Tablas | Horizontal | Scroll | Scroll horizontal |
| Modales | Normal | Normal | Full height |
| Botones | Normal | Reducido | Full width |
| Tipografía | 100% | 95% | 90% |

---

## 🌓 Dark Mode

### Implementación

**CSS Variables:**
```css
:root.dark-mode {
  --bs-body-bg: #1a1d23;
  --bs-body-color: #e0e0e0;
  --bs-border-color: #404854;
}
```

**JavaScript:**
```javascript
toggleDarkMode()  // Alternar tema
initDarkMode()    // Cargar preferencia al iniciar
localStorage.setItem('darkMode', isDarkMode) // Persistir
```

**Icono:**
- Light Mode: Moon icon (🌙)
- Dark Mode: Sun icon (☀️)

---

## ✨ Mejores Prácticas

### Accesibilidad

- ✅ Contraste mínimo 4.5:1 para texto
- ✅ Labels vinculados a inputs
- ✅ Alt text en imágenes
- ✅ Navegación por teclado
- ✅ ARIA labels donde necesario
- ✅ Focus visible en todos los botones

### Formularios

- ✅ Labels claros y descriptivos
- ✅ Validación en cliente y servidor
- ✅ Mensajes de error específicos
- ✅ Valores por defecto sensatos
- ✅ Placeholder como ayuda, no como label

### Tablas

- ✅ Encabezados claros
- ✅ Datos agrupados lógicamente
- ✅ Opciones de filtrado y búsqueda
- ✅ Acciones en fila (editar, eliminar)
- ✅ Estados visuales (row hover, selected)

### Modales

- ✅ Botón cerrar visible
- ✅ Título descriptivo
- ✅ Acciones claras (guardar, cancelar)
- ✅ Confirmación para acciones destructivas
- ✅ Scroll si contenido es largo

### Notificaciones

- ✅ Posición consistente (top, center)
- ✅ Colores acordes al tipo (success, error, warning)
- ✅ Texto conciso y actionable
- ✅ Auto-close (5-10 segundos)
- ✅ Opción manual de cerrar

---

## 🔧 Guía de Extensión

### Crear Nuevo Componente

1. Crear archivo en `views/components/new-component.ejs`
2. Documentar props en comentario
3. Usar nomenclatura consistente (clases BEM)
4. Hacer reutilizable (no hardcodear datos)
5. Testar en múltiples contextos

**Template:**
```ejs
<!-- Component Name -->
<!-- Uso: <%- include('components/new-component', { prop1: 'value' }) %> -->

<div class="component-name">
  <!-- contenido -->
</div>
```

### Agregar Nueva Página

1. Crear route en `routes/nueva.js`
2. Crear view en `views/nueva/index.ejs`
3. Importar componentes necesarios
4. Mantener estructura de header + content + modals
5. Agregar a sidebar en `layout.ejs`

---

## 📊 Analytics y Métricas UX

**Métricas a monitorear:**
- Tiempo de carga de páginas
- Tasa de rebote
- Errores de validación (frecuencia)
- Uso de features (qué se usa más)
- Sesiones por rol

---

## 🔄 Versiones y Cambios

### v1.0 (Marzo 2026)
- ✅ Diseño minimalista base
- ✅ Componentes core (Card, Modal, FormGroup)
- ✅ Dark mode
- ✅ Responsive design
- ✅ Paleta de colores consistente

### v1.1 (Futuro)
- 📋 Temas personalizables
- 📋 Campos de búsqueda mejorados
- 📋 Drag & drop en Kanban
- 📋 Notificaciones en tiempo real

---

## 📚 Referencias

- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.0/)
- [Bootstrap Icons](https://icons.getbootstrap.com/)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design Principles](https://material.io/design)

---

**Última actualización:** Marzo 2026
**Responsable:** UX/UI Design Team
**Estado:** Activo y en mantenimiento
