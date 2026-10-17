/**
 * Capa de acceso a datos de la HU-4 (aprobación y entrega).
 *
 * La HU-4 resuelve las solicitudes que crea la HU-3: las aprueba asignando una unidad, las
 * rechaza con un motivo que ve el estudiante y registra la entrega con su constancia.
 * Escribe la solicitud solo en los estados que le tocan (ver CONTRATO-DATOS.md). Para
 * marcar la unidad como prestada usa el servicio de la HU-2; los usuarios los lee del
 * servicio de la HU-1.
 *
 * Segunda entrega: solo este archivo cambia (fetch al servicio REST), con la misma firma.
 */
import { etiquetaCategoria } from '../domain/catalogos.js'
import {
  HORA_DEVOLUCION,
  antiguedad,
  siguienteCodigoPrestamo,
  textoRechazo,
  validarAprobacion,
  validarEntrega,
  validarRechazo,
  vigenciaDe,
} from '../domain/prestamos.js'
import {
  cursoPorCodigo,
  etiquetaSolicitud,
  formatearFecha,
  hoyISO,
  proximoRangoLibre,
  seSolapan,
  unidadesLibresEnRango,
} from '../domain/solicitudes.js'
import { listarUsuariosPublicos } from './cuentasService.js'
import { cambiarEstadoUnidad, listarEquiposConUnidades } from './inventarioService.js'
import { escribirSolicitudes, leerReservasActivas, leerSolicitudes } from './solicitudesAlmacen.js'

const RETARDO_MS = 140
const esperar = (ms = RETARDO_MS) => new Promise((resolve) => setTimeout(resolve, ms))
const ahora = () => new Date().toISOString()

/** Error con la forma que tendrá la respuesta del servicio en la segunda entrega. */
class ErrorPrestamo extends Error {
  constructor(mensaje, estado = 400, errores = null) {
    super(mensaje)
    this.name = 'ErrorPrestamo'
    this.estado = estado
    this.errores = errores
  }
}

const normalizar = (texto) =>
  String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Solo un encargado activo resuelve solicitudes (un alta pendiente no puede). */
function exigirEncargadoActivo(encargado) {
  if (!encargado?.id || encargado.rol !== 'encargado')
    throw new ErrorPrestamo('Solo el encargado de almacén puede hacer esto.', 403)
  if (encargado.estado !== 'activo')
    throw new ErrorPrestamo(
      'Tu alta de encargado está pendiente de aprobación: todavía no puedes aprobar ni entregar.',
      403,
    )
}

async function contexto() {
  const [equipos, usuarios] = await Promise.all([
    listarEquiposConUnidades(),
    listarUsuariosPublicos(),
  ])
  return { equipos, usuarios, solicitudes: leerSolicitudes() }
}

function enriquecer(s, { equipos, usuarios }) {
  const equipo = equipos.find((e) => e.id === s.equipoId)
  const unidad = equipo?.unidades.find((u) => u.id === s.unidadId)
  const estudiante = usuarios.find((u) => u.id === s.estudianteId)
  const curso = cursoPorCodigo(s.curso)
  return {
    ...s,
    equipoNombre: equipo?.nombre ?? 'Equipo retirado del inventario',
    equipoMarcaModelo: equipo ? `${equipo.marca} · ${equipo.modelo}` : '',
    equipoCategoria: equipo ? etiquetaCategoria(equipo.categoria) : '',
    codigoUnidad: unidad?.codigoInventario ?? null,
    ubicacionUnidad: unidad?.ubicacion ?? null,
    estudianteNombre: estudiante ? `${estudiante.nombres} ${estudiante.apellidos}` : s.estudianteId,
    estudianteDetalle: estudiante?.carrera ? `${estudiante.carrera} · ${estudiante.ciclo}.º` : '',
    estudianteCodigo: estudiante?.codigo ?? '',
    deudaEstudiante: Number(estudiante?.deudaPendiente) || 0,
    cursoNombre: curso ? `${curso.codigo} ${curso.nombre}` : s.curso,
    cursoDocente: curso?.docente ?? '',
    antiguedad: antiguedad(s.creadaEn),
  }
}

function buscar(id, solicitudes) {
  const indice = solicitudes.findIndex((s) => s.id === id)
  if (indice === -1) throw new ErrorPrestamo('No encontramos la solicitud.', 404)
  return indice
}

// -------------------------------------------------------------------- bandeja

/** Vista 4.1: solicitudes con filtros por estado, equipo y fecha, búsqueda y contadores. */
export async function listarBandeja(filtros = {}) {
  await esperar()
  const {
    estado = 'pendiente',
    equipoId = 'todos',
    desde = '',
    hasta = '',
    texto = '',
    pagina = 1,
    porPagina = 8,
  } = filtros
  const datos = await contexto()
  const todas = datos.solicitudes.map((s) => enriquecer(s, datos))

  const contadores = {
    total: todas.length,
    pendiente: todas.filter((s) => s.estado === 'pendiente').length,
    aprobada: todas.filter((s) => s.estado === 'aprobada').length,
    rechazada: todas.filter((s) => s.estado === 'rechazada').length,
    en_prestamo: todas.filter((s) => s.estado === 'en_prestamo').length,
  }

  const consulta = normalizar(texto).trim()
  const resultado = todas
    .filter((s) => estado === 'todos' || s.estado === estado)
    .filter((s) => equipoId === 'todos' || s.equipoId === equipoId)
    .filter((s) =>
      seSolapan(desde || '0000-01-01', hasta || '9999-12-31', s.fechaInicio, s.fechaFin),
    )
    .filter(
      (s) =>
        !consulta ||
        [s.estudianteNombre, s.cursoNombre, s.equipoNombre, s.codigoPrestamo ?? '', s.id].some(
          (v) => normalizar(v).includes(consulta),
        ),
    )
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))

  // Aviso de deuda (5.5): estudiantes de esta bandeja con penalidades pendientes.
  const conDeuda = new Map()
  for (const s of resultado)
    if (s.deudaEstudiante > 0) conDeuda.set(s.estudianteId, s.deudaEstudiante)

  const total = resultado.length
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas)
  const inicio = (paginaSegura - 1) * porPagina

  return {
    solicitudes: resultado.slice(inicio, inicio + porPagina),
    total,
    contadores,
    deuda: { estudiantes: conDeuda.size, monto: [...conDeuda.values()].reduce((a, b) => a + b, 0) },
    equipos: datos.equipos
      .map((e) => ({ id: e.id, nombre: e.nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    pagina: paginaSegura,
    totalPaginas,
    desde: total === 0 ? 0 : inicio + 1,
    hasta: Math.min(inicio + porPagina, total),
  }
}

/** Contadores del menú lateral y de la barra superior del panel. */
export async function obtenerContadores() {
  await esperar(40)
  const hoy = hoyISO()
  const solicitudes = leerSolicitudes()
  const vigentes = solicitudes.filter((s) => s.estado === 'en_prestamo')
  return {
    pendientes: solicitudes.filter((s) => s.estado === 'pendiente').length,
    vigentes: vigentes.length,
    vencidos: vigentes.filter((s) => vigenciaDe(s.fechaFin, hoy).tipo === 'vencido').length,
    vencenHoy: vigentes.filter((s) => vigenciaDe(s.fechaFin, hoy).tipo === 'hoy').length,
  }
}

// ------------------------------------------------------------------ aprobación

/** Vista 4.2: unidades libres en el rango, deuda del solicitante y próximo rango libre. */
export async function obtenerOpcionesAprobacion(id) {
  await esperar()
  const [datos, reservas] = await Promise.all([contexto(), leerReservasActivas()])
  const solicitud = datos.solicitudes[buscar(id, datos.solicitudes)]
  const equipo = datos.equipos.find((e) => e.id === solicitud.equipoId)
  if (!equipo)
    throw new ErrorPrestamo('El equipo de esta solicitud ya no está en el inventario.', 409)

  const opciones = { excluirSolicitudId: solicitud.id }
  const libres = unidadesLibresEnRango(
    equipo,
    solicitud.fechaInicio,
    solicitud.fechaFin,
    datos.solicitudes,
    reservas,
    opciones,
  )
  return {
    solicitud: enriquecer(solicitud, datos),
    unidadesLibres: libres.map((u) => ({
      id: u.id,
      codigoInventario: u.codigoInventario,
      ubicacion: u.ubicacion,
    })),
    proximoRango:
      libres.length === 0
        ? proximoRangoLibre(
            equipo,
            solicitud.fechaInicio,
            solicitud.fechaFin,
            datos.solicitudes,
            reservas,
            opciones,
          )
        : null,
    requiereAutorizacion: Boolean(equipo.condicionesPrestamo?.requiereAutorizacion),
  }
}

export async function aprobarSolicitud(id, datosAprobacion, encargado) {
  await esperar()
  exigirEncargadoActivo(encargado)
  const [datos, reservas] = await Promise.all([contexto(), leerReservasActivas()])
  const indice = buscar(id, datos.solicitudes)
  const solicitud = datos.solicitudes[indice]
  if (solicitud.estado !== 'pendiente')
    throw new ErrorPrestamo(
      `Esta solicitud ya está ${etiquetaSolicitud(solicitud.estado).toLowerCase()}: no se puede aprobar.`,
      409,
    )
  const equipo = datos.equipos.find((e) => e.id === solicitud.equipoId)
  if (!equipo)
    throw new ErrorPrestamo('El equipo de esta solicitud ya no está en el inventario.', 409)

  const errores = validarAprobacion(datosAprobacion, {
    requiereAutorizacion: equipo.condicionesPrestamo?.requiereAutorizacion,
  })
  if (Object.keys(errores).length) throw new ErrorPrestamo(Object.values(errores)[0], 422, errores)

  const libres = unidadesLibresEnRango(
    equipo,
    solicitud.fechaInicio,
    solicitud.fechaFin,
    datos.solicitudes,
    reservas,
    {
      excluirSolicitudId: solicitud.id,
    },
  )
  const unidad = libres.find((u) => u.id === datosAprobacion.unidadId)
  if (!unidad)
    throw new ErrorPrestamo(
      'Esa unidad ya no está libre en todo el rango solicitado. Elige otra o rechaza la solicitud.',
      409,
    )

  datos.solicitudes[indice] = {
    ...solicitud,
    estado: 'aprobada',
    unidadId: unidad.id,
    resueltaEn: ahora(),
    resueltaPor: encargado.id,
  }
  escribirSolicitudes(datos.solicitudes)
  return enriquecer(datos.solicitudes[indice], datos)
}

/** Vista 4.3: el motivo queda guardado y lo ve el estudiante en «Mis solicitudes». */
export async function rechazarSolicitud(id, datosRechazo, encargado) {
  await esperar()
  exigirEncargadoActivo(encargado)
  const errores = validarRechazo(datosRechazo)
  if (Object.keys(errores).length) throw new ErrorPrestamo(Object.values(errores)[0], 422, errores)
  const datos = await contexto()
  const indice = buscar(id, datos.solicitudes)
  const solicitud = datos.solicitudes[indice]
  if (solicitud.estado !== 'pendiente')
    throw new ErrorPrestamo(
      `Esta solicitud ya está ${etiquetaSolicitud(solicitud.estado).toLowerCase()}: no se puede rechazar.`,
      409,
    )
  datos.solicitudes[indice] = {
    ...solicitud,
    estado: 'rechazada',
    motivoRechazo: textoRechazo(datosRechazo),
    resueltaEn: ahora(),
    resueltaPor: encargado.id,
  }
  escribirSolicitudes(datos.solicitudes)
  return enriquecer(datos.solicitudes[indice], datos)
}

// --------------------------------------------------------------------- entrega

/** Vista 4.4: lo necesario para registrar la entrega de una solicitud aprobada. */
export async function obtenerParaEntrega(id) {
  await esperar()
  const datos = await contexto()
  const solicitud = datos.solicitudes[buscar(id, datos.solicitudes)]
  if (solicitud.estado !== 'aprobada')
    throw new ErrorPrestamo(
      solicitud.estado === 'en_prestamo'
        ? `Esta solicitud ya se entregó con el código ${solicitud.codigoPrestamo}.`
        : `Solo se entrega una solicitud aprobada (esta está ${etiquetaSolicitud(solicitud.estado).toLowerCase()}).`,
      409,
    )
  const equipo = datos.equipos.find((e) => e.id === solicitud.equipoId)
  return {
    solicitud: enriquecer(solicitud, datos),
    accesorios: equipo?.accesorios ?? [],
    penalidadPorDia: Number(equipo?.condicionesPrestamo?.penalidadPorDia) || 0,
    codigoPropuesto: siguienteCodigoPrestamo(datos.solicitudes.map((s) => s.codigoPrestamo)),
  }
}

export async function registrarEntrega(id, datosEntrega, encargado) {
  await esperar()
  exigirEncargadoActivo(encargado)
  const datos = await contexto()
  const indice = buscar(id, datos.solicitudes)
  const solicitud = datos.solicitudes[indice]
  if (solicitud.estado !== 'aprobada')
    throw new ErrorPrestamo('Solo se puede entregar una solicitud aprobada.', 409)

  const errores = validarEntrega(datosEntrega, { fechaFin: solicitud.fechaFin })
  if (Object.keys(errores).length) throw new ErrorPrestamo(Object.values(errores)[0], 422, errores)

  const equipo = datos.equipos.find((e) => e.id === solicitud.equipoId)
  const unidad = equipo?.unidades.find((u) => u.id === solicitud.unidadId)
  if (!unidad || unidad.estado !== 'disponible')
    throw new ErrorPrestamo(
      `La unidad asignada${unidad ? ` (${unidad.codigoInventario})` : ''} ya no está disponible en el inventario. Rechaza la solicitud o pide que la reasignen.`,
      409,
    )

  const codigo = siguienteCodigoPrestamo(datos.solicitudes.map((s) => s.codigoPrestamo))
  const accesorios = (datosEntrega.accesorios ?? []).map((a) => ({
    nombre: a.nombre,
    entregado: Boolean(a.entregado),
    nota: String(a.nota ?? '').trim(),
  }))

  // Primero el inventario (HU-2): si la unidad no puede pasar a prestada, no se entrega nada.
  await cambiarEstadoUnidad(unidad.id, {
    estadoNuevo: 'prestada',
    motivo: `Entrega del préstamo ${codigo}.`,
    usuarioId: encargado.id,
    prestamoVigente: codigo,
  })

  datos.solicitudes[indice] = {
    ...solicitud,
    estado: 'en_prestamo',
    codigoPrestamo: codigo,
    fechaEntregaReal: new Date(datosEntrega.fechaEntrega).toISOString(),
    accesoriosEntregados: accesorios.filter((a) => a.entregado).map((a) => a.nombre),
    detalleAccesorios: accesorios,
    observacionesEntrega: datosEntrega.observaciones.trim(),
    entregadaPor: encargado.id,
  }
  escribirSolicitudes(datos.solicitudes)
  return { codigoPrestamo: codigo }
}

/**
 * Vista 4.5: la constancia la consultan las dos partes. El estudiante solo ve las suyas;
 * el encargado, todas.
 */
export async function obtenerConstancia(codigo, usuario) {
  await esperar()
  const datos = await contexto()
  const solicitud = datos.solicitudes.find((s) => s.codigoPrestamo === codigo)
  if (!solicitud) throw new ErrorPrestamo('No encontramos una constancia con ese código.', 404)
  if (usuario?.rol === 'estudiante' && solicitud.estudianteId !== usuario.id)
    throw new ErrorPrestamo('Esta constancia es de otro estudiante.', 403)
  if (!['encargado', 'estudiante'].includes(usuario?.rol))
    throw new ErrorPrestamo('Inicia sesión para ver la constancia.', 401)

  const equipo = datos.equipos.find((e) => e.id === solicitud.equipoId)
  const encargado = datos.usuarios.find((u) => u.id === solicitud.entregadaPor)
  const detalle =
    solicitud.detalleAccesorios ??
    (equipo?.accesorios ?? []).map((nombre) => ({
      nombre,
      entregado: (solicitud.accesoriosEntregados ?? []).includes(nombre),
      nota: '',
    }))
  return {
    ...enriquecer(solicitud, datos),
    equipoNombreCompleto: equipo
      ? `${equipo.nombre} (${equipo.marca} ${equipo.modelo})`
      : solicitud.equipoId,
    detalleAccesorios: detalle,
    penalidadPorDia: Number(equipo?.condicionesPrestamo?.penalidadPorDia) || 0,
    encargadoNombre: encargado ? `${encargado.nombres} ${encargado.apellidos}` : '',
    almacen: encargado?.almacenAsignado ?? 'Almacén H-102',
    devolucionTexto: `${formatearFecha(solicitud.fechaFin)} · ${HORA_DEVOLUCION}`,
  }
}

// ------------------------------------------------------------------- vigentes

/** Vista 4.6: préstamos entregados que todavía no se devuelven. */
export async function listarVigentes() {
  await esperar()
  const datos = await contexto()
  return datos.solicitudes
    .filter((s) => s.estado === 'en_prestamo')
    .map((s) => ({ ...enriquecer(s, datos), vigencia: vigenciaDe(s.fechaFin) }))
    .sort((a, b) => a.fechaFin.localeCompare(b.fechaFin))
}
