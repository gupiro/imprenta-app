/**
 * 52 Frases Motivacionales - Una por semana del año
 * Para Imprenta El Gráfico
 */

const frases = [
  // Semana 1
  "Cada hoja impresa es el comienzo de una nueva oportunidad de negocio. ¡Vamos! 🚀",

  // Semana 2
  "Los clientes felices son los mejores publicidad. Sigue adelante con excelencia. ✨",

  // Semana 3
  "Un pedido perfecto hoy es un cliente de por vida mañana. 💼",

  // Semana 4
  "La calidad en cada detalle nos diferencia de la competencia. 🎯",

  // Semana 5
  "Cada venta es una oportunidad para demostrar nuestro valor. 💪",

  // Semana 6
  "Los números no mienten: tus esfuerzos están rindiendo frutos. 📊",

  // Semana 7
  "Organización hoy = éxito mañana. Sigue registrando cada movimiento. 📝",

  // Semana 8
  "Los mejores negocios crecen con disciplina y atención a detalles. ⚙️",

  // Semana 9
  "Tu dedicación es el ingrediente secreto del éxito empresarial. 🔑",

  // Semana 10
  "Cada cliente que vuelve es un testimonio de tu excelencia. 🌟",

  // Semana 11
  "Los datos que registras hoy son insights valiosos para mañana. 💡",

  // Semana 12
  "La paciencia y el trabajo constante nunca fallan. Sigue adelante. 🌱",

  // Semana 13
  "Tu imprenta es el corazón de muchas historias de negocios ajenos. ❤️",

  // Semana 14
  "La mejor inversión es la que haces en mejorar tu servicio. 💎",

  // Semana 15
  "Hoy es el día perfecto para superar tus objetivos de la semana. 🎪",

  // Semana 16
  "Los números crecientes son prueba de tu buen trabajo. ¡Celebra! 🎉",

  // Semana 17
  "Cada presupuesto aceptado es una victoria merecida. 🏆",

  // Semana 18
  "La consistencia en calidad genera clientes leales. Mantén el ritmo. 🔄",

  // Semana 19
  "Tu caja diaria es un reflejo de tu disciplina empresarial. 💰",

  // Semana 20
  "Los desafíos son oportunidades disfrazadas. ¡Adelante! 🎯",

  // Semana 21
  "Cada nuevo cliente es un voto de confianza en tu trabajo. 🙏",

  // Semana 22
  "La excelencia no es un destino, es un camino que caminas diario. 🛤️",

  // Semana 23
  "Tu negocio crece cuando escuchas y atiendes bien a tus clientes. 👂",

  // Semana 24
  "Los beneficios vienen cuando inviertes en calidad constante. 📈",

  // Semana 25
  "Cada pedido entregado a tiempo es una promesa cumplida. ✅",

  // Semana 26
  "Medio año de esfuerzo: celebra lo logrado, planifica lo próximo. 🎊",

  // Semana 27
  "Tu sistema de registro es tu mejor aliado para crecer con inteligencia. 🧠",

  // Semana 28
  "La calidad siempre tiene precio, pero el valor es infinito. 💫",

  // Semana 29
  "Cada semana sin errores es una semana donde ganaste experiencia. 🎓",

  // Semana 30
  "Los clientes no solo compran productos, compran tus promesas. Cumple. 🤝",

  // Semana 31
  "La organización de tus datos es la organizatión de tu éxito. 🗂️",

  // Semana 32
  "Tu imprenta es un negocio en crecimiento. Créelo y actúa. 🌳",

  // Semana 33
  "Cada gasto registrado es una inversión en tu futuro. 💸",

  // Semana 34
  "Los competidores ven amenaza, tú ves oportunidad. Sigue así. 👁️",

  // Semana 35
  "Tu perseverancia es tu mayor fortaleza. No te rindas. 💪",

  // Semana 36
  "Los números de hoy son las historias de éxito de mañana. 📖",

  // Semana 37
  "Cada cliente satisfecho es un embajador de tu marca. 🌍",

  // Semana 38
  "La excelencia en pequeños detalles crea grandes resultados. 🔬",

  // Semana 39
  "Tu dedicación diaria es el combustible del crecimiento empresarial. ⛽",

  // Semana 40
  "Los desafíos de hoy son las soluciones que compartirás mañana. 🌉",

  // Semana 41
  "Casi a la meta del año. Acelera con inteligencia. 🏃",

  // Semana 42
  "Cada presupuesto es una conversación que abre nuevas oportunidades. 💬",

  // Semana 43
  "Los números en tu dashboard reflejan tu compromiso con la excelencia. 📊",

  // Semana 44
  "Tu negocio prospera cuando combinas pasión con sistema. ⚡",

  // Semana 45
  "La calidad es tu firma. Que cada impresión lo demuestre. ✍️",

  // Semana 46
  "Los clientes fieles son el resultado de tu consistencia. 🎖️",

  // Semana 47
  "Cada semana cerrada con éxito es una semana de aprendizaje ganado. 📚",

  // Semana 48
  "Tu imprenta no solo vende, empodera negocios ajenos. Siente el impacto. 🌟",

  // Semana 49
  "La recta final del año: termina fuerte, planifica mejor. 🏁",

  // Semana 50
  "Tus esfuerzos de todo el año están a punto de ser cosechados. 🌾",

  // Semana 51
  "Celebra cada logro, sin importar el tamaño. Lo mereciste. 🥳",

  // Semana 52
  "Próximo año será mejor porque hoy sembraste las semillas correctas. 🌻"
];

/**
 * Calcula el número de semana del año actual
 * @returns {number} Número de semana (1-52)
 */
function getNumeroSemana() {
    const ahora = new Date();
    const inicioAnio = new Date(ahora.getFullYear(), 0, 1);
    const milisegundosPorDia = 86400000;
    const diasPasados = Math.floor((ahora - inicioAnio) / milisegundosPorDia);
    const semana = Math.ceil((diasPasados + inicioAnio.getDay() + 1) / 7);
    return semana > 52 ? 52 : (semana < 1 ? 1 : semana);
}

/**
 * Devuelve la frase motivacional de la semana actual
 * @returns {string} Frase motivacional
 */
function getFraseDelDia() {
    const numeroSemana = getNumeroSemana();
    return frases[numeroSemana - 1] || frases[0];
}

module.exports = {
    frases,
    getFraseDelDia,
    getNumeroSemana
};
