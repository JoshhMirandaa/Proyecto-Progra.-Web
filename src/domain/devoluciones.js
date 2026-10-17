/**
 * Reglas de la HU-5 (devoluciones). Funciones puras: se usan en los formularios y otra
 * vez en el servicio, y en la segunda entrega se pueden reutilizar en el servidor.
 */
import { duracionDias, formatearFecha, hoyISO, sumarDias } from './solicitudes.js'

/** Estado en que retorna la unidad (mockup 5.1). */
export const ESTADOS_RETORNO = [
  { valor: 'sin_novedades', etiqueta: 'Sin novedades' },
  { valor: 'con_danos', etiqueta: 'Con daños' },
  { valor: 'faltantes', etiqueta: 'Faltantes' },
]

export const LIMITES_DEVOLUCION = {
  descripcionDano: { min: 10, max: 400 },
  observaciones: { max: 300 },
  diasRenovacion: { min: 1 },
}

export function etiquetaRetorno(valor) {
  return ESTADOS_RETORNO.find((e) => e.valor === valor)?.etiqueta ?? valor
}

/** Días de retraso respecto de la devolución pactada; 0 si se devolvió a tiempo. */
export function diasRetraso(fechaFin, fechaRetorno) {
  const dias = duracionDias(fechaFin, fechaRetorno)
  return dias && dias > 0 ? dias : 0
}

/** Penalidad: días de retraso por la penalidad diaria del equipo (mockup 5.1). */
export function calcularPenalidad(dias, penalidadPorDia) {
  return Math.max(0, dias) * (Number(penalidadPorDia) || 0)
}

/**
 * Vista 5.1. La fecha de retorno no puede ser anterior a la entrega ni posterior a hoy.
 * Si el retorno no es «sin novedades», hace falta el paso 5.2.
 */
export function validarDevolucion(datos, { fechaEntrega, hoy = hoyISO() }) {
  const errores = {}
  const { fechaRetorno, estadoRetorno, accesorios = [], descripcionDano, faltantes = [] } = datos

  if (!fechaRetorno) errores.fechaRetorno = 'Indica la fecha de retorno.'
  else if (fechaRetorno > hoy) errores.fechaRetorno = 'La fecha de retorno no puede ser futura.'
  else if (fechaEntrega && fechaRetorno < fechaEntrega)
    errores.fechaRetorno = `No puede ser anterior a la entrega (${formatearFecha(fechaEntrega)}).`

  if (!ESTADOS_RETORNO.some((e) => e.valor === estadoRetorno))
    errores.estadoRetorno = 'Elige el estado de retorno.'

  const sinDevolver = accesorios.filter((a) => !a.devuelto).map((a) => a.nombre)
  if (estadoRetorno === 'sin_novedades' && sinDevolver.length)
    errores.estadoRetorno = `Faltan accesorios (${sinDevolver.join(', ')}): marca «Faltantes».`

  if (estadoRetorno === 'con_danos') {
    const L = LIMITES_DEVOLUCION.descripcionDano
    const largo = String(descripcionDano ?? '').trim().length
    if (largo < L.min) errores.descripcionDano = `Describe el daño (mínimo ${L.min} caracteres).`
    else if (largo > L.max)
      errores.descripcionDano = `La descripción admite hasta ${L.max} caracteres.`
  }
  if (estadoRetorno === 'faltantes' && faltantes.length === 0)
    errores.faltantes = 'Marca qué accesorios faltan.'
  return errores
}

/**
 * Vista 5.3. Se renueva si el equipo lo admite, el préstamo no está vencido, nadie espera
 * ese equipo (lista de espera de la HU-6) y la misma unidad sigue libre en los días nuevos.
 * Devuelve { posible, motivo, nuevaFechaFin, diasMaximos }.
 */
export function evaluarRenovacion({
  solicitud,
  equipo,
  enEspera = 0,
  unidadOcupadaHasta = null,
  hoy = hoyISO(),
}) {
  const diasMaximos = Number(equipo?.condicionesPrestamo?.duracionMaximaDias) || 0
  const base = { diasMaximos, nuevaFechaFin: sumarDias(solicitud.fechaFin, diasMaximos) }
  if (!equipo?.condicionesPrestamo?.admiteRenovacion)
    return {
      ...base,
      posible: false,
      tipo: 'no_admite',
      motivo: 'Este equipo no admite renovación.',
    }
  if ((solicitud.renovaciones ?? []).length > 0)
    return {
      ...base,
      posible: false,
      tipo: 'ya_renovado',
      motivo: 'El préstamo ya se renovó una vez.',
    }
  if (solicitud.fechaFin < hoy)
    return {
      ...base,
      posible: false,
      tipo: 'vencido',
      motivo: 'El préstamo está vencido: primero hay que registrar la devolución.',
    }
  if (enEspera > 0)
    return {
      ...base,
      posible: false,
      tipo: 'lista_espera',
      motivo: `Hay ${enEspera} ${enEspera === 1 ? 'estudiante' : 'estudiantes'} en la lista de espera de este equipo.`,
    }
  if (unidadOcupadaHasta)
    return {
      ...base,
      posible: false,
      tipo: 'unidad_ocupada',
      motivo: `La unidad ya está asignada a otro préstamo desde el ${formatearFecha(unidadOcupadaHasta)}.`,
    }
  return { ...base, posible: true, tipo: 'posible', motivo: '' }
}

export function validarRenovacion({ dias }, { diasMaximos }) {
  const errores = {}
  const n = Number(dias)
  if (!Number.isInteger(n) || n < LIMITES_DEVOLUCION.diasRenovacion.min)
    errores.dias = 'Indica cuántos días se extiende.'
  else if (n > diasMaximos) errores.dias = `La renovación admite hasta ${diasMaximos} días.`
  return errores
}

/** Deuda pendiente: suma de las penalidades no pagadas. */
export function deudaDe(solicitudes) {
  return solicitudes
    .filter((s) => s.penalidad?.estado === 'pendiente')
    .reduce((total, s) => total + (Number(s.penalidad.monto) || 0), 0)
}
