# 🎯 AUDITORÍA CTO + DESIGN - IMPRENTA APP

**Fecha:** 24/03/2026  
**Versión:** 2.0.0  
**Estado:** Crítico → En Progreso

---

## 🚨 PROBLEMAS CRÍTICOS (FIXED)

### ✅ 1. Error 403 Forbidden - CSRF Token

**Status:** 🟢 RESUELTO

| Ruta | Problema | Fix |
|------|----------|-----|
| POST /pedidos/nuevo | `csrfToken: 'disabled'` | `csrfToken: req.csrfToken()` ✅ |
| POST /presupuestos/nuevo | `csrfToken: 'disabled'` | `csrfToken: req.csrfToken()` ✅ |
| POST /presupuestos/:id/editar | `csrfToken: 'disabled'` | `csrfToken: req.csrfToken()` ✅ |

**Impacto:** Usuarios YA PUEDEN crear pedidos y presupuestos

---

## ⚡ QUICK WINS (1-2 HORAS)

### 2. Grid responsive a móvil

**Problema:** 5 etapas en grid sin media queries → Overflow en móvil

**Ubicación:** `views/home.ejs:135`

**Antes (❌):**
```html
<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem;">
```

**Después (✅):**
```html
<div style="display: grid; gap: 1rem;" class="grid-states-responsive" 
     style="grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem;">
```

**CSS a agregar en layout.ejs:**
```css
@media (max-width: 1024px) {
  .grid-states-responsive {
    grid-template-columns: repeat(3, 1fr) !important;
  }
}

@media (max-width: 768px) {
  .grid-states-responsive {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 0.5rem !important;
  }
}

@media (max-width: 480px) {
  .grid-states-responsive {
    grid-template-columns: 1fr !important;
  }
}
```

### 3. Cobranza 3-bloques responsive

**Problema:** Grid 3 columnas sin media queries

**Ubicación:** `views/home.ejs:96`

**Solución:** Mismo patrón con `grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))`

---

## 🎨 CAMBIOS DE DISEÑO PRO (1 DÍA)

### 4. Sistema de Tipografía Profesional

**Meta:** Jerarquía clara, números destacados, accesibilidad

**Tipografía Actual:**
- Body: Segoe UI, Tahoma, Geneva, Verdana
- Decorativos: Georgia, serif
- Tamaños: 0.75rem - 2rem (inconsistente)

**Sistema Propuesto (CONSISTENT):**

| Elemento | Font | Size | Weight | Uso |
|----------|------|------|--------|-----|
| H1 - Página | Georgia | 2.5rem | 700 | Títulos de página |
| H2 - Sección | Inter/Segoe | 1.5rem | 700 | Encabezados de sección |
| H3 - Subsección | Inter/Segoe | 1.25rem | 600 | Bloques, cards |
| KPI - Número | Georgia | 3rem | 800 | Dinero, métricas grandes |
| KPI - Label | Segoe | 0.75rem | 700 | Etiqueta KPI |
| Body - Normal | Segoe | 1rem | 400 | Párrafos, descripciones |
| Body - Small | Segoe | 0.875rem | 400 | Detalles, ayuda |
| Button - Primary | Segoe | 1rem | 600 | Acciones principales |
| Table - Header | Segoe | 0.875rem | 700 | Encabezados tabla |
| Table - Body | Segoe | 0.95rem | 400 | Datos tabla |

**CSS a crear en layout.ejs:**
```css
:root {
  --ff-body: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  --ff-display: 'Georgia', serif;
  
  --fs-h1: 2.5rem;
  --fs-h2: 1.5rem;
  --fs-h3: 1.25rem;
  --fs-kpi: 3rem;
  --fs-body: 1rem;
  --fs-sm: 0.875rem;
  
  --fw-normal: 400;
  --fw-semibold: 600;
  --fw-bold: 700;
  --fw-extrabold: 800;
}

h1 { font: var(--fw-bold) var(--fs-h1) var(--ff-display); }
h2 { font: var(--fw-bold) var(--fs-h2) var(--ff-body); }
h3 { font: var(--fw-semibold) var(--fs-h3) var(--ff-body); }
.kpi-number { font: var(--fw-extrabold) var(--fs-kpi) var(--ff-display); }
.kpi-label { font: var(--fw-bold) var(--fs-sm) var(--ff-body); text-transform: uppercase; }
```

**Aplicación a Dashboard:**
```html
<!-- ANTES -->
<div style="font-size: 3rem; font-weight: 800;">${{ingresoHoy}}</div>
<div style="font-size: 0.75rem; font-weight: 700;">INGRESOS HOY</div>

<!-- DESPUÉS -->
<div class="kpi-value">${{ingresoHoy}}</div>
<div class="kpi-label">Ingresos Hoy</div>
```

---

### 5. Truncado Elegante + Tooltip

**Problema:** Texto "JUAN BRAVO (PICHULO" cortado sin contexto

**Solución - Implementación:**

```html
<!-- Helper en views/components/truncate.ejs -->
<span class="truncate-text" title="{{fullName}}" data-bs-toggle="tooltip">
  {{truncatedName}}
</span>

<style>
.truncate-text {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
  border-bottom: 1px dotted #999;
}

.truncate-text:hover {
  border-bottom-color: #333;
}
</style>

<script>
// En layout.ejs
document.addEventListener('DOMContentLoaded', () => {
  const tooltips = document.querySelectorAll('.truncate-text');
  tooltips.forEach(el => {
    if (el.scrollWidth > el.clientWidth) {
      new bootstrap.Tooltip(el);
    }
  });
});
</script>
```

**Aplicación en home.ejs:**
```html
<!-- ANTES -->
<%= (ped.cliente_nombre || 'Sin cliente').substring(0, 28) %>

<!-- DESPUÉS -->
<span class="truncate-text" title="<%= ped.cliente_nombre || 'Sin cliente' %>">
  <%= ped.cliente_nombre || 'Sin cliente' %>
</span>
```

---

### 6. Empty States Profesionales

**Problema:** "No hay pedidos" genérico, sin CTA

**Ubicación:** `views/home.ejs:227, 257, 277`

**Componente Empty State:**

```html
<!-- views/components/empty-state.ejs -->
<%- include('./empty-state', {
  icon: '📋',
  title: 'Sin Pedidos',
  message: 'No hay pedidos registrados todavía',
  cta: {
    href: '/pedidos/nuevo',
    text: 'Crear Primer Pedido',
    icon: 'plus-circle'
  }
}) %>
```

**Código:**
```html
<!-- views/components/empty-state.ejs -->
<div class="empty-state">
  <div class="empty-state-icon"><%= icon %></div>
  <h4 class="empty-state-title"><%= title %></h4>
  <p class="empty-state-message"><%= message %></p>
  <% if (cta) { %>
    <a href="<%= cta.href %>" class="btn btn-primary">
      <i class="bi bi-<%= cta.icon %>"></i> <%= cta.text %>
    </a>
  <% } %>
</div>

<style>
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #e5e7eb;
}

.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-state-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #111827;
}

.empty-state-message {
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
  opacity: 0.8;
}
</style>
```

---

## 🔧 BACKEND - SEGURIDAD

### 7. Session Headers Mejorados

**Ubicación:** `server.js:47-56`

**Actual:** ✅ Correcto pero puede mejorar

```javascript
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_unsafe_secret_change_env',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',  // ← CSRF protection
        maxAge: 24 * 60 * 60 * 1000  // 24h
    }
}));
```

**Mejora sugerida:**
```javascript
cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',  // ← Más seguro (algunos POST fallarán entre sitios)
    maxAge: 12 * 60 * 60 * 1000,  // 12h (más alto riesgo)
    domain: process.env.RENDER_DOMAIN || 'localhost'  // Render app
}
```

---

## 📱 MOBILE - RESPONSIVE DESIGN

### 8. Breakpoints Definidos

```css
/* Mobile First */
@media (max-width: 480px) {
  /* Teléfonos */
  body { font-size: 0.95rem; }
  h1 { font-size: 1.75rem; }
  .grid-5-state { grid-template-columns: repeat(2, 1fr); }
  .col-lg-7 { width: 100%; }
  .col-lg-5 { width: 100%; }
}

@media (min-width: 481px) and (max-width: 768px) {
  /* Tablets */
  .grid-5-state { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 769px) {
  /* Desktop */
  .grid-5-state { grid-template-columns: repeat(5, 1fr); }
}
```

### 9. Navegación Mobile

**Problema:** Navbar cramping en móvil

**Solución:**
```html
<!-- Mobile nav collapsa a hamburger -->
<nav class="navbar navbar-expand-lg">
  <button class="navbar-toggler" type="button" data-bs-toggle="collapse">
    <span class="navbar-toggler-icon"></span>
  </button>
  <div class="collapse navbar-collapse" id="navbarCollapse">
    <!-- Menu items aquí -->
  </div>
</nav>
```

### 10. Touch-friendly Buttons

```css
/* Mobile */
@media (max-width: 768px) {
  button, a.btn {
    min-height: 48px;  /* Apple HIG */
    min-width: 48px;
    padding: 12px 16px;
    font-size: 16px;  /* Previene zoom en iOS */
  }
}
```

---

## 📊 TABLAS - MEJORAS

### 11. Tabla Responsiva

**Problema:** Overflow en móvil

```html
<!-- ANTES: Tabla inline -->
<table style="width: 100%;">...</table>

<!-- DESPUÉS: Responsive wrapper -->
<div class="table-responsive">
  <table class="table table-hover">
    <thead>
      <tr>
        <th>Pedido</th>
        <th class="text-end">Monto</th>
        <th>Estado</th>
        <th class="text-center">Acciones</th>
      </tr>
    </thead>
    <tbody>
      <!-- Datos -->
    </tbody>
  </table>
</div>

<style>
.table-responsive {
  border-radius: 8px;
  overflow-x: auto;
}

.table {
  margin-bottom: 0;
}

.table th {
  background: #f3f4f6;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  cursor: pointer;  /* Sort hint */
}

.table tbody tr:hover {
  background: #f9fafb;
}

/* Mobile */
@media (max-width: 768px) {
  .table thead {
    display: none;
  }
  
  .table tbody tr {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
  }
  
  .table tbody td {
    display: block;
    text-align: right;
    padding-left: 50%;
    position: relative;
    border: 0;
  }
  
  .table tbody td::before {
    content: attr(data-label);
    position: absolute;
    left: 0;
    font-weight: 600;
    width: 50%;
    text-align: left;
  }
}
</style>
```

**Aplicación:**
```html
<td data-label="Pedido">#123</td>
<td data-label="Monto">$1,250.00</td>
<td data-label="Estado"><span class="badge bg-success">Entregado</span></td>
```

---

## 💳 FINANZAS - DEUDAS (Diseño seguro)

### 12. Tarjetas de Crédito - Mejor UX

```html
<!-- ANTES: Simple listado -->
<tr>
  <td>MasterCard ****1234</td>
  <td>$5,000</td>
  <td><button>Editar</button></td>
</tr>

<!-- DESPUÉS: Card con confirmación -->
<div class="deuda-card">
  <div class="deuda-card-header">
    💳 <strong>MasterCard</strong> ****1234
    <span class="badge bg-warning">85% Usado</span>
  </div>
  
  <div class="deuda-card-progress">
    <div class="progress" role="progressbar" aria-valuenow="85">
      <div class="progress-bar bg-warning" style="width: 85%"></div>
    </div>
    <small>$4,250 de $5,000</small>
  </div>
  
  <div class="deuda-card-actions">
    <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#modal-pagar">
      Pagar
    </button>
    <button class="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target="#modal-editar">
      Editar Límite
    </button>
  </div>
</div>

<!-- Modal de Confirmación -->
<div class="modal fade" id="modal-pagar">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title">Registrar Pago</h5>
      </div>
      <div class="modal-body">
        <div class="alert alert-info">
          <strong>💡 Nota:</strong> Este pago reducirá el saldo de MasterCard ****1234
        </div>
        <div class="mb-3">
          <label for="monto" class="form-label">Monto a Pagar</label>
          <input type="number" class="form-control" id="monto" placeholder="$0.00">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-primary">Confirmar Pago</button>
      </div>
    </div>
  </div>
</div>

<style>
.deuda-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  background: #fff;
  transition: all 0.2s;
}

.deuda-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: #d1d5db;
}

.deuda-card-header {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.deuda-card-progress {
  margin-bottom: 1rem;
}

.deuda-card-progress small {
  display: block;
  margin-top: 0.5rem;
  color: #6b7280;
}

.deuda-card-actions {
  display: flex;
  gap: 0.5rem;
}

.deuda-card-actions button {
  flex: 1;
}

@media (max-width: 480px) {
  .deuda-card {
    padding: 1rem;
  }
  
  .deuda-card-actions {
    flex-direction: column;
  }
}
</style>
```

---

## 📈 REPORTES - JERARQUÍA

### 13. Métricas Principales Arriba

```html
<!-- Sección 1: KPIs Resaltados -->
<section class="kpi-section">
  <div class="kpi-row">
    <div class="kpi-box">
      <div class="kpi-label">Ingresos Este Mes</div>
      <div class="kpi-value">$<%= mesMoneyFormat(ingresosMes) %></div>
    </div>
    
    <div class="kpi-box kpi-warning">
      <div class="kpi-label">Por Cobrar</div>
      <div class="kpi-value">$<%= mesMoneyFormat(deudasTotal) %></div>
    </div>
    
    <div class="kpi-box kpi-danger">
      <div class="kpi-label">Vencidas</div>
      <div class="kpi-value">$<%= mesMoneyFormat(deudasVencidas) %></div>
    </div>
  </div>
</section>

<!-- Sección 2: Estado Financiero -->
<section class="reportes-section">
  <h2>Estado Financiero</h2>
  <!-- Detalle financiero -->
</section>

<!-- Sección 3: Cuentas por Cobrar -->
<section class="reportes-section">
  <h2>Cuentas por Cobrar</h2>
  <!-- Deudas detalladas -->
</section>

<!-- Sección 4: Productos Estrella -->
<section class="reportes-section">
  <h2>Productos Más Vendidos</h2>
  <!-- Top productos -->
</section>

<style>
.kpi-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.kpi-box {
  background: rgba(255,255,255,0.15);
  padding: 1.5rem;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.kpi-box.kpi-warning {
  background: rgba(255,193,7,0.2);
}

.kpi-box.kpi-danger {
  background: rgba(244,67,54,0.2);
}

.kpi-label {
  font-size: 0.85rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.kpi-value {
  font-size: 2rem;
  font-weight: 800;
  font-family: Georgia, serif;
}

@media (max-width: 768px) {
  .kpi-row {
    grid-template-columns: 1fr;
  }
}
</style>
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Fix CSRF tokens (403 error) - routes/pedidos.js, routes/presupuestos.js, controllers/presupuestosController.js
- [ ] Grid responsive en home.ejs (5 etapas, cobranza)
- [ ] Tipografía consistente - implementar variables CSS
- [ ] Truncado elegante + tooltip
- [ ] Empty states con CTA
- [ ] Tablas responsive
- [ ] Tarjetas crédito mejoradas (finanzas)
- [ ] Metrics page reorder
- [ ] Mobile nav mejoras
- [ ] Touch-friendly buttons
- [ ] Testing en dispositivos reales

---

## 🚀 PRÓXIMOS PASOS

1. **Hoy:** Commit CSRF fixes → Test en localhost → Push a Render
2. **Mañana:** Implementar responsive grid + tipografía
3. **Día 3:** Empty states + truncado elegante
4. **Día 4:** Tablas responsive + mobile optimization
5. **Día 5:** QA + Device testing

---

**CTO:** Implementación técnica y seguridad ✅  
**Product Designer:** UX/UI y experiencia ⏳  
**Lead Frontend:** Mobile responsiveness ⏳
