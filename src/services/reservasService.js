/**
 * Acceso a datos de la HU-6.
 *
 * En la primera entrega las reservas se guardan en el almacén local compartido.
 * Equipos y unidades se consultan desde ese almacén, pero esta historia no los modifica.
 */
import semilla from '../data/seed-inventario.json'
import { derivarEquipo } from '../domain/catalogos.js'

const CLAVE_ALMACEN = 'hu2.inventario.v2'
const CLAVE_RESERVA = 'hu6.reservas.v1'
const RETARDO_MS = 120

const clonar = (valor) => JSON.parse(JSON.stringify(valor))
const esperar = () => new Promise((resolve) => setTimeout(resolve, RETARDO_MS))
const ahora = () => new Date().toISOString()
const fechaLocal = (fecha = new Date()) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`

class ErrorReserva extends Error {
  constructor(mensaje, estado = 400) {
    super(mensaje)
    this.name = 'ErrorReserva'
    this.estado = estado
  }
}

function leerAlmacen() {
  const crudo = localStorage.getItem(CLAVE_ALMACEN)
  if (crudo) {
    const almacen = JSON.parse(crudo)
    if (!Array.isArray(almacen.equipos) || !Array.isArray(almacen.unidades))
      throw new ErrorReserva('El almacén local no tiene un inventario válido.', 500)
    return almacen
  }

  const inicial = {
    equipos: clonar(semilla.equipos),
    unidades: clonar(semilla.unidades),
    usuarios: clonar(semilla.usuarios),
    contadoresExternos: clonar(semilla.contadoresExternos),
  }
  localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(inicial))
  return inicial
}

function leerReservas() {
  const crudo = localStorage.getItem(CLAVE_RESERVA)
  if (!crudo) return { reservas: [], solicitudes: [] }
  const datos = JSON.parse(crudo)
  if (!Array.isArray(datos.reservas) || !Array.isArray(datos.solicitudes))
    throw new ErrorReserva('Los datos locales de reservas no tienen un formato válido.', 500)
  return datos
}

function guardarReservas(datos) {
  localStorage.setItem(CLAVE_RESERVA, JSON.stringify(datos))
}

function siguienteId(coleccion, prefijo, ancho = 4) {
  const siguiente =
    coleccion.reduce((maximo, item) => {
      const numero = Number(String(item.id).split('-').at(-1))
      return Number.isFinite(numero) ? Math.max(maximo, numero) : maximo
    }, 0) + 1
  return `${prefijo}-${String(siguiente).padStart(ancho, '0')}`
}

function validarFechaISO(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const fecha = new Date(`${valor}T12:00:00`)
  return !Number.isNaN(fecha.getTime()) && fechaLocal(fecha) === valor
}

function diasInclusivos(inicio, fin) {
  const a = Date.parse(`${inicio}T00:00:00Z`)
  const b = Date.parse(`${fin}T00:00:00Z`)
  return Math.round((b - a) / 86400000) + 1
}

function seSolapan(inicioA, finA, inicioB, finB) {
  return inicioA <= finB && inicioB <= finA
}

function reservasActivas(reservas) {
  return reservas.filter((reserva) => ['confirmada', 'convertida'].includes(reserva.estado))
}

function compararReservas(a, b) {
  return a.creadaEn.localeCompare(b.creadaEn) || a.id.localeCompare(b.id)
}

function unidadLibreEnFechas(unidad, fechas, reservas) {
  if (unidad.estado !== 'disponible') return false
  return !reservasActivas(reservas).some(
    (reserva) =>
      reserva.unidadId === unidad.id &&
      seSolapan(fechas.fechaInicio, fechas.fechaFin, reserva.fechaInicio, reserva.fechaFin),
  )
}

export async function listarEquiposReservables() {
  await esperar()
  const almacen = leerAlmacen()
  return almacen.equipos
    .map((equipo) => {
      const unidades = almacen.unidades.filter((unidad) => unidad.equipoId === equipo.id)
      return { ...derivarEquipo(equipo, unidades), unidades }
    })
    .filter((equipo) => equipo.esPublicable)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export async function listarReservas(usuarioId) {
  await esperar()
  return leerReservas().reservas
    .filter((reserva) => reserva.usuarioId === usuarioId)
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
}

export async function listarReservasOcupacion() {
  await esperar()
  return reservasActivas(leerReservas().reservas)
}

export async function listarListaEspera(usuarioId) {
  await esperar()
  const enEspera = leerReservas().reservas
    .filter((reserva) => reserva.estado === 'en_espera')
    .sort(compararReservas)
  return enEspera
    .filter((reserva) => reserva.usuarioId === usuarioId)
    .map((reserva) => ({
      ...reserva,
      posicion: enEspera.filter(
        (otra) =>
          otra.equipoId === reserva.equipoId &&
          seSolapan(
            otra.fechaInicio,
            otra.fechaFin,
            reserva.fechaInicio,
            reserva.fechaFin,
          ) &&
          compararReservas(otra, reserva) <= 0,
      ).length,
    }))
}

export async function crearReserva(datos) {
  await esperar()
  const { usuarioId, equipoId, fechaInicio, fechaFin, motivo } = datos
  if (!usuarioId) throw new ErrorReserva('Inicia sesión para crear una reserva.', 401)
  if (!equipoId) throw new ErrorReserva('Selecciona un equipo.')
  if (!validarFechaISO(fechaInicio) || !validarFechaISO(fechaFin))
    throw new ErrorReserva('Ingresa un rango de fechas válido.')
  if (fechaInicio <= fechaLocal())
    throw new ErrorReserva('La fecha de inicio debe ser futura.')
  if (fechaFin < fechaInicio)
    throw new ErrorReserva('La fecha de fin debe ser igual o posterior a la fecha de inicio.')
  const textoMotivo = String(motivo ?? '').trim()
  if (textoMotivo.length < 10 || textoMotivo.length > 300)
    throw new ErrorReserva('El motivo debe tener entre 10 y 300 caracteres.')

  const almacen = leerAlmacen()
  const equipo = almacen.equipos.find((item) => item.id === equipoId)
  if (!equipo || equipo.esBorrador)
    throw new ErrorReserva('El equipo ya no está disponible para reservar.', 404)
  const unidades = almacen.unidades.filter((unidad) => unidad.equipoId === equipoId)
  const unidadesAptas = unidades.filter((unidad) =>
    ['disponible', 'prestada'].includes(unidad.estado),
  )
  if (unidadesAptas.length === 0)
    throw new ErrorReserva('Este equipo no tiene unidades disponibles para reservar.')
  const duracion = diasInclusivos(fechaInicio, fechaFin)
  if (duracion > equipo.condicionesPrestamo.duracionMaximaDias)
    throw new ErrorReserva(
      `El rango supera la duración máxima de ${equipo.condicionesPrestamo.duracionMaximaDias} días.`,
    )

  const datosReservas = leerReservas()
  const fechas = { fechaInicio, fechaFin }
  const unidad = unidades.find(
    (candidata) =>
      candidata.estado === 'disponible' &&
      unidadLibreEnFechas(candidata, fechas, datosReservas.reservas),
  )
  const reserva = {
    id: siguienteId(datosReservas.reservas, 'RES'),
    equipoId,
    unidadId: unidad?.id ?? null,
    usuarioId,
    fechaInicio,
    fechaFin,
    motivo: textoMotivo,
    estado: unidad ? 'confirmada' : 'en_espera',
    creadaEn: ahora(),
    actualizadaEn: ahora(),
    solicitudId: null,
  }
  datosReservas.reservas.push(reserva)
  guardarReservas(datosReservas)
  return {
    reserva,
    equipoNombre: equipo.nombre,
    posicion: unidad
      ? null
      : datosReservas.reservas.filter(
          (otra) =>
            otra.estado === 'en_espera' &&
            otra.equipoId === equipoId &&
            seSolapan(otra.fechaInicio, otra.fechaFin, fechaInicio, fechaFin) &&
            compararReservas(otra, reserva) <= 0,
        ).length,
  }
}

export async function cancelarReserva(id, usuarioId) {
  await esperar()
  const datos = leerReservas()
  const reserva = datos.reservas.find((item) => item.id === id && item.usuarioId === usuarioId)
  if (!reserva) throw new ErrorReserva('No encontramos esta reserva.', 404)
  if (!['confirmada', 'en_espera'].includes(reserva.estado))
    throw new ErrorReserva('Esta reserva ya no se puede cancelar.')

  reserva.estado = 'cancelada'
  reserva.actualizadaEn = ahora()
  guardarReservas(datos)
  const promovidas = promoverEspera(reserva.equipoId)
  return { reserva, promovidas }
}

function promoverEspera(equipoId) {
  const almacen = leerAlmacen()
  const datos = leerReservas()
  const unidades = almacen.unidades.filter((unidad) => unidad.equipoId === equipoId)
  const espera = datos.reservas
    .filter((reserva) => reserva.estado === 'en_espera' && reserva.equipoId === equipoId)
    .sort(compararReservas)
  const promovidas = []
  for (const reserva of espera) {
    const unidad = unidades.find(
      (candidata) =>
        candidata.estado === 'disponible' &&
        unidadLibreEnFechas(candidata, reserva, datos.reservas),
    )
    if (!unidad) continue
    reserva.estado = 'confirmada'
    reserva.unidadId = unidad.id
    reserva.actualizadaEn = ahora()
    promovidas.push(reserva.id)
  }
  guardarReservas(datos)
  return promovidas
}

export async function convertirReservasProximas() {
  await esperar()
  const datos = leerReservas()
  const hoy = fechaLocal()
  const limite = new Date()
  limite.setDate(limite.getDate() + 7)
  const hasta = fechaLocal(limite)
  const convertidas = []

  for (const reserva of datos.reservas) {
    if (
      reserva.estado !== 'confirmada' ||
      reserva.fechaInicio < hoy ||
      reserva.fechaInicio > hasta
    )
      continue

    const solicitud = {
      id: siguienteId(datos.solicitudes, 'SOL'),
      reservaId: reserva.id,
      equipoId: reserva.equipoId,
      unidadId: reserva.unidadId,
      usuarioId: reserva.usuarioId,
      fechaInicio: reserva.fechaInicio,
      fechaFin: reserva.fechaFin,
      motivo: reserva.motivo,
      estado: 'pendiente',
      creadaEn: ahora(),
    }
    datos.solicitudes.push(solicitud)
    reserva.estado = 'convertida'
    reserva.solicitudId = solicitud.id
    reserva.actualizadaEn = ahora()
    convertidas.push(solicitud)
  }

  if (convertidas.length) guardarReservas(datos)
  return convertidas
}

export { fechaLocal, seSolapan }
