/**
 * Títulos con cada palabra en mayúscula inicial: "instrumento musical" ->
 * "Instrumento Musical".
 *
 * Se aplica al MOSTRAR, nunca al guardar. Cambiar los nombres en la base rompería
 * cosas que cruzan por nombre exacto: el import de mockapi une los gustos con
 * `JOIN likes l ON l.name = v.name`, y las claves de traducción son el nombre en
 * minúsculas (`likes.música`).
 *
 * Los conectores cortos se dejan en minúscula, porque "Deportes Y Salud" o
 * "Instrumento De Música" se leen mal en español. Si se prefiere que TODAS las
 * palabras lleven mayúscula sin excepción, basta con vaciar CONECTORES.
 */
const CONECTORES = new Set([
  'y', 'e', 'o', 'u', 'de', 'del', 'la', 'las', 'el', 'los', 'al',
  'a', 'en', 'con', 'por', 'para', 'sin', 'un', 'una', 'and', 'or', 'of', 'the',
]);

export const capitalizarTitulo = (texto) => {
  if (!texto || typeof texto !== 'string') return texto || '';

  return texto
    .trim()
    // Se conservan los separadores (espacios, guiones y barras) para no alterar
    // el texto: solo cambia la primera letra de cada palabra.
    .split(/(\s+|-|\/)/)
    .map((parte, indice) => {
      if (!/\p{L}/u.test(parte)) return parte; // espacios y signos: tal cual
      const minuscula = parte.toLowerCase();
      // La primera palabra siempre lleva mayúscula, aunque sea un conector.
      if (indice > 0 && CONECTORES.has(minuscula)) return minuscula;
      return minuscula.charAt(0).toUpperCase() + minuscula.slice(1);
    })
    .join('');
};
