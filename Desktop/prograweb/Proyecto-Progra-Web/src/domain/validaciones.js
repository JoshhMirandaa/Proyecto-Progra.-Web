/**
 * Validaciones del dominio. Devuelven un objeto { campo: mensaje } vacío si todo está bien.
 * Se usan en el front en esta primera entrega y se repetirán en el servidor en la segunda
 * (requerimiento no funcional: no confiar en las validaciones del cliente).
 */
import { CATEGORIAS, FORMATO_CODIGO, LIMITES, UBICACIONES, esTransicionValida } from './catalogos.js'

const vacio = (v) => !v || String(v).trim().length === 0
const largo = (v) => String(v ?? '').trim().length

export function validarEquipo(datos, { equiposExistentes = [], idActual = null } = {}) {
  const errores = {}
  const L = LIMITES

  if (vacio(datos.nombre)) errores.nombre = 'El nombre es obligatorio.'
  else if (largo(datos.nombre) < L.nombre.min || largo(datos.nombre) > L.nombre.max)
    errores.nombre = `El nombre debe tener entre ${L.nombre.min} y ${L.nombre.max} caracteres.`

  if (vacio(datos.marca)) errores.marca = 'La marca es obligatoria.'
  else if (largo(datos.marca) < L.marca.min || largo(datos.marca) > L.marca.max)
    errores.marca = `La marca debe tener entre ${L.marca.min} y ${L.marca.max} caracteres.`

  if (vacio(datos.modelo)) errores.modelo = 'El modelo es obligatorio.'
  else if (largo(datos.modelo) > L.modelo.max)
    errores.modelo = `El modelo admite hasta ${L.modelo.max} caracteres.`

  // marca + modelo identifican al equipo: no puede repetirse
  if (!vacio(datos.marca) && !vacio(datos.modelo)) {
    const clave = (e) => `${e.marca}|${e.modelo}`.toLowerCase().trim()
    const esta = equiposExistentes.some(
      (e) => e.id !== idActual && clave(e) === clave(datos).toLowerCase(),
    )
    if (esta) errores.modelo = 'Ya existe un equipo con esta marca y modelo.'
  }

  if (vacio(datos.categoria)) errores.categoria = 'Elige una categoría.'
  else if (!CATEGORIAS.some((c) => c.valor === datos.categoria))
    errores.categoria = 'La categoría elegida no existe.'

  if (largo(datos.descripcion) > L.descripcion.max)
    errores.descripcion = `La descripción admite hasta ${L.descripcion.max} caracteres. Van ${largo(datos.descripcion)}.`

  if ((datos.accesorios ?? []).length > L.accesorios.max)
    errores.accesorios = `Registra como máximo ${L.accesorios.max} accesorios.`

  if ((datos.fotografias ?? []).length > L.fotografias.max)
    errores.fotografias = `Registra como máximo ${L.fotografias.max} fotografías.`

  // Las condiciones del préstamo se editan en su propia pestaña (vista 2.5)
  // y tienen su propia validación: ver validarCondiciones.
  return errores
}

export function validarCondiciones(condiciones) {
  const errores = {}
  const L = LIMITES

  const dias = Number(condiciones.duracionMaximaDias)
  if (condiciones.duracionMaximaDias === '' || condiciones.duracionMaximaDias == null)
    errores.duracionMaximaDias = 'Indica la duración máxima.'
  else if (Number.isNaN(dias) || !Number.isInteger(dias))
    errores.duracionMaximaDias = 'La duración se registra en días enteros.'
  else if (dias < L.duracionMaximaDias.min || dias > L.duracionMaximaDias.max)
    errores.duracionMaximaDias = `La duración va de ${L.duracionMaximaDias.min} a ${L.duracionMaximaDias.max} días.`

  const penalidad = Number(condiciones.penalidadPorDia)
  if (condiciones.penalidadPorDia === '' || condiciones.penalidadPorDia == null)
    errores.penalidadPorDia = 'Indica la penalidad por día. Usa 0 si no aplica.'
  else if (Number.isNaN(penalidad))
    errores.penalidadPorDia = 'La penalidad se registra en soles.'
  else if (penalidad < L.penalidadPorDia.min || penalidad > L.penalidadPorDia.max)
    errores.penalidadPorDia = `La penalidad va de ${L.penalidadPorDia.min} a ${L.penalidadPorDia.max} soles.`

  return errores
}

export function validarUnidad(datos, { codigosOcupados = [] } = {}) {
  const errores = {}
  const L = LIMITES

  const codigo = String(datos.codigoInventario ?? '').trim().toUpperCase()
  if (vacio(codigo)) errores.codigoInventario = 'El código de inventario es obligatorio.'
  else if (!FORMATO_CODIGO.test(codigo))
    errores.codigoInventario = 'Usa el formato INV-XXX-0000, por ejemplo INV-OSC-0047.'
  else if (codigosOcupados.includes(codigo))
    errores.codigoInventario = `El código ${codigo} ya está registrado en el almacén.`

  if (vacio(datos.ubicacion)) errores.ubicacion = 'Elige la ubicación de la unidad.'
  else if (!UBICACIONES.includes(datos.ubicacion))
    errores.ubicacion = 'La ubicación elegida no existe.'

  if (largo(datos.observaciones) > L.observaciones.max)
    errores.observaciones = `Las observaciones admiten hasta ${L.observaciones.max} caracteres. Van ${largo(datos.observaciones)}.`

  return errores
}

export function validarCambioEstado({ estadoActual, estadoNuevo, motivo }) {
  const errores = {}
  const L = LIMITES

  if (vacio(estadoNuevo)) errores.estadoNuevo = 'Elige el nuevo estado.'
  else if (estadoNuevo === estadoActual) errores.estadoNuevo = 'La unidad ya está en ese estado.'
  else if (!esTransicionValida(estadoActual, estadoNuevo))
    errores.estadoNuevo = 'Esa transición no está permitida desde el estado actual.'

  if (vacio(motivo)) errores.motivo = 'El motivo es obligatorio.'
  else if (largo(motivo) < L.motivo.min)
    errores.motivo = `El motivo necesita al menos ${L.motivo.min} caracteres.`
  else if (largo(motivo) > L.motivo.max)
    errores.motivo = `El motivo admite hasta ${L.motivo.max} caracteres. Van ${largo(motivo)}.`

  return errores
}

export const sinErrores = (errores) => Object.keys(errores).length === 0
export const contarErrores = (errores) => Object.keys(errores).length
