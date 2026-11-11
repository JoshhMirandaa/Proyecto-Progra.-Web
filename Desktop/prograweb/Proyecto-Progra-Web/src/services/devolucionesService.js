/**
 * Capa de acceso a datos de la HU-5 (devoluciones).
 *
 * La HU-5 cierra los préstamos que entregó la HU-4: registra la devolución, los daños o
 * faltantes, el retraso y la penalidad, y renueva préstamos. Escribe sobre la solicitud solo
 * el estado `devuelta`, la renovación y los campos de la devolución (ver CONTRATO-DATOS.md).
 * La unidad la cambia con el servicio de la HU-2 y la deuda la guarda con el de la HU-1.
 *
 * Segunda entrega: solo este archivo cambia (fetch al servicio REST), con la misma firma.
 */
import { etiquetaCategoria } from '../domain/catalogos.js'
import {
  calcularPenalidad,
  deudaDe,
  diasRetraso,
  evaluarRenovacion,
  validarDevolucion,
  validarRenovacion,
} from '../domain/devoluciones.js'
import { vigenciaDe } from '../domain/prestamos.js'
import {
  cursoPorCodigo,
  duracionDias,
  hoyISO,
  seSolapan,
  sumarDias,
} from '../domain/solicitudes.js'
import { establecerDeuda, listarUsuariosPublicos } from './cuentasService.js'
import { cambiarEstadoUnidad, listarEquiposConUnidades } from './inventarioService.js'
import { listarEnEspera } from './reservasService.js'
import { escribirSolicitudes, leerReservasActivas, leerSolicitudes } from './solicitudesAlmacen.js'

const RETARDO_MS = 140
const esperar = (ms = RETARDO_MS) => new Promise((resolve) => setTimeout(resolve, ms))
const ahora = () => new Date().toISOString()

/** Error con la forma que tendrá la respuesta del servicio en la segunda entrega. */
class ErrorDevolucion extends Error {
  constructor(mensaje, estado = 400, errores = null) {
    super(mensaje)
    this.name = 'ErrorDevolucion'
    this.estado = estado
    this.errores = errores
  }
}

function exigirEncargadoActivo(encargado) {
  if (!encargado?.id || encargado.rol !== 'encargado')
    throw new ErrorDevolucion('Solo el encargado de almacén puede hacer esto.', 403)
  if (encargado.estado !== 'activo')
    throw new ErrorDevolucion('Tu alta de encargado está pendiente de aprobación.', 403)
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
    equipoCategoria: equipo ? etiquetaCategoria(equipo.categoria) : '',
    codigoUnidad: unidad?.codigoInventario ?? null,
    estudianteNombre: estudiante ? `${estudiante.nombres} ${estudiante.apellidos}` : s.estudianteId,
    cursoNombre: curso ? `${curso.codigo} ${curso.nombre}` : s.curso,
    accesoriosEquipo: equipo?.accesorios ?? [],
    penalidadPorDia: Number(equipo?.condicionesPrestamo?.penalidadPorDia) || 0,
  }
}

function buscarPorCodigo(codigo, solicitudes) {
  const limpio = String(codigo ?? '')
    .trim()
    .toUpperCase()
  const indice = solicitudes.findIndex((s) => s.codigoPrestamo === limpio)
  if (indice === -1)
    throw new ErrorDevolucion(`No encontramos el préstamo ${limpio || ''}.`.trim(), 404)
  return indice
}

/** Lo que pasará con otras reservas o préstamos si la unidad va a mantenimiento (mockup 5.2). */
async function efectoMantenimiento(solicitud, equipo, solicitudes) {
  const hoy = hoyISO()
  const reservas = await leerReservasActivas()
  const comprometidas = [
    ...solicitudes.filter(
      (o) =>
        o.id !== solicitud.id &&
        o.unidadId === solicitud.unidadId &&
        o.estado === 'aprobada' &&
        o.fechaFin >= hoy,
    ),
    ...reservas.filter((r) => r.unidadId === solicitud.unidadId && r.fechaFin >= hoy),
  ].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
  const libresHoy = equipo ? equipo.unidades.filter((u) => u.estado === 'disponible').length : 0
  return {
    comprometidas: comprometidas.map((c) => ({ fechaInicio: c.fechaInicio, fechaFin: c.fechaFin })),
    libresHoy,
  }
}

// ----------------------------------------------------------------- consultas

/** Préstamos por devolver (vista 5.1), vencidos primero. */
export async function listarPorDevolver() {
  await esperar()
  const datos = await contexto()
  return datos.solicitudes
    .filter((s) => s.estado === 'en_prestamo')
    .map((s) => ({ ...enriquecer(s, datos), vigencia: vigenciaDe(s.fechaFin) }))
    .sort((a, b) => a.fechaFin.localeCompare(b.fechaFin))
}

/** Vista 5.1: el préstamo buscado por su código, con lo necesario para el formulario. */
export async function obtenerParaDevolucion(codigo) {
  await esperar()
  const datos = await contexto()
  const solicitud = datos.solicitudes[buscarPorCodigo(codigo, datos.solicitudes)]
  if (solicitud.estado === 'devuelta')
    throw new ErrorDevolucion(`El préstamo ${solicitud.codigoPrestamo} ya se devolvió.`, 409)
  if (solicitud.estado !== 'en_prestamo')
    throw new ErrorDevolucion(`El préstamo ${solicitud.codigoPrestamo} no está entregado.`, 409)
  const equipo = datos.equipos.find((e) => e.id === solicitud.equipoId)
  return {
    solicitud: enriquecer(solicitud, datos),
    accesoriosEntregados: solicitud.accesoriosEntregados ?? equipo?.accesorios ?? [],
    efecto: await efectoMantenimiento(solicitud, equipo, datos.solicitudes),
  }
}

// ------------------------------------------------------------------ devolución

export async function registrarDevolucion(codigo, datosDevolucion, encargado) {
  await esperar()
  exigirEncargadoActivo(encargado)
  const datos = await contexto()
  const indice = buscarPorCodigo(codigo, datos.solicitudes)
  const solicitud = datos.solicitudes[indice]
  if (solicitud.estado !== 'en_prestamo')
    throw new ErrorDevolucion('Solo se registra la devolución de un préstamo entregado.', 409)

  const fechaEntrega = solicitud.fechaEntregaReal
    ? hoyISO(new Date(solicitud.fechaEntregaReal))
    : solicitud.fechaInicio
  const errores = validarDevolucion(datosDevolucion, { fechaEntrega })
  if (Object.keys(errores).length)
    throw new ErrorDevolucion(Object.values(errores)[0], 422, errores)

  const equipo = datos.equipos.find((e) => e.id === solicitud.equipoId)
  const { fechaRetorno, estadoRetorno } = datosDevolucion
  const dias = diasRetraso(solicitud.fechaFin, fechaRetorno)
  const monto = calcularPenalidad(dias, equipo?.condicionesPrestamo?.penalidadPorDia)
  const conNovedad = estadoRetorno !== 'sin_novedades'
  const aMantenimiento = conNovedad && Boolean(datosDevolucion.derivarMantenimiento)

  // Primero el inventario (HU-2): si la unidad no puede cambiar, no se cierra el préstamo.
  if (solicitud.unidadId)
    await cambiarEstadoUnidad(solicitud.unidadId, {
      estadoNuevo: aMantenimiento ? 'mantenimiento' : 'disponible',
      motivo: aMantenimiento
        ? `Devolución de ${solicitud.codigoPrestamo} con ${estadoRetorno === 'con_danos' ? 'daños' : 'faltantes'}: ${String(datosDevolucion.descripcionDano || 'accesorios faltantes').trim()}`
        : `Devolución del préstamo ${solicitud.codigoPrestamo}.`,
      usuarioId: encargado.id,
    })

  const accesorios = (datosDevolucion.accesorios ?? []).map((a) => ({
    nombre: a.nombre,
    devuelto: Boolean(a.devuelto),
  }))
  datos.solicitudes[indice] = {
    ...solicitud,
    estado: 'devuelta',
    fechaDevolucionReal: fechaRetorno,
    estadoRetorno,
    accesoriosDevueltos: accesorios.filter((a) => a.devuelto).map((a) => a.nombre),
    accesoriosFaltantes: conNovedad ? [...(datosDevolucion.faltantes ?? [])] : [],
    descripcionDano: conNovedad ? String(datosDevolucion.descripcionDano ?? '').trim() : '',
    fotoDano: conNovedad ? (datosDevolucion.fotoDano ?? null) : null,
    derivadaMantenimiento: aMantenimiento,
    observacionesDevolucion: String(datosDevolucion.observaciones ?? '').trim(),
    diasRetraso: dias,
    penalidad: monto > 0 ? { monto, estado: 'pendiente', calculadaEn: ahora() } : null,
    recibidaPor: encargado.id,
    devueltaEn: ahora(),
  }
  escribirSolicitudes(datos.solicitudes)

  const deuda = deudaDe(datos.solicitudes.filter((s) => s.estudianteId === solicitud.estudianteId))
  await establecerDeuda(solicitud.estudianteId, deuda)

  return {
    codigoPrestamo: solicitud.codigoPrestamo,
    diasRetraso: dias,
    penalidad: monto,
    deuda,
    estadoUnidad: aMantenimiento ? 'mantenimiento' : 'disponible',
    codigoUnidad: equipo?.unidades.find((u) => u.id === solicitud.unidadId)?.codigoInventario ?? '',
  }
}

// ------------------------------------------------------------------ renovación

async function analizarRenovacion(solicitud, datos) {
  const equipo = datos.equipos.find((e) => e.id === solicitud.equipoId)
  const hoy = hoyISO()
  const [espera, reservas] = await Promise.all([
    listarEnEspera().catch(() => []),
    leerReservasActivas(),
  ])
  const enEspera = espera.filter(
    (r) => r.equipoId === solicitud.equipoId && r.fechaFin >= hoy,
  ).length

  // ¿La misma unidad está comprometida en los días siguientes a la devolución pactada?
  const maximos = Number(equipo?.condicionesPrestamo?.duracionMaximaDias) || 0
  const desde = sumarDias(solicitud.fechaFin, 1)
  const hasta = sumarDias(solicitud.fechaFin, maximos)
  const choques = [
    ...datos.solicitudes.filter(
      (o) =>
        o.id !== solicitud.id &&
        o.unidadId === solicitud.unidadId &&
        ['aprobada', 'en_prestamo'].includes(o.estado),
    ),
    ...reservas.filter((r) => r.unidadId === solicitud.unidadId),
  ]
    .filter((o) => seSolapan(desde, hasta, o.fechaInicio, o.fechaFin))
    .map((o) => o.fechaInicio)
    .sort()
  const primerChoque = choques[0] ?? null
  // Días libres entre la devolución pactada y el siguiente compromiso de la unidad.
  const diasLibres = primerChoque
    ? Math.min(maximos, duracionDias(solicitud.fechaFin, primerChoque) - 1)
    : maximos

  const resultado = evaluarRenovacion({
    solicitud,
    equipo,
    enEspera,
    unidadOcupadaHasta: primerChoque && diasLibres < 1 ? primerChoque : null,
    hoy,
  })
  const diasMaximos = Math.min(resultado.diasMaximos, diasLibres)
  return {
    ...resultado,
    diasMaximos,
    nuevaFechaFin: sumarDias(solicitud.fechaFin, diasMaximos),
    enEspera,
  }
}

/** Vista 5.3: si el préstamo se puede renovar y hasta cuándo. */
export async function consultarRenovacion(codigo) {
  await esperar()
  const datos = await contexto()
  const solicitud = datos.solicitudes[buscarPorCodigo(codigo, datos.solicitudes)]
  if (solicitud.estado !== 'en_prestamo')
    throw new ErrorDevolucion('Solo se renueva un préstamo vigente.', 409)
  return {
    solicitud: enriquecer(solicitud, datos),
    ...(await analizarRenovacion(solicitud, datos)),
  }
}

export async function renovarPrestamo(codigo, { dias }, encargado) {
  await esperar()
  exigirEncargadoActivo(encargado)
  const datos = await contexto()
  const indice = buscarPorCodigo(codigo, datos.solicitudes)
  const solicitud = datos.solicitudes[indice]
  if (solicitud.estado !== 'en_prestamo')
    throw new ErrorDevolucion('Solo se renueva un préstamo vigente.', 409)
  const analisis = await analizarRenovacion(solicitud, datos)
  if (!analisis.posible) throw new ErrorDevolucion(analisis.motivo, 409)
  const errores = validarRenovacion({ dias }, analisis)
  if (Object.keys(errores).length) throw new ErrorDevolucion(errores.dias, 422, errores)

  const nuevaFechaFin = sumarDias(solicitud.fechaFin, Number(dias))
  datos.solicitudes[indice] = {
    ...solicitud,
    fechaFin: nuevaFechaFin,
    renovaciones: [
      ...(solicitud.renovaciones ?? []),
      {
        fechaFinAnterior: solicitud.fechaFin,
        fechaFinNueva: nuevaFechaFin,
        dias: Number(dias),
        fecha: ahora(),
        por: encargado.id,
      },
    ],
  }
  escribirSolicitudes(datos.solicitudes)
  return { codigoPrestamo: solicitud.codigoPrestamo, nuevaFechaFin }
}

// ------------------------------------------------------------------- historial

/** Vista 5.4 (y «Mi deuda» del estudiante): préstamos, retrasos acumulados y penalidades. */
export async function obtenerHistorial(estudianteId, usuario) {
  await esperar()
  if (usuario?.rol === 'estudiante' && usuario.id !== estudianteId)
    throw new ErrorDevolucion('Solo puedes ver tu propio historial.', 403)
  if (!['encargado', 'estudiante'].includes(usuario?.rol))
    throw new ErrorDevolucion('Inicia sesión para ver el historial.', 401)
  const datos = await contexto()
  const estudiante = datos.usuarios.find((u) => u.id === estudianteId && u.rol === 'estudiante')
  if (!estudiante) throw new ErrorDevolucion('No encontramos al estudiante.', 404)

  const suyas = datos.solicitudes.filter((s) => s.estudianteId === estudianteId)
  const prestamos = suyas
    .filter((s) => ['en_prestamo', 'devuelta'].includes(s.estado))
    .map((s) => {
      const retraso =
        s.estado === 'devuelta'
          ? (s.diasRetraso ?? diasRetraso(s.fechaFin, s.fechaDevolucionReal ?? s.fechaFin))
          : diasRetraso(s.fechaFin, hoyISO())
      return { ...enriquecer(s, datos), retraso }
    })
    .sort((a, b) =>
      (b.fechaEntregaReal ?? b.fechaInicio).localeCompare(a.fechaEntregaReal ?? a.fechaInicio),
    )

  const deuda = deudaDe(suyas)
  const pendientes = suyas.filter((s) => s.penalidad?.estado === 'pendiente')
  return {
    estudiante,
    prestamos,
    resumen: {
      prestamos: prestamos.length,
      retrasos: prestamos.filter((p) => p.retraso > 0).length,
      diasRetraso: prestamos.reduce((t, p) => t + p.retraso, 0),
      deuda,
      faltantesPorValorizar: suyas.reduce((t, s) => t + (s.accesoriosFaltantes?.length ?? 0), 0),
    },
    detalleDeuda: pendientes.map((s) => ({
      codigoPrestamo: s.codigoPrestamo,
      dias: s.diasRetraso ?? 0,
      monto: s.penalidad.monto,
    })),
  }
}

/** «Registrar pago» (mockup 5.4): las penalidades pendientes quedan pagadas y la deuda en 0. */
export async function registrarPago(estudianteId, encargado) {
  await esperar()
  exigirEncargadoActivo(encargado)
  const solicitudes = leerSolicitudes()
  const pendientes = solicitudes.filter(
    (s) => s.estudianteId === estudianteId && s.penalidad?.estado === 'pendiente',
  )
  if (pendientes.length === 0)
    throw new ErrorDevolucion('El estudiante no tiene penalidades pendientes.', 409)
  const monto = deudaDe(pendientes)
  const cuando = ahora()
  const actualizadas = solicitudes.map((s) =>
    s.estudianteId === estudianteId && s.penalidad?.estado === 'pendiente'
      ? {
          ...s,
          penalidad: {
            ...s.penalidad,
            estado: 'pagada',
            pagadaEn: cuando,
            recibidoPor: encargado.id,
          },
        }
      : s,
  )
  escribirSolicitudes(actualizadas)
  await establecerDeuda(
    estudianteId,
    deudaDe(actualizadas.filter((s) => s.estudianteId === estudianteId)),
  )
  return { monto, penalidades: pendientes.length }
}
