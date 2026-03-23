/**
 * Table Interactive Enhancement
 * Agrega funcionalidad de sort y filter a tablas con data-interactive="true"
 */

class InteractiveTable {
  constructor(tableElement) {
    this.table = tableElement;
    this.tbody = this.table.querySelector('tbody');
    this.thead = this.table.querySelector('thead');
    this.rows = Array.from(this.tbody.querySelectorAll('tr'));
    this.originalRows = [...this.rows];
    this.sortConfig = { column: null, direction: 'asc' };

    this.init();
  }

  init() {
    this.addSortHeaders();
    this.addFilterInputs();
  }

  /**
   * Agrega indicadores de sort a encabezados
   */
  addSortHeaders() {
    const headers = this.thead.querySelectorAll('th');
    headers.forEach((header, index) => {
      // Ignorar columnas de acciones
      if (header.textContent.toLowerCase().includes('acción') ||
          header.textContent.toLowerCase().includes('action')) {
        return;
      }

      header.style.cursor = 'pointer';
      header.style.userSelect = 'none';
      header.classList.add('sortable-header');

      header.addEventListener('click', () => {
        this.sort(index);
      });

      // Agregar icono de sort
      const icon = document.createElement('span');
      icon.className = 'sort-icon';
      icon.textContent = ' ↕';
      header.appendChild(icon);
    });
  }

  /**
   * Agrega inputs de filtro sobre la tabla
   */
  addFilterInputs() {
    const container = this.table.parentElement;
    const filterRow = document.createElement('div');
    filterRow.className = 'table-filters mb-3 d-flex gap-2';
    filterRow.style.flexWrap = 'wrap';

    const headers = this.thead.querySelectorAll('th');
    headers.forEach((header, index) => {
      if (header.textContent.toLowerCase().includes('acción')) return;

      const columnName = header.textContent.trim();
      const filterInput = document.createElement('input');
      filterInput.type = 'text';
      filterInput.placeholder = `Filtrar ${columnName}...`;
      filterInput.className = 'form-control form-control-sm';
      filterInput.style.maxWidth = '200px';

      filterInput.addEventListener('input', (e) => {
        this.filter(index, e.target.value);
      });

      filterRow.appendChild(filterInput);
    });

    // Botón limpiar filtros
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-sm btn-outline-secondary';
    clearBtn.textContent = 'Limpiar Filtros';
    clearBtn.addEventListener('click', () => {
      this.clearFilters();
    });
    filterRow.appendChild(clearBtn);

    container.insertBefore(filterRow, this.table);
  }

  /**
   * Ordena tabla por columna
   */
  sort(columnIndex) {
    // Toggle dirección si es la misma columna
    if (this.sortConfig.column === columnIndex) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.column = columnIndex;
      this.sortConfig.direction = 'asc';
    }

    const direction = this.sortConfig.direction === 'asc' ? 1 : -1;

    this.rows.sort((rowA, rowB) => {
      const cellA = rowA.children[columnIndex]?.textContent.trim() || '';
      const cellB = rowB.children[columnIndex]?.textContent.trim() || '';

      // Intentar comparar como números
      const numA = parseFloat(cellA.replace(/[^0-9.-]/g, ''));
      const numB = parseFloat(cellB.replace(/[^0-9.-]/g, ''));

      if (!isNaN(numA) && !isNaN(numB)) {
        return (numA - numB) * direction;
      }

      // Comparar como strings
      return cellA.localeCompare(cellB, 'es-AR') * direction;
    });

    this.render();
    this.updateSortIcons();
  }

  /**
   * Filtra tabla por valor en columna
   */
  filter(columnIndex, searchValue) {
    const filtered = this.originalRows.filter(row => {
      const cell = row.children[columnIndex]?.textContent.toLowerCase() || '';
      return cell.includes(searchValue.toLowerCase());
    });

    this.rows = filtered;
    this.render();
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters() {
    const inputs = document.querySelectorAll('.table-filters input');
    inputs.forEach(input => input.value = '');

    this.rows = [...this.originalRows];
    this.render();
  }

  /**
   * Re-renderiza tabla con rows actuales
   */
  render() {
    this.tbody.innerHTML = '';
    this.rows.forEach(row => {
      this.tbody.appendChild(row.cloneNode(true));
    });
  }

  /**
   * Actualiza iconos de sort en headers
   */
  updateSortIcons() {
    const headers = this.thead.querySelectorAll('th');
    headers.forEach((header, index) => {
      const icon = header.querySelector('.sort-icon');
      if (!icon) return;

      if (index === this.sortConfig.column) {
        icon.textContent = this.sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
        icon.style.color = '#2563eb';
        icon.style.fontWeight = 'bold';
      } else {
        icon.textContent = ' ↕';
        icon.style.color = '#9ca3af';
        icon.style.fontWeight = 'normal';
      }
    });
  }
}

/**
 * Inicializar tablas interactivas
 */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-interactive="true"]').forEach(table => {
    new InteractiveTable(table);
  });
});

/**
 * Utilidad: Hacer tabla interactiva después de AJAX
 */
function makeTableInteractive(tableElement) {
  new InteractiveTable(tableElement);
}
