/**
 * Reglas de la HU-3 (catálogo y solicitud). Funciones puras: no saben de React ni de
 * dónde salen los datos, así que se usan igual en el formulario y en el servicio, y en
 * la segunda entrega se pueden reutilizar en el servidor.
 */

/** Estados de una solicitud. El valor sigue el db.json del grupo ('en_prestamo'). */
export const ESTADOS_SOLICITUD = [
  { valor: 'pendiente', etiqueta: 'Enviada' },
  { valor: 'aprobada', etiqueta: 'Aprobada' },
  { valor: 'en_prestamo', etiqueta: 'Entregada' },
  { valor: 'devuelta', etiqueta: 'Devuelta' },
  { valor: 'rechazada', etiqueta: 'Rechazada' },
  { valor: 'retirada', etiqueta: 'Retirada' },
]

/** Solo se puede retirar lo que todavía no resolvió el encargado. */
export const ESTADOS_RETIRABLES = ['pendiente']

/** Estados que ocupan una unidad: el encargado ya la asignó (HU-4). */
export const ESTADOS_QUE_OCUPAN = ['aprobada', 'en_prestamo']

/** Estados que cuentan como solicitud abierta del estudiante. */
export const ESTADOS_ABIERTOS = ['pendiente', 'aprobada', 'en_prestamo']

export const CURSOS = [
  { codigo: 'IN324', nombre: 'Laboratorio de Circuitos Electrónicos', docente: 'Ing. Elena Rivas' },
  { codigo: 'IN352', nombre: 'Redes y Comunicaciones', docente: 'Ing. Carlos Benavides' },
  { codigo: 'IN401', nombre: 'Proyecto Integrador', docente: 'Mg. Patricia Salas' },
  { codigo: 'FI201', nombre: 'Física 2', docente: 'Dr. Jorge Valdivia' },
  { codigo: 'CO210', nombre: 'Fotografía Documental', docente: 'Lic. Andrea Ponce' },
  { codigo: 'DI105', nombre: 'Dibujo Digital', docente: 'Lic. Mario Cárdenas' },
]

export const LIMITES_SOLICITUD = {
  motivo: { min: 20, max: 500 },
  /** Más allá de este plazo el estudiante debe usar una reserva (HU-6). */
  anticipacionMaximaDias: 30,
}

/** Filtros del catálogo (vista 3.1). */
export const OPCIONES_DISPONIBILIDAD = [
  { valor: 'libres', etiqueta: 'Con unidades libres' },
  { valor: 'todas', etiqueta: 'Todas' },
]

export const OPCIONES_DURACION = [
  { valor: '7', etiqueta: 'Hasta 7 días' },
  { valor: '15', etiqueta: 'Hasta 15 días' },
  { valor: 'todas', etiqueta: 'Sin límite' },
]

export const ORDENES_CATALOGO = [
  { valor: 'disponibles', etiqueta: 'más disponibles' },
  { valor: 'nombre-asc', etiqueta: 'nombre (A–Z)' },
  { valor: 'nombre-desc', etiqueta: 'nombre (Z–A)' },
  { valor: 'categoria', etiqueta: 'categoría' },
]

export const FILTROS_CATALOGO_INICIALES = {
  categorias: [],
  disponibilidad: 'todas',
  duracion: 'todas',
  texto: '',
  orden: 'disponibles',
  pagina: 1,
  porPagina: 8,
}

export function etiquetaSolicitud(valor) {
  return ESTADOS_SOLICITUD.find((e) => e.valor === valor)?.etiqueta ?? valor
}

export function cursoPorCodigo(codigo) {
  return CURSOS.find((c) => c.codigo === codigo) ?? null
}

// --------------------------------------------------------------------- fechas

const DIA_MS = 86400000
const esISO = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(valor ?? '')
const aUTC = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

/** Fecha de hoy en hora local, como 'AAAA-MM-DD'. */
export function hoyISO(fecha = new Date()) {
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${m}-${d}`
}

export function esFechaValida(iso) {
  if (!esISO(iso)) return false
  const [a, m, d] = iso.split('-').map(Number)
  const fecha = new Date(Date.UTC(a, m - 1, d))
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d
}

export function sumarDias(iso, dias) {
  return new Date(aUTC(iso) + dias * DIA_MS).toISOString().slice(0, 10)
}

/**
 * Días del préstamo, como en el mockup 3.3: del 16/09 al 21/09 son 5 días.
 * Se cuenta desde el día de recojo hasta el de devolución, sin sumar uno.
 */
export function duracionDias(inicio, fin) {
  if (!esFechaValida(inicio) || !esFechaValida(fin)) return null
  return Math.round((aUTC(fin) - aUTC(inicio)) / DIA_MS)
}

/** Dos rangos se cruzan si comparten al menos un día (fechas inclusivas). */
export function seSolapan(inicioA, finA, inicioB, finB) {
  return inicioA <= finB && inicioB <= finA
}

/** '2026-09-16' → '16/09/2026' */
export function formatearFecha(iso) {
  if (!esISO(iso)) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** '2026-09-16' → '16/09' */
export function formatearFechaCorta(iso) {
  return esISO(iso) ? formatearFecha(iso).slice(0, 5) : '—'
}

// --------------------------------------------------------------- validaciones

/**
 * Valida el formulario de solicitud (vista 3.3). Devuelve { campo: mensaje }, vacío
 * si todo está bien. La disponibilidad de unidades no se valida aquí porque depende de
 * los datos; la revisa el servicio.
 */
export function validarSolicitud(datos, { duracionMaxima, hoy = hoyISO() } = {}) {
  const errores = {}
  const { fechaInicio, fechaFin, curso, motivo, aceptaCondiciones } = datos
  const L = LIMITES_SOLICITUD

  if (!fechaInicio) errores.fechaInicio = 'Elige la fecha de inicio.'
  else if (!esFechaValida(fechaInicio)) errores.fechaInicio = 'La fecha de inicio no es válida.'
  else if (fechaInicio < hoy)
    errores.fechaInicio = 'La fecha de inicio no puede ser anterior a hoy.'
  else if (duracionDias(hoy, fechaInicio) > L.anticipacionMaximaDias)
    errores.fechaInicio = `Solo puedes solicitar con hasta ${L.anticipacionMaximaDias} días de anticipación. Para fechas más lejanas, haz una reserva.`

  if (!fechaFin) errores.fechaFin = 'Elige la fecha de devolución.'
  else if (!esFechaValida(fechaFin)) errores.fechaFin = 'La fecha de devolución no es válida.'
  else if (!errores.fechaInicio) {
    const dias = duracionDias(fechaInicio, fechaFin)
    if (dias < 1) errores.fechaFin = 'La devolución debe ser al menos un día después del inicio.'
    else if (duracionMaxima && dias > duracionMaxima)
      errores.fechaFin = `Duración excedida: ${dias} días solicitados y el máximo es ${duracionMaxima}. Ajusta la devolución al ${formatearFecha(sumarDias(fechaInicio, duracionMaxima))} o antes.`
  }

  if (!curso) errores.curso = 'Elige el curso asociado al préstamo.'
  else if (!cursoPorCodigo(curso)) errores.curso = 'El curso elegido no existe.'

  const largo = String(motivo ?? '').trim().length
  if (largo === 0) errores.motivo = 'Cuéntale al encargado para qué necesitas el equipo.'
  else if (largo < L.motivo.min)
    errores.motivo = `El motivo debe tener al menos ${L.motivo.min} caracteres (llevas ${largo}).`
  else if (largo > L.motivo.max)
    errores.motivo = `El motivo admite hasta ${L.motivo.max} caracteres.`

  if (!aceptaCondiciones) errores.aceptaCondiciones = 'Debes aceptar las condiciones del préstamo.'

  return errores
}

// ------------------------------------------------------------- disponibilidad

const DIAS_BUSQUEDA_RANGO = 90

/**
 * Unidades de un equipo libres en un rango de fechas. Una unidad está libre si hoy está
 * disponible en el inventario y no tiene, en esas fechas (inclusivas), una solicitud
 * aprobada o entregada ni una reserva confirmada. La usan la HU-3 (¿hay unidades?) y la
 * HU-4 (¿cuál asigno?). `excluirSolicitudId` evita que una solicitud se tape a sí misma.
 */
export function unidadesLibresEnRango(
  equipo,
  inicio,
  fin,
  solicitudes,
  reservas = [],
  opciones = {},
) {
  const { excluirSolicitudId = null } = opciones
  const candidatas = equipo.unidades.filter((u) => u.estado === 'disponible')
  const ocupaciones = [
    ...solicitudes.filter(
      (s) =>
        s.id !== excluirSolicitudId &&
        s.equipoId === equipo.id &&
        ESTADOS_QUE_OCUPAN.includes(s.estado) &&
        s.unidadId,
    ),
    ...reservas.filter((r) => r.equipoId === equipo.id && r.unidadId),
  ]
  return candidatas.filter(
    (unidad) =>
      !ocupaciones.some(
        (o) => o.unidadId === unidad.id && seSolapan(inicio, fin, o.fechaInicio, o.fechaFin),
      ),
  )
}

/** Primer rango de la misma duración, desde el día siguiente, con al menos una unidad libre. */
export function proximoRangoLibre(equipo, inicio, fin, solicitudes, reservas = [], opciones = {}) {
  if (!equipo.unidades.some((u) => u.estado === 'disponible')) return null
  for (let k = 1; k <= DIAS_BUSQUEDA_RANGO; k++) {
    const i = sumarDias(inicio, k)
    const f = sumarDias(fin, k)
    if (unidadesLibresEnRango(equipo, i, f, solicitudes, reservas, opciones).length > 0)
      return { inicio: i, fin: f }
  }
  return null
}

export function puedeRetirarse(solicitud) {
  return ESTADOS_RETIRABLES.includes(solicitud.estado)
}
