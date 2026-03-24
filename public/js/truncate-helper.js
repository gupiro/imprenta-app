/**
 * TRUNCATE WITH TOOLTIP HELPER
 * Inicializa tooltips de Bootstrap para elementos truncados
 */

document.addEventListener('DOMContentLoaded', function() {
  // Inicializar todos los tooltips en la página
  initializeTooltips();
  
  // Observar cambios en el DOM (para casos de contenido dinámico)
  observeNewTooltips();
});

/**
 * Inicializa tooltips de Bootstrap para elementos con clase 'truncate-tooltip'
 */
function initializeTooltips() {
  const truncateElements = document.querySelectorAll('.truncate-tooltip');
  
  truncateElements.forEach(element => {
    // Solo agregar tooltip si el texto está realmente truncado
    if (element.scrollWidth > element.clientWidth) {
      const tooltip = new bootstrap.Tooltip(element, {
        title: element.textContent.trim(),
        placement: 'top',
        trigger: 'hover'
      });
    }
  });
}

/**
 * Observa cambios en el DOM para inicializar tooltips en elementos nuevos
 */
function observeNewTooltips() {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        initializeTooltips();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Truncate helper - para usar en templates
 * Trunca texto a un máximo de caracteres
 * 
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Máximo de caracteres
 * @returns {string} - Texto truncado
 */
function truncateText(text, maxLength = 28) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + '…';
}

/**
 * Genera HTML para un elemento truncado con tooltip
 * 
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Máximo de caracteres
 * @param {string} className - Clases CSS adicionales
 * @returns {string} - HTML del elemento truncado con tooltip
 */
function getTruncateHTML(text, maxLength = 28, className = '') {
  if (!text) return '';
  
  const truncated = truncateText(text, maxLength);
  const classes = `truncate truncate-tooltip ${className}`.trim();
  
  return `<span class="${classes}" title="${text}" data-bs-toggle="tooltip">${truncated}</span>`;
}
