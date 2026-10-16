/**
 * Catálogos y reglas del dominio de la HU-2.
 * Capa de dominio: no conoce React ni el origen de los datos.
 * Los valores siguen los mockups de alta fidelidad del Tema 7 (vistas 2.1 a 2.6).
 */

export const ALMACEN = {
  codigo: 'H-102',
  nombre: 'Almacén H-102',
  horarioRecojo: 'lunes a viernes de 08:00 a 19:00',
}

export const CATEGORIAS = [
  { valor: 'medicion', etiqueta: 'Medición' },
  { valor: 'audiovisual', etiqueta: 'Audiovisual' },
  { valor: 'robotica', etiqueta: 'Robótica' },
  { valor: 'computo', etiqueta: 'Cómputo' },
  { valor: 'redes', etiqueta: 'Redes' },
  { valor: 'lab-fisica', etiqueta: 'Lab. de física' },
]

/** Ubicaciones posibles de una unidad. En la vista es un desplegable, no texto libre. */
export const UBICACIONES = [
  'Almacén H-102 · anaquel 1',
  'Almacén H-102 · anaquel 2',
  'Almacén H-102 · anaquel 3',
  'Almacén H-102 · vitrina',
  'Almacén N-005',
  'Lab. Electrónica H-210',
  'Lab. Física N-301',
  'Servicio técnico externo',
]

export const ESTADOS_UNIDAD = [
  { valor: 'disponible', etiqueta: 'Disponible', corta: 'libre', plural: 'libres' },
  { valor: 'prestada', etiqueta: 'Prestada', corta: 'prestada', plural: 'prestadas' },
  { valor: 'mantenimiento', etiqueta: 'Mantenimiento', corta: 'mant.', plural: 'mant.' },
  { valor: 'baja', etiqueta: 'Dada de baja', corta: 'de baja', plural: 'de baja' },
]

/** Transiciones admitidas por estado. `baja` es terminal. */
export const TRANSICIONES = {
  disponible: ['prestada', 'mantenimiento', 'baja'],
  prestada: ['disponible', 'mantenimiento'],
  mantenimiento: ['disponible', 'baja'],
  baja: [],
}

/**
 * La entrega y la devolución las registra la HU-4 y la HU-5. Desde el inventario,
 * el encargado no mueve una unidad a "prestada" a mano.
 */
export const TRANSICIONES_MANUALES = {
  disponible: ['mantenimiento', 'baja'],
  prestada: ['mantenimiento'],
  mantenimiento: ['disponible', 'baja'],
  baja: [],
}

export const FORMATO_CODIGO = /^INV-[A-Z]{3}-\d{4}$/

export const LIMITES = {
  nombre: { min: 3, max: 80 },
  modelo: { min: 1, max: 40 },
  marca: { min: 2, max: 40 },
  descripcion: { max: 400 },
  accesorios: { max: 12 },
  fotografias: { max: 6 },
  duracionMaximaDias: { min: 1, max: 90 },
  penalidadPorDia: { min: 0, max: 500 },
  observaciones: { max: 300 },
  motivo: { min: 5, max: 200 },
}

export function etiquetaCategoria(valor) {
  return CATEGORIAS.find((c) => c.valor === valor)?.etiqueta ?? valor
}

export function etiquetaEstado(valor) {
  return ESTADOS_UNIDAD.find((e) => e.valor === valor)?.etiqueta ?? valor
}

export function etiquetaCorta(valor, cantidad) {
  const estado = ESTADOS_UNIDAD.find((e) => e.valor === valor)
  if (!estado) return valor
  return cantidad === 1 ? estado.corta : estado.plural
}

export function transicionesDe(estado, { manuales = true } = {}) {
  const tabla = manuales ? TRANSICIONES_MANUALES : TRANSICIONES
  return tabla[estado] ?? []
}

export function esTransicionValida(desde, hacia, opciones) {
  return transicionesDe(desde, opciones).includes(hacia)
}

export function formatearSoles(monto) {
  return `S/ ${Number(monto ?? 0).toFixed(2)}`
}

/** Derivados del contrato de datos. Se calculan siempre aquí, en un solo lugar. */
export function derivarEquipo(equipo, unidadesDelEquipo) {
  const unidades = unidadesDelEquipo ?? []
  const porEstado = {
    disponible: unidades.filter((u) => u.estado === 'disponible').length,
    prestada: unidades.filter((u) => u.estado === 'prestada').length,
    mantenimiento: unidades.filter((u) => u.estado === 'mantenimiento').length,
    baja: unidades.filter((u) => u.estado === 'baja').length,
  }
  const unidadesActivas = unidades.length - porEstado.baja
  return {
    ...equipo,
    totalUnidades: unidades.length,
    unidadesDisponibles: porEstado.disponible,
    unidadesActivas,
    unidadesPorEstado: porEstado,
    esPublicable: unidadesActivas > 0 && !equipo.esBorrador,
  }
}

/** Frase de condiciones que ve el estudiante. Se arma en un solo lugar para que la
 *  vista previa del encargado y la ficha pública digan exactamente lo mismo. */
export function frasePreviaCondiciones(condiciones) {
  const dias = Number(condiciones?.duracionMaximaDias) || 0
  const partes = [
    `Préstamo de hasta ${dias} ${dias === 1 ? 'día' : 'días'} calendario.`,
    condiciones?.requiereAutorizacion
      ? 'Requiere la autorización del docente del curso asociado.'
      : 'No requiere autorización adicional.',
    condiciones?.admiteRenovacion ? 'Admite una renovación.' : 'No admite renovación.',
  ]
  const penalidad = Number(condiciones?.penalidadPorDia) || 0
  partes.push(
    penalidad > 0
      ? `El retraso genera una penalidad de ${formatearSoles(penalidad)} por día.`
      : 'El retraso no genera penalidad.',
  )
  return partes.join(' ')
}
