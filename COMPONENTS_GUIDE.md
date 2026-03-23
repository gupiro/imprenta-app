# 🧩 Guía de Componentes Reutilizables

## Overview

El sistema cuenta con 3 componentes EJS reutilizables que estandarizan la interfaz y reducen código duplicado:

1. **Card** - Contenedor principal para agrupar contenido
2. **Modal** - Diálogos modales para formularios y confirmaciones
3. **FormGroup** - Campos de formulario consistentes

---

## 1️⃣ Card Component

**Archivo:** `views/components/card.ejs`

### Uso Básico

```ejs
<%- include('components/card', {
  title: 'Mi Tarjeta',
  icon: '📊',
  children: '<p>Contenido aquí</p>'
}) %>
```

### Props Disponibles

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `title` | string | ✓ | Título de la tarjeta |
| `icon` | string | ✗ | Emoji o HTML del icono |
| `children` | string | ✓ | Contenido HTML dentro de la tarjeta |
| `actions` | string | ✗ | HTML de botones de acción |
| `className` | string | ✗ | Classes CSS adicionales |
| `style` | string | ✗ | Estilos inline adicionales |

### Ejemplos

#### Card Simple

```ejs
<%- include('components/card', {
  title: 'Resumen del Mes',
  icon: '📈',
  children: `
    <div class="row">
      <div class="col">
        <small class="text-muted">Ingresos</small>
        <h4 class="text-success">$10,000</h4>
      </div>
      <div class="col">
        <small class="text-muted">Gastos</small>
        <h4 class="text-danger">$2,000</h4>
      </div>
    </div>
  `
}) %>
```

#### Card con Acciones

```ejs
<%- include('components/card', {
  title: 'Nuevo Pedido',
  icon: '🛒',
  children: '<p>¿Crear un nuevo pedido ahora?</p>',
  actions: `
    <button class="btn btn-primary btn-sm">Crear</button>
    <button class="btn btn-secondary btn-sm">Cancelar</button>
  `,
  className: 'border-primary'
}) %>
```

#### Card Personalizada

```ejs
<%- include('components/card', {
  title: 'Gastos de Hoy',
  children: '<p>$500 en tinta</p>',
  style: 'background: #f0f9ff; border-left: 4px solid #2563eb;'
}) %>
```

---

## 2️⃣ Modal Component

**Archivo:** `views/components/modal.ejs`

### Uso Básico

```ejs
<%- include('components/modal', {
  id: 'modalEjemplo',
  title: 'Título del Modal',
  children: '<p>Contenido del modal</p>',
  footer: '<button class="btn btn-primary">Guardar</button>'
}) %>

<!-- Para abrir el modal -->
<button data-bs-toggle="modal" data-bs-target="#modalEjemplo">Abrir</button>
```

### Props Disponibles

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `id` | string | ✓ | ID único del modal (para data-bs-target) |
| `title` | string | ✓ | Título del modal |
| `size` | string | ✗ | Tamaño: 'sm', 'lg', 'xl' (default: 'lg') |
| `children` | string | ✓ | Contenido HTML del body |
| `footer` | string | ✗ | HTML de botones en footer |

### Ejemplos

#### Modal de Confirmación

```ejs
<%- include('components/modal', {
  id: 'modalEliminar',
  title: '¿Eliminar este gasto?',
  size: 'sm',
  children: `
    <p>Estás a punto de eliminar un gasto de <strong>$500</strong></p>
    <p class="text-danger">Esta acción no se puede deshacer.</p>
  `,
  footer: `
    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-danger">Eliminar</button>
  `
}) %>
```

#### Modal de Formulario

```ejs
<%- include('components/modal', {
  id: 'modalNuevoGasto',
  title: 'Registrar Nuevo Gasto',
  size: 'lg',
  children: `
    <form>
      <div class="mb-3">
        <label class="form-label">Descripción</label>
        <input type="text" class="form-control" placeholder="Qué compraste?">
      </div>
      <div class="mb-3">
        <label class="form-label">Monto</label>
        <input type="number" class="form-control" placeholder="0.00" step="0.01">
      </div>
    </form>
  `,
  footer: `
    <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button class="btn btn-primary">Guardar Gasto</button>
  `
}) %>
```

---

## 3️⃣ FormGroup Component

**Archivo:** `views/components/form-group.ejs`

### Uso Básico

```ejs
<%- include('components/form-group', {
  label: 'Email',
  name: 'email',
  type: 'email',
  required: true
}) %>
```

### Props Disponibles

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `label` | string | ✓ | Etiqueta del campo |
| `name` | string | ✓ | Atributo name del input |
| `type` | string | ✗ | Tipo de campo (text, email, number, date, textarea, select) |
| `value` | string | ✗ | Valor actual del campo |
| `required` | boolean | ✗ | Si es requerido (muestra *) |
| `disabled` | boolean | ✗ | Si está deshabilitado |
| `placeholder` | string | ✗ | Texto de placeholder |
| `help` | string | ✗ | Texto de ayuda debajo |
| `error` | string | ✗ | Mensaje de error |
| `className` | string | ✗ | Classes CSS adicionales |
| `options` | array | ✗ | Para select: [{ value: "1", label: "Opción 1" }] |
| `min` | number | ✗ | Para number inputs |
| `max` | number | ✗ | Para number inputs |
| `step` | number | ✗ | Para number inputs |
| `rows` | number | ✗ | Para textarea |

### Ejemplos

#### Campo de Texto

```ejs
<%- include('components/form-group', {
  label: 'Nombre del Cliente',
  name: 'cliente_nombre',
  type: 'text',
  required: true,
  placeholder: 'Ej: Juan Pérez',
  help: 'Ingresa el nombre completo'
}) %>
```

#### Campo de Número

```ejs
<%- include('components/form-group', {
  label: 'Monto',
  name: 'monto',
  type: 'number',
  required: true,
  min: 0,
  step: 0.01,
  placeholder: '0.00',
  value: '1000',
  help: '¿Cuánto es el monto?'
}) %>
```

#### Select/Dropdown

```ejs
<%- include('components/form-group', {
  label: 'Categoría',
  name: 'categoria',
  type: 'select',
  required: true,
  options: [
    { value: 'papeleria', label: '📄 Papelería' },
    { value: 'tinta', label: '🖨️ Tinta' },
    { value: 'servicios', label: '⚡ Servicios' },
    { value: 'otros', label: '📦 Otros' }
  ]
}) %>
```

#### Textarea

```ejs
<%- include('components/form-group', {
  label: 'Descripción del Gasto',
  name: 'descripcion',
  type: 'textarea',
  rows: 4,
  required: true,
  placeholder: 'Describe en detalle qué compraste...',
  help: 'Sé lo más específico posible'
}) %>
```

#### Campo con Error

```ejs
<%- include('components/form-group', {
  label: 'Email',
  name: 'email',
  type: 'email',
  value: 'usuario@',
  error: 'El email no es válido. Debe incluir @'
}) %>
```

---

## 🔧 Uso Combinado en Formularios

### Ejemplo: Formulario Completo

```ejs
<form action="/gastos/nuevo" method="POST">
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">

  <div class="row g-3">
    <div class="col-md-6">
      <%- include('components/form-group', {
        label: 'Fecha',
        name: 'fecha',
        type: 'date',
        required: true,
        value: new Date().toISOString().slice(0, 10)
      }) %>
    </div>

    <div class="col-md-6">
      <%- include('components/form-group', {
        label: 'Monto',
        name: 'monto',
        type: 'number',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '0.00'
      }) %>
    </div>

    <div class="col-12">
      <%- include('components/form-group', {
        label: 'Descripción',
        name: 'descripcion',
        type: 'textarea',
        required: true,
        rows: 3,
        placeholder: 'Ej: Resma A4 - 10 paquetes'
      }) %>
    </div>

    <div class="col-md-6">
      <%- include('components/form-group', {
        label: 'Método de Pago',
        name: 'metodo',
        type: 'select',
        required: true,
        options: [
          { value: 'efectivo', label: '💵 Efectivo' },
          { value: 'transferencia', label: '🏦 Transferencia' },
          { value: 'tarjeta', label: '💳 Tarjeta' }
        ]
      }) %>
    </div>

    <div class="col-md-6">
      <%- include('components/form-group', {
        label: 'Estado',
        name: 'estado',
        type: 'select',
        required: true,
        options: [
          { value: 'pagado', label: '✅ Pagado' },
          { value: 'pendiente', label: '⏳ Pendiente' }
        ]
      }) %>
    </div>
  </div>

  <div class="d-flex gap-2 mt-4">
    <button type="submit" class="btn btn-primary">Guardar</button>
    <button type="reset" class="btn btn-secondary">Limpiar</button>
  </div>
</form>
```

### Ejemplo: Card + Modal + FormGroup

```ejs
<!-- Card que activa modal -->
<%- include('components/card', {
  title: 'Registrar Gasto',
  icon: '📝',
  children: '<p>Agrega tus gastos diarios</p>',
  actions: `
    <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#modalGasto">
      Agregar
    </button>
  `
}) %>

<!-- Modal con formulario -->
<%- include('components/modal', {
  id: 'modalGasto',
  title: 'Nuevo Gasto',
  children: `
    <form id="formGasto">
      <%- include('components/form-group', {
        label: 'Descripción',
        name: 'descripcion',
        type: 'textarea',
        required: true,
        placeholder: '¿Qué compraste?'
      }) %>

      <%- include('components/form-group', {
        label: 'Monto',
        name: 'monto',
        type: 'number',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '0.00'
      }) %>
    </form>
  `,
  footer: `
    <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button class="btn btn-primary" onclick="document.getElementById('formGasto').submit()">Guardar</button>
  `
}) %>
```

---

## ✨ Dark Mode

Los componentes soportan automáticamente dark mode. Para activarlo:

### Desde el navegador:
- Click en el icono de luna (🌙) en la navbar
- Se guarda la preferencia en localStorage

### Programáticamente:
```javascript
// Activar dark mode
document.documentElement.classList.add('dark-mode');
localStorage.setItem('darkMode', true);

// Desactivar
document.documentElement.classList.remove('dark-mode');
localStorage.setItem('darkMode', false);
```

---

## 📊 Tablas Interactivas

### Habilitando Funcionalidad Interactiva

```ejs
<table class="table-minimal" data-interactive="true">
  <thead>
    <tr>
      <th>Fecha</th>
      <th>Descripción</th>
      <th>Monto</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody>
    <!-- Filas -->
  </tbody>
</table>
```

### Características Automáticas

- ✅ **Sort por Columna:** Click en encabezado para ordenar asc/desc
- ✅ **Filtro en Tiempo Real:** Inputs automáticos arriba de la tabla
- ✅ **Indicadores Visuales:** Iconos ↑↓ en columna ordenada
- ✅ **Botón Limpiar:** Limpia todos los filtros

---

## 🚀 Best Practices

1. **Siempre usar componentes** para mantener consistencia
2. **Props como variables** para dynamic content:
   ```ejs
   <%- include('components/card', {
     title: gasto.titulo,
     children: `<p>$${gasto.monto}</p>`
   }) %>
   ```
3. **Encadenar componentes** para layouts complejos:
   ```ejs
   <%- include('components/card', {
     title: 'Formulario',
     children: include('components/form-group', {...})
   }) %>
   ```
4. **Validar en servidor** además de componentes
5. **Usar estilos de Bootstrap** para elementos dentro de componentes

---

**Última actualización:** Marzo 2026
**Versión:** 1.0
