/**
 * Capa de acceso a datos de la HU-3 (catálogo y solicitud).
 *
 * La HU-3 es dueña de una sola entidad: la solicitud de préstamo. Equipos y unidades
 * son de la HU-2 y las reservas de la HU-6: aquí solo se leen, a través de los servicios
 * de esas historias, nunca escribiendo sobre sus datos.
 *
 * Primera entrega: las solicitudes parten de `seed-solicitudes.json` y los cambios se
 * guardan en localStorage. Segunda entrega: solo este archivo cambia; cada función pasa a
 * hacer `fetch` al servicio REST con la misma firma y el mismo resultado.
 */
import { etiquetaCategoria, formatearSoles } from '../domain/catalogos.js'
import {
  ESTADOS_ABIERTOS,
  ESTADOS_QUE_OCUPAN,
  cursoPorCodigo,
  duracionDias,
  etiquetaSolicitud,
  formatearFecha,
  formatearFechaCorta,
  hoyISO,
  proximoRangoLibre,
  puedeRetirarse,
  seSolapan,
  sumarDias,
  unidadesLibresEnRango,
  validarSolicitud,
} from '../domain/solicitudes.js'
import { listarEquiposConUnidades } from './inventarioService.js'
import {
  escribirSolicitudes,
  leerReservasActivas,
  leerSolicitudes,
  restablecerSolicitudesSemilla,
  siguienteIdSolicitud,
} from './solicitudesAlmacen.js'

const RETARDO_MS = 140 // simula la latencia de red para ver los estados de carga

const esperar = (ms = RETARDO_MS) => new Promise((resolve) => setTimeout(resolve, ms))
const ahora = () => new Date().toISOString()

/** Error con la forma que tendrá la respuesta del servicio en la segunda entrega. */
class ErrorSolicitud extends Error {
  constructor(mensaje, estado = 400, errores = null) {
    super(mensaje)
    this.name = 'ErrorSolicitud'
    this.estado = estado
    this.errores = errores
  }
}

const normalizar = (texto) =>
  String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

// ------------------------------------------------------- disponibilidad

/** Cuántas unidades quedan libres (la regla está en domain/solicitudes.js). */
const calcularLibres = (equipo, inicio, fin, solicitudes, reservas) =>
  unidadesLibresEnRango(equipo, inicio, fin, solicitudes, reservas).length

const buscarProximoRango = proximoRangoLibre

function mensajeSinUnidades(inicio, fin, proximo) {
  const base = `Fechas no disponibles: no hay unidades libres entre el ${formatearFechaCorta(inicio)} y el ${formatearFechaCorta(fin)}.`
  return proximo
    ? `${base} Próximo rango libre del ${formatearFechaCorta(proximo.inicio)} al ${formatearFecha(proximo.fin)}.`
    : `${base} Por ahora no hay unidades que puedan prestarse; puedes reservarlo para más adelante.`
}

// ------------------------------------------------------------------ catálogo

function coincideTexto(equipo, consulta) {
  if (!consulta) return true
  return (
    normalizar(equipo.nombre).includes(consulta) ||
    normalizar(equipo.marca).includes(consulta) ||
    normalizar(equipo.modelo).includes(consulta) ||
    normalizar(etiquetaCategoria(equipo.categoria)).includes(consulta) ||
    equipo.unidades.some((u) => normalizar(u.codigoInventario).includes(consulta))
  )
}

const COMPARADORES = {
  disponibles: (a, b) =>
    b.unidadesDisponibles - a.unidadesDisponibles || a.nombre.localeCompare(b.nombre, 'es'),
  'nombre-asc': (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
  'nombre-desc': (a, b) => b.nombre.localeCompare(a.nombre, 'es'),
  categoria: (a, b) =>
    etiquetaCategoria(a.categoria).localeCompare(etiquetaCategoria(b.categoria), 'es') ||
    a.nombre.localeCompare(b.nombre, 'es'),
}

/** Vista 3.1: solo equipos con al menos una unidad activa (no dada de baja) y publicados. */
export async function listarCatalogo(filtros = {}) {
  await esperar()
  const {
    categorias = [],
    disponibilidad = 'todas',
    duracion = 'todas',
    texto = '',
    orden = 'disponibles',
    pagina = 1,
    porPagina = 8,
  } = filtros

  const publicados = await listarEquiposConUnidades({ soloPublicados: true })
  const consulta = normalizar(texto).trim()
  const limiteDias = duracion === 'todas' ? null : Number(duracion)

  // Primero los filtros que no son de categoría, para contar cuántos hay por categoría.
  const base = publicados.filter(
    (e) =>
      coincideTexto(e, consulta) &&
      (disponibilidad !== 'libres' || e.unidadesDisponibles > 0) &&
      (limiteDias === null || e.condicionesPrestamo.duracionMaximaDias <= limiteDias),
  )

  const conteoCategorias = {}
  for (const e of base) conteoCategorias[e.categoria] = (conteoCategorias[e.categoria] ?? 0) + 1

  const resultado = base
    .filter((e) => categorias.length === 0 || categorias.includes(e.categoria))
    .sort(COMPARADORES[orden] ?? COMPARADORES.disponibles)

  const total = resultado.length
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas)
  const desde = (paginaSegura - 1) * porPagina

  return {
    equipos: resultado.slice(desde, desde + porPagina).map(({ unidades, ...equipo }) => ({
      ...equipo,
      fotografia: equipo.fotografias?.[0] ?? null,
      totalUnidades: unidades.length,
    })),
    total,
    totalPublicados: publicados.length,
    conteoCategorias,
    pagina: paginaSegura,
    totalPaginas,
    porPagina,
    desde: total === 0 ? 0 : desde + 1,
    hasta: Math.min(desde + porPagina, total),
  }
}

/** Vista 3.2: ficha del equipo para el estudiante, con su disponibilidad. */
export async function obtenerDetalleEquipo(id) {
  await esperar()
  const equipos = await listarEquiposConUnidades()
  const equipo = equipos.find((e) => e.id === id)
  if (!equipo) throw new ErrorSolicitud('No encontramos el equipo que buscas.', 404)
  if (!equipo.esPublicable)
    throw new ErrorSolicitud('Este equipo todavía no está publicado en el catálogo.', 404)

  const hoy = hoyISO()
  const solicitudes = leerSolicitudes()
  let proximaLiberacion = null
  if (equipo.unidadesDisponibles === 0) {
    const fines = solicitudes
      .filter(
        (s) => s.equipoId === id && ESTADOS_QUE_OCUPAN.includes(s.estado) && s.fechaFin >= hoy,
      )
      .map((s) => s.fechaFin)
      .sort()
    if (fines.length) proximaLiberacion = sumarDias(fines[0], 1)
  }

  return {
    equipo: {
      ...equipo,
      unidades: equipo.unidades.filter((u) => u.estado !== 'baja'),
    },
    proximaLiberacion,
  }
}

/** Unidades libres para un rango (vista 3.3, mientras el estudiante elige las fechas). */
export async function consultarDisponibilidad(equipoId, inicio, fin) {
  await esperar(80)
  const [equipos, reservas] = await Promise.all([listarEquiposConUnidades(), leerReservasActivas()])
  const equipo = equipos.find((e) => e.id === equipoId)
  if (!equipo) throw new ErrorSolicitud('No encontramos el equipo que buscas.', 404)
  if (!inicio || !fin || duracionDias(inicio, fin) === null || fin < inicio)
    return { libres: null, proximoRango: null, mensaje: null }

  const solicitudes = leerSolicitudes()
  const libres = calcularLibres(equipo, inicio, fin, solicitudes, reservas)
  const proximoRango =
    libres === 0 ? buscarProximoRango(equipo, inicio, fin, solicitudes, reservas) : null
  return {
    libres,
    proximoRango,
    mensaje: libres === 0 ? mensajeSinUnidades(inicio, fin, proximoRango) : null,
  }
}

// --------------------------------------------------------------- solicitudes

function enriquecer(solicitud, equipos) {
  const equipo = equipos.find((e) => e.id === solicitud.equipoId)
  const unidad = equipo?.unidades.find((u) => u.id === solicitud.unidadId)
  const curso = cursoPorCodigo(solicitud.curso)
  return {
    ...solicitud,
    equipoNombre: equipo?.nombre ?? 'Equipo retirado del inventario',
    equipoMarcaModelo: equipo ? `${equipo.marca} · ${equipo.modelo}` : '',
    fotografia: equipo?.fotografias?.[0] ?? null,
    codigoUnidad: unidad?.codigoInventario ?? null,
    cursoNombre: curso ? `${curso.codigo} ${curso.nombre}` : solicitud.curso,
    cursoDocente: curso?.docente ?? '',
    duracion: duracionDias(solicitud.fechaInicio, solicitud.fechaFin),
    retirable: puedeRetirarse(solicitud),
  }
}

const PRIORIDAD = { pendiente: 0, aprobada: 1, en_prestamo: 2 }

/** Vista 3.4: solicitudes del estudiante en sesión. */
export async function listarMisSolicitudes(estudianteId) {
  await esperar()
  if (!estudianteId) return []
  const equipos = await listarEquiposConUnidades()
  return leerSolicitudes()
    .filter((s) => s.estudianteId === estudianteId)
    .sort(
      (a, b) =>
        (PRIORIDAD[a.estado] ?? 3) - (PRIORIDAD[b.estado] ?? 3) ||
        b.fechaInicio.localeCompare(a.fechaInicio),
    )
    .map((s) => enriquecer(s, equipos))
}

/**
 * Registra una solicitud (vista 3.3). Repite todas las validaciones del formulario:
 * en la segunda entrega este código corre en el servidor, que no confía en el cliente.
 */
export async function crearSolicitud(datos, estudiante) {
  await esperar()
  if (!estudiante?.id || estudiante.rol !== 'estudiante')
    throw new ErrorSolicitud(
      'Solo un estudiante con sesión iniciada puede solicitar préstamos.',
      403,
    )
  if (Number(estudiante.deudaPendiente) > 0)
    throw new ErrorSolicitud(
      `Tienes una deuda pendiente de ${formatearSoles(estudiante.deudaPendiente)}. Regularízala en el almacén para volver a solicitar.`,
      403,
    )

  const [equipos, reservas] = await Promise.all([listarEquiposConUnidades(), leerReservasActivas()])
  const equipo = equipos.find((e) => e.id === datos.equipoId)
  if (!equipo || !equipo.esPublicable)
    throw new ErrorSolicitud('Este equipo no está disponible en el catálogo.', 404)

  const errores = validarSolicitud(datos, {
    duracionMaxima: equipo.condicionesPrestamo.duracionMaximaDias,
  })
  const campos = Object.keys(errores)
  if (campos.length) throw new ErrorSolicitud(errores[campos[0]], 422, errores)

  const solicitudes = leerSolicitudes()
  const repetida = solicitudes.find(
    (s) =>
      s.estudianteId === estudiante.id &&
      s.equipoId === equipo.id &&
      ESTADOS_ABIERTOS.includes(s.estado) &&
      seSolapan(datos.fechaInicio, datos.fechaFin, s.fechaInicio, s.fechaFin),
  )
  if (repetida)
    throw new ErrorSolicitud(
      `Ya tienes una solicitud ${etiquetaSolicitud(repetida.estado).toLowerCase()} de este equipo del ${formatearFecha(repetida.fechaInicio)} al ${formatearFecha(repetida.fechaFin)}.`,
      409,
    )

  const libres = calcularLibres(equipo, datos.fechaInicio, datos.fechaFin, solicitudes, reservas)
  if (libres === 0) {
    const proximo = buscarProximoRango(
      equipo,
      datos.fechaInicio,
      datos.fechaFin,
      solicitudes,
      reservas,
    )
    throw new ErrorSolicitud(mensajeSinUnidades(datos.fechaInicio, datos.fechaFin, proximo), 409)
  }

  const nueva = {
    id: siguienteIdSolicitud(solicitudes),
    estudianteId: estudiante.id,
    equipoId: equipo.id,
    unidadId: null, // la asigna el encargado al aprobar (HU-4)
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
    curso: datos.curso,
    motivo: datos.motivo.trim(),
    estado: 'pendiente',
    motivoRechazo: '',
    codigoPrestamo: null,
    creadaEn: ahora(),
    resueltaEn: null,
  }
  solicitudes.push(nueva)
  escribirSolicitudes(solicitudes)
  return enriquecer(nueva, equipos)
}

/** Retira una solicitud mientras el encargado no la haya resuelto. */
export async function retirarSolicitud(id, estudianteId) {
  await esperar()
  const solicitudes = leerSolicitudes()
  const indice = solicitudes.findIndex((s) => s.id === id)
  if (indice === -1) throw new ErrorSolicitud('No encontramos la solicitud.', 404)

  const solicitud = solicitudes[indice]
  if (solicitud.estudianteId !== estudianteId)
    throw new ErrorSolicitud('Solo puedes retirar tus propias solicitudes.', 403)
  if (!puedeRetirarse(solicitud))
    throw new ErrorSolicitud(
      `No pudimos retirar la solicitud porque ya fue ${etiquetaSolicitud(solicitud.estado).toLowerCase()}. Contacta al encargado del almacén.`,
      409,
    )

  solicitudes[indice] = { ...solicitud, estado: 'retirada', resueltaEn: ahora() }
  escribirSolicitudes(solicitudes)
  return solicitudes[indice]
}

/** Vuelve a cargar el archivo semilla. Útil para demostrar la data de prueba. */
export async function restablecerSolicitudes() {
  await esperar()
  return restablecerSolicitudesSemilla().length
}
