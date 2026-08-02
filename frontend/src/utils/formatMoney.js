/**
 * Formatea un número como moneda colombiana: sin decimales, con punto de mil.
 * Ejemplo: 15000 → "$15.000"
 */
export default function formatMoney(value) {
  const num = Math.round(Number(value) || 0)
  return '$' + num.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}
