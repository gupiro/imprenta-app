// public/js/presupuesto.js

// Lista de productos públicos (inyectada desde la vista)
const productos = window._PRESUPUESTO_PRODUCTOS || [];
let contador = 0;

function agregarImagen() {
  contador++;
  const cont = document.getElementById('imagenes-container');
  const div = document.createElement('div');
  div.id = `producto_${contador}`;
  div.className = 'border p-3 rounded mb-3 position-relative';
  div.innerHTML = `
    <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2" aria-label="Eliminar">&times;</button>
    <div class="mb-2 fw-bold">Producto ${contador}</div>
    <div class="mb-2">
      <input type="file" name="imagenes[]" class="form-control" required>
    </div>
    <div class="mb-2">
      <label>Producto:</label>
      <select name="producto_imagen[]" class="form-select" required onchange="mostrarCampos(this, ${contador})">
        <option value="">Seleccioná un producto</option>
        ${productos.map(p => `
          <option value="${p.id}" data-tipo="${p.tipo}" data-precio="${p.precio_base}" data-minimo="${p.minimo}">
            ${p.nombre} – €${p.precio_base.toFixed(2)}
          </option>`).join('')}
      </select>
    </div>
    <div id="campos_${contador}"></div>
    <div class="mb-2">
      <label>Detalle:</label>
      <textarea name="detalle_imagen[]" class="form-control" placeholder="¿Qué necesitás con este producto?"></textarea>
    </div>
    <div class="mb-2">
      <label>Precio estimado (€):</label>
      <input type="number" name="precio_imagen[]" class="form-control precio-img" value="0" readonly>
    </div>
  `;
  // Añade manejador al botón de eliminar (primero seleccionamos la X roja)
  div.querySelector('.btn-danger').addEventListener('click', () => eliminarProducto(contador));
  cont.appendChild(div);
}

function eliminarProducto(idx) {
  const elem = document.getElementById(`producto_${idx}`);
  if (elem) {
    elem.remove();
    calcularTotalEstimado();
  }
}

function mostrarCampos(select, idx) {
  const selected = select.selectedOptions[0];
  const tipo     = selected.dataset.tipo;
  const precio   = parseFloat(selected.dataset.precio || 0);
  const minimo   = parseFloat(selected.dataset.minimo || 1);
  const div      = document.getElementById('campos_' + idx);
  div.innerHTML  = '';

  if (tipo === 'unidad' || tipo === 'hoja') {
    div.innerHTML = `
      <div class="mb-2">
        <label>Cantidad:</label>
        <input type="number" class="form-control" name="cantidad_imagen[]" value="${minimo}" min="${minimo}" onchange="calcularPrecioImagen(this, ${precio}, ${idx})">
      </div>`;
  } else if (tipo === 'metro_cuadrado') {
    div.innerHTML = `
      <div class="mb-2">
        <label>Medidas (m):</label>
        <div class="d-flex gap-2">
          <input type="number" class="form-control" name="ancho_imagen[]" placeholder="Ancho" step="0.01" onchange="calcularPrecioImagen(this, ${precio}, ${idx})">
          <input type="number" class="form-control" name="alto_imagen[]"  placeholder="Alto"  step="0.01" onchange="calcularPrecioImagen(this, ${precio}, ${idx})">
        </div>
        <small class="text-muted">Mínimo facturable: ${minimo} m²</small>
      </div>`;
  }
}

function calcularPrecioImagen(el, precioBase, idx) {
  const wrapper = el.closest('.border');
  const select  = wrapper.querySelector('select[name="producto_imagen[]"]');
  const tipo    = select.selectedOptions[0].dataset.tipo;
  const minimo  = parseFloat(select.selectedOptions[0].dataset.minimo || 1);
  let precio    = 0;

  if (tipo === 'unidad' || tipo === 'hoja') {
    const qty = parseFloat(wrapper.querySelector('input[name="cantidad_imagen[]"]')?.value || 0);
    precio = Math.max(qty, minimo) * precioBase;
  } else if (tipo === 'metro_cuadrado') {
    const ancho = parseFloat(wrapper.querySelector('input[name="ancho_imagen[]"]')?.value || 0);
    const alto  = parseFloat(wrapper.querySelector('input[name="alto_imagen[]"]')?.value || 0);
    const area  = Math.max(ancho * alto, minimo);
    precio = area * precioBase;
  }

  wrapper.querySelector('.precio-img').value = precio.toFixed(2);
  calcularTotalEstimado();
}

function calcularTotalEstimado() {
  let total = 0;
  document.querySelectorAll('.precio-img').forEach(inp => {
    total += parseFloat(inp.value) || 0;
  });
  document.getElementById('total_estimado').value = total.toFixed(2);
}
