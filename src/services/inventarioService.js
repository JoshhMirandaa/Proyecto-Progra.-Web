/**
 * Capa de acceso a datos de la HU-2.
 *
 * Primera entrega: la data vive íntegramente en el front. El origen es el archivo
 * semilla `seed-inventario.json` y los cambios se conservan en localStorage para que
 * sobrevivan a un refresco de la página.
 *
 * Segunda entrega: solo este archivo cambia. Cada función pasa a hacer `fetch` contra
 * el servicio REST; la firma y lo que devuelve se mantienen, así que ni el Context ni
 * los componentes se tocan. Por eso todas las funciones son asíncronas desde ahora.
 */
import semilla from '../data/seed-inventario.json'
import { derivarEquipo, esTransicionValida } from '../domain/catalogos.js'

const CLAVE_ALMACEN = 'hu2.inventario.v2'
const RETARDO_MS = 160 // simula la latencia de red para ver los estados de carga

const clonar = (valor) => JSON.parse(JSON.stringify(valor))
const esperar = (ms = RETARDO_MS) => new Promise((resolve) => setTimeout(resolve, ms))
const ahora = () => new Date().toISOString()

/** Error con la forma que tendrá la respuesta del servicio en la segunda entrega. */
class ErrorServicio extends Error {
  constructor(mensaje, estado = 400) {
    super(mensaje)
    this.name = 'ErrorServicio'
    this.estado = estado
  }
}

// ---------------------------------------------------------------- almacén local

function leerAlmacen() {
  try {
    const crudo = localStorage.getItem(CLAVE_ALMACEN)
    if (crudo) return JSON.parse(crudo)
  } catch {
    // localStorage no disponible o con contenido inválido: se usa la semilla
  }
  const inicial = {
    equipos: clonar(semilla.equipos),
    unidades: clonar(semilla.unidades),
    usuarios: clonar(semilla.usuarios),
    contadoresExternos: clonar(semilla.contadoresExternos),
  }
  escribirAlmacen(inicial)
  return inicial
}

function escribirAlmacen(datos) {
  try {
    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(datos))
  } catch {
    // en modo privado el guardado puede fallar; la sesión sigue funcionando en memoria
  }
}

function siguienteId(coleccion, prefijo, ancho) {
  const numeros = coleccion
    .map((item) => Number(String(item.id).split('-')[1]))
    .filter((n) => Number.isFinite(n))
  const siguiente = (numeros.length ? Math.max(...numeros) : 0) + 1
  return `${prefijo}-${String(siguiente).padStart(ancho, '0')}`
}

const normalizar = (texto) =>
  String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

function limpiarCondiciones(condiciones) {
  return {
    duracionMaximaDias: Number(condiciones.duracionMaximaDias),
    requiereAutorizacion: Boolean(condiciones.requiereAutorizacion),
    admiteRenovacion: Boolean(condiciones.admiteRenovacion),
    penalidadPorDia: Number(condiciones.penalidadPorDia),
  }
}

function limpiarEquipo(datos) {
  return {
    nombre: datos.nombre.trim(),
    marca: datos.marca.trim(),
    modelo: datos.modelo.trim(),
    categoria: datos.categoria,
    descripcion: (datos.descripcion ?? '').trim(),
    fotografias: (datos.fotografias ?? []).map((f) => ({
      url: f.url,
      alt: (f.alt ?? '').trim(),
    })),
    accesorios: (datos.accesorios ?? []).map((a) => a.trim()).filter(Boolean),
    condicionesPrestamo: limpiarCondiciones(datos.condicionesPrestamo),
  }
}

// ------------------------------------------------------------------- consultas

export async function listarEquipos(filtros = {}) {
  await esperar()
  const { equipos, unidades } = leerAlmacen()
  const {
    categoria = 'todas',
    estado = 'todos',
    texto = '',
    orden = 'nombre-asc',
    pagina = 1,
    porPagina = 8,
  } = filtros

  let resultado = equipos.map((equipo) =>
    derivarEquipo(equipo, unidades.filter((u) => u.equipoId === equipo.id)),
  )

  if (categoria !== 'todas') resultado = resultado.filter((e) => e.categoria === categoria)
  if (estado !== 'todos') resultado = resultado.filter((e) => e.unidadesPorEstado[estado] > 0)

  const consulta = normalizar(texto).trim()
  if (consulta) {
    const equiposConCodigo = new Set(
      unidades
        .filter((u) => normalizar(u.codigoInventario).includes(consulta))
        .map((u) => u.equipoId),
    )
    resultado = resultado.filter(
      (e) =>
        normalizar(e.nombre).includes(consulta) ||
        normalizar(e.marca).includes(consulta) ||
        normalizar(e.modelo).includes(consulta) ||
        equiposConCodigo.has(e.id),
    )
  }

  const comparadores = {
    'nombre-asc': (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
    'nombre-desc': (a, b) => b.nombre.localeCompare(a.nombre, 'es'),
    'categoria-asc': (a, b) =>
      a.categoria.localeCompare(b.categoria, 'es') || a.nombre.localeCompare(b.nombre, 'es'),
    'disponibles-desc': (a, b) =>
      b.unidadesDisponibles - a.unidadesDisponibles || a.nombre.localeCompare(b.nombre, 'es'),
    'disponibles-asc': (a, b) =>
      a.unidadesDisponibles - b.unidadesDisponibles || a.nombre.localeCompare(b.nombre, 'es'),
  }
  resultado.sort(comparadores[orden] ?? comparadores['nombre-asc'])

  const total = resultado.length
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas)
  const desde = (paginaSegura - 1) * porPagina

  return {
    equipos: resultado.slice(desde, desde + porPagina),
    total,
    totalEquipos: equipos.length,
    pagina: paginaSegura,
    totalPaginas,
    porPagina,
    desde: total === 0 ? 0 : desde + 1,
    hasta: Math.min(desde + porPagina, total),
  }
}

export async function obtenerResumenInventario() {
  await esperar(50)
  const { equipos, unidades, contadoresExternos } = leerAlmacen()
  return {
    equipos: equipos.length,
    unidades: unidades.length,
    disponibles: unidades.filter((u) => u.estado === 'disponible').length,
    prestadas: unidades.filter((u) => u.estado === 'prestada').length,
    mantenimiento: unidades.filter((u) => u.estado === 'mantenimiento').length,
    baja: unidades.filter((u) => u.estado === 'baja').length,
    externos: contadoresExternos,
  }
}

export async function obtenerEquipo(id) {
  await esperar()
  const { equipos, unidades } = leerAlmacen()
  const equipo = equipos.find((e) => e.id === id)
  if (!equipo) throw new ErrorServicio('No encontramos el equipo que buscas.', 404)
  const suyas = unidades
    .filter((u) => u.equipoId === id)
    .sort((a, b) => a.codigoInventario.localeCompare(b.codigoInventario, 'es'))
  return { equipo: derivarEquipo(equipo, suyas), unidades: suyas }
}

/** Ficha pública: solo equipos publicables, y sin los datos internos de la unidad. */
export async function obtenerFichaPublica(id) {
  await esperar()
  const { equipos, unidades } = leerAlmacen()
  const base = equipos.find((e) => e.id === id)
  if (!base) throw new ErrorServicio('No encontramos el equipo que buscas.', 404)

  const suyas = unidades.filter((u) => u.equipoId === id)
  const equipo = derivarEquipo(base, suyas)
  if (!equipo.esPublicable)
    throw new ErrorServicio('Este equipo todavía no está publicado en el catálogo.', 404)

  return {
    equipo,
    unidades: suyas
      .filter((u) => u.estado !== 'baja')
      .map((u) => ({ codigoInventario: u.codigoInventario, estado: u.estado }))
      .sort((a, b) => a.codigoInventario.localeCompare(b.codigoInventario, 'es')),
  }
}

/** Datos mínimos para validar que marca + modelo no se repitan. */
export async function listarClavesEquipos() {
  await esperar(40)
  return leerAlmacen().equipos.map((e) => ({ id: e.id, marca: e.marca, modelo: e.modelo }))
}

export async function listarCodigosOcupados() {
  await esperar(40)
  return leerAlmacen().unidades.map((u) => u.codigoInventario)
}

// -------------------------------------------------------------- escritura: equipo

export async function crearEquipo(datos, { esBorrador = false } = {}) {
  await esperar()
  const almacen = leerAlmacen()
  const limpio = limpiarEquipo(datos)

  const repetido = almacen.equipos.some(
    (e) =>
      e.marca.toLowerCase() === limpio.marca.toLowerCase() &&
      e.modelo.toLowerCase() === limpio.modelo.toLowerCase(),
  )
  if (repetido) throw new ErrorServicio('Ya existe un equipo con esta marca y modelo.', 409)

  const equipo = {
    id: siguienteId(almacen.equipos, 'EQ', 3),
    ...limpio,
    esBorrador,
    creadoEn: ahora(),
    actualizadoEn: ahora(),
  }
  almacen.equipos.push(equipo)
  escribirAlmacen(almacen)
  return derivarEquipo(equipo, [])
}

export async function actualizarEquipo(id, datos, { esBorrador } = {}) {
  await esperar()
  const almacen = leerAlmacen()
  const indice = almacen.equipos.findIndex((e) => e.id === id)
  if (indice === -1) throw new ErrorServicio('No encontramos el equipo que buscas.', 404)

  const limpio = limpiarEquipo(datos)
  const repetido = almacen.equipos.some(
    (e) =>
      e.id !== id &&
      e.marca.toLowerCase() === limpio.marca.toLowerCase() &&
      e.modelo.toLowerCase() === limpio.modelo.toLowerCase(),
  )
  if (repetido) throw new ErrorServicio('Ya existe un equipo con esta marca y modelo.', 409)

  const actualizado = {
    ...almacen.equipos[indice],
    ...limpio,
    esBorrador: esBorrador ?? almacen.equipos[indice].esBorrador,
    actualizadoEn: ahora(),
  }
  almacen.equipos[indice] = actualizado
  escribirAlmacen(almacen)
  return derivarEquipo(
    actualizado,
    almacen.unidades.filter((u) => u.equipoId === id),
  )
}

/** Guarda solo la pestaña de condiciones del préstamo (vista 2.5). */
export async function guardarCondiciones(id, condiciones) {
  await esperar()
  const almacen = leerAlmacen()
  const indice = almacen.equipos.findIndex((e) => e.id === id)
  if (indice === -1) throw new ErrorServicio('No encontramos el equipo que buscas.', 404)

  almacen.equipos[indice] = {
    ...almacen.equipos[indice],
    condicionesPrestamo: limpiarCondiciones(condiciones),
    actualizadoEn: ahora(),
  }
  escribirAlmacen(almacen)
  return almacen.equipos[indice]
}

export async function eliminarEquipo(id) {
  await esperar()
  const almacen = leerAlmacen()
  const equipo = almacen.equipos.find((e) => e.id === id)
  if (!equipo) throw new ErrorServicio('No encontramos el equipo que buscas.', 404)

  const suyas = almacen.unidades.filter((u) => u.equipoId === id)
  const prestadas = suyas.filter((u) => u.estado === 'prestada')
  if (prestadas.length > 0) {
    throw new ErrorServicio(
      `No se puede eliminar: ${prestadas.length} ${prestadas.length === 1 ? 'unidad está prestada' : 'unidades están prestadas'}. Registra primero la devolución.`,
      409,
    )
  }

  almacen.equipos = almacen.equipos.filter((e) => e.id !== id)
  almacen.unidades = almacen.unidades.filter((u) => u.equipoId !== id)
  escribirAlmacen(almacen)
  return { id, unidadesEliminadas: suyas.length }
}

// ------------------------------------------------------------- escritura: unidad

export async function crearUnidad(equipoId, datos) {
  await esperar()
  const almacen = leerAlmacen()
  if (!almacen.equipos.some((e) => e.id === equipoId))
    throw new ErrorServicio('No encontramos el equipo que buscas.', 404)

  const codigo = datos.codigoInventario.trim().toUpperCase()
  if (almacen.unidades.some((u) => u.codigoInventario === codigo))
    throw new ErrorServicio(`El código ${codigo} ya está registrado en el almacén.`, 409)

  const unidad = {
    id: siguienteId(almacen.unidades, 'UN', 4),
    equipoId,
    codigoInventario: codigo,
    ubicacion: datos.ubicacion,
    observaciones: (datos.observaciones ?? '').trim(),
    estado: 'disponible',
    prestamoVigente: null,
    historialEstados: [
      {
        de: null,
        a: 'disponible',
        motivo: 'Alta de la unidad en el inventario.',
        fecha: ahora(),
        usuarioId: datos.usuarioId ?? 'US-101',
      },
    ],
  }
  almacen.unidades.push(unidad)
  escribirAlmacen(almacen)
  return unidad
}

export async function actualizarUnidad(id, datos) {
  await esperar()
  const almacen = leerAlmacen()
  const indice = almacen.unidades.findIndex((u) => u.id === id)
  if (indice === -1) throw new ErrorServicio('No encontramos la unidad que buscas.', 404)

  const codigo = datos.codigoInventario.trim().toUpperCase()
  if (almacen.unidades.some((u) => u.codigoInventario === codigo && u.id !== id))
    throw new ErrorServicio(`El código ${codigo} ya está registrado en el almacén.`, 409)

  almacen.unidades[indice] = {
    ...almacen.unidades[indice],
    codigoInventario: codigo,
    ubicacion: datos.ubicacion,
    observaciones: (datos.observaciones ?? '').trim(),
  }
  escribirAlmacen(almacen)
  return almacen.unidades[indice]
}

export async function eliminarUnidad(id) {
  await esperar()
  const almacen = leerAlmacen()
  const unidad = almacen.unidades.find((u) => u.id === id)
  if (!unidad) throw new ErrorServicio('No encontramos la unidad que buscas.', 404)
  if (unidad.estado === 'prestada')
    throw new ErrorServicio(
      'No se puede eliminar una unidad prestada. Registra primero la devolución.',
      409,
    )

  almacen.unidades = almacen.unidades.filter((u) => u.id !== id)
  escribirAlmacen(almacen)
  return { id, codigoInventario: unidad.codigoInventario }
}

export async function cambiarEstadoUnidad(id, { estadoNuevo, motivo, usuarioId }) {
  await esperar()
  const almacen = leerAlmacen()
  const indice = almacen.unidades.findIndex((u) => u.id === id)
  if (indice === -1) throw new ErrorServicio('No encontramos la unidad que buscas.', 404)

  const unidad = almacen.unidades[indice]
  if (!esTransicionValida(unidad.estado, estadoNuevo, { manuales: false }))
    throw new ErrorServicio(`No se admite pasar de "${unidad.estado}" a "${estadoNuevo}".`, 422)

  almacen.unidades[indice] = {
    ...unidad,
    estado: estadoNuevo,
    // al salir de "prestada" el préstamo deja de estar vigente para el inventario
    prestamoVigente: estadoNuevo === 'prestada' ? unidad.prestamoVigente : null,
    historialEstados: [
      ...unidad.historialEstados,
      {
        de: unidad.estado,
        a: estadoNuevo,
        motivo: motivo.trim(),
        fecha: ahora(),
        usuarioId: usuarioId ?? 'US-101',
      },
    ],
  }

  const iEquipo = almacen.equipos.findIndex((e) => e.id === unidad.equipoId)
  if (iEquipo !== -1) almacen.equipos[iEquipo].actualizadoEn = ahora()

  escribirAlmacen(almacen)
  return almacen.unidades[indice]
}

// ----------------------------------------------------------------- mantenimiento

/** Vuelve a cargar el archivo semilla. Útil para demostrar la data de prueba. */
export async function restablecerSemilla() {
  await esperar()
  const inicial = {
    equipos: clonar(semilla.equipos),
    unidades: clonar(semilla.unidades),
    usuarios: clonar(semilla.usuarios),
    contadoresExternos: clonar(semilla.contadoresExternos),
  }
  escribirAlmacen(inicial)
  return inicial
}
