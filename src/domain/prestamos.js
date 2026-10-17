/**
 * Reglas de la HU-4 (aprobación y entrega). Funciones puras, como las de las otras
 * historias: se usan en los formularios y otra vez en el servicio.
 */
import { duracionDias, formatearFechaCorta, hoyISO } from './solicitudes.js'

export const MOTIVOS_RECHAZO = [
  'Penalidad pendiente',
  'Fechas no disponibles',
  'Equipo en mantenimiento',
  'Motivo insuficiente',
  'Falta autorización del docente',
  'Otro',
]

export const LIMITES_PRESTAMO = {
  detalleRechazo: { min: 10, max: 300 },
  observacionesEntrega: { min: 5, max: 300 },
  notaAccesorio: { max: 60 },
}

/** Hora límite de devolución que figura en la constancia (mockup 4.5). */
export const HORA_DEVOLUCION = '19:00'

export const FILTROS_BANDEJA_INICIALES = {
  estado: 'pendiente',
  equipoId: 'todos',
  desde: '',
  hasta: '',
  texto: '',
  pagina: 1,
  porPagina: 8,
}

/** Vista 4.2 */
export function validarAprobacion({ unidadId, autorizacionVerificada }, { requiereAutorizacion }) {
  const errores = {}
  if (!unidadId) errores.unidadId = 'Elige la unidad que vas a asignar.'
  if (requiereAutorizacion && !autorizacionVerificada)
    errores.autorizacionVerificada =
      'Este equipo requiere la autorización del docente: confírmala antes de aprobar.'
  return errores
}

/** Vista 4.3: el motivo queda visible para el estudiante. */
export function validarRechazo({ motivo, detalle }) {
  const errores = {}
  const L = LIMITES_PRESTAMO.detalleRechazo
  if (!MOTIVOS_RECHAZO.includes(motivo)) errores.motivo = 'Elige el motivo del rechazo.'
  const largo = String(detalle ?? '').trim().length
  if (largo < L.min)
    errores.detalle = `Explica el motivo al estudiante (mínimo ${L.min} caracteres).`
  else if (largo > L.max) errores.detalle = `El detalle admite hasta ${L.max} caracteres.`
  return errores
}

/** Texto que verá el estudiante en «Ver motivo». */
export function textoRechazo({ motivo, detalle }) {
  return `${motivo}: ${detalle.trim()}`
}

/**
 * Vista 4.4. La entrega no puede registrarse en el futuro ni después de la devolución
 * pactada. Se admite recoger antes del día de inicio (el estudiante puede adelantarse).
 */
export function validarEntrega(
  { fechaEntrega, observaciones, accesorios },
  { fechaFin, ahora = new Date() },
) {
  const errores = {}
  const L = LIMITES_PRESTAMO
  const fecha = fechaEntrega ? new Date(fechaEntrega) : null
  if (!fecha || Number.isNaN(fecha.getTime()))
    errores.fechaEntrega = 'Indica la fecha y hora de la entrega.'
  else if (fecha.getTime() > ahora.getTime() + 5 * 60000)
    errores.fechaEntrega = 'La entrega no puede registrarse en el futuro.'
  else if (fechaEntrega.slice(0, 10) > fechaFin)
    errores.fechaEntrega = `La devolución pactada es el ${formatearFechaCorta(fechaFin)}: la entrega no puede ser posterior.`

  const largo = String(observaciones ?? '').trim().length
  if (largo < L.observacionesEntrega.min)
    errores.observaciones = 'Describe el estado en que se entrega el equipo (mínimo 5 caracteres).'
  else if (largo > L.observacionesEntrega.max)
    errores.observaciones = `Las observaciones admiten hasta ${L.observacionesEntrega.max} caracteres.`

  if ((accesorios ?? []).some((a) => String(a.nota ?? '').length > L.notaAccesorio.max))
    errores.accesorios = `Cada nota admite hasta ${L.notaAccesorio.max} caracteres.`
  return errores
}

/** PRE-2026-0318 → siguiente número dentro del mismo año. */
export function siguienteCodigoPrestamo(codigosExistentes, anio = new Date().getFullYear()) {
  const prefijo = `PRE-${anio}-`
  const numeros = codigosExistentes
    .filter((c) => c?.startsWith(prefijo))
    .map((c) => Number(c.slice(prefijo.length)))
    .filter(Number.isFinite)
  return `${prefijo}${String((numeros.length ? Math.max(...numeros) : 0) + 1).padStart(4, '0')}`
}

/** Vista 4.6: vencido, vence hoy o en curso, con los días de retraso o restantes. */
export function vigenciaDe(fechaFin, hoy = hoyISO()) {
  const dias = duracionDias(hoy, fechaFin)
  if (dias < 0) return { tipo: 'vencido', dias: -dias, texto: `${-dias} d de retraso` }
  if (dias === 0) return { tipo: 'hoy', dias: 0, texto: 'vence hoy' }
  return { tipo: 'en_curso', dias, texto: `vence en ${dias} d` }
}

/** «hace 2 h», «hace 1 d»: antigüedad de una solicitud en la bandeja. */
export function antiguedad(fechaIso, ahora = new Date()) {
  const minutos = Math.max(0, Math.round((ahora.getTime() - Date.parse(fechaIso)) / 60000))
  if (minutos < 60) return `hace ${Math.max(1, minutos)} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  return `hace ${Math.round(horas / 24)} d`
}

/** Valor por defecto del campo fecha y hora (datetime-local) con la hora local actual. */
export function ahoraLocal(fecha = new Date()) {
  const desfase = fecha.getTimezoneOffset() * 60000
  return new Date(fecha.getTime() - desfase).toISOString().slice(0, 16)
}
