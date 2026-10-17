/**
 * Capa de acceso a datos de la HU-1 (cuenta y acceso). La HU-1 es dueña del usuario.
 *
 * Primera entrega: los usuarios parten de `seed-usuarios.json` y se guardan en
 * localStorage; la contraseña nunca se guarda en texto plano, sino como SHA-256. El correo
 * de verificación y el de recuperación se simulan: el servicio devuelve el enlace que
 * llegaría por correo, y la interfaz lo muestra como «enlace de prueba».
 *
 * Segunda entrega: solo este archivo cambia (fetch al servicio REST; bcrypt y tokens en
 * el servidor), con la misma firma y el mismo resultado.
 */
import semilla from '../data/seed-usuarios.json'
import {
  HORAS_ENLACE_VERIFICACION,
  INTENTOS_MAXIMOS,
  MINUTOS_BLOQUEO_TEMPORAL,
  MINUTOS_ENLACE_RECUPERACION,
  normalizarCorreo,
  usuarioPublico,
  validarCambioContrasena,
  validarCorreoInstitucional,
  validarInicioSesion,
  validarPerfil,
  validarRegistroEncargado,
  validarRegistroEstudiante,
  validarRestablecer,
} from '../domain/cuentas.js'
import { formatearSoles } from '../domain/catalogos.js'
import { hoyISO } from '../domain/solicitudes.js'
import { sha256 } from '../utils/hash.js'
import { leerSolicitudes } from './solicitudesAlmacen.js'

const CLAVE_USUARIOS = 'hu1.usuarios.v1'
const CLAVE_TOKENS = 'hu1.tokens.v1'
const CLAVE_INTENTOS = 'hu1.intentos.v1'
const CLAVE_SESION = 'hu1.sesion'
const RETARDO_MS = 450 // el inicio de sesión muestra su estado «Ingresando…»

const clonar = (valor) => JSON.parse(JSON.stringify(valor))
const esperar = (ms = RETARDO_MS) => new Promise((resolve) => setTimeout(resolve, ms))
const ahora = () => new Date().toISOString()

/** Error con la forma que tendrá la respuesta del servicio en la segunda entrega. */
class ErrorCuenta extends Error {
  constructor(mensaje, estado = 400, extra = {}) {
    super(mensaje)
    this.name = 'ErrorCuenta'
    this.estado = estado
    Object.assign(this, extra)
  }
}

// ----------------------------------------------------------------- almacén local

function leer(clave, porDefecto) {
  try {
    const crudo = localStorage.getItem(clave)
    if (crudo) return JSON.parse(crudo)
  } catch {
    // localStorage no disponible o con contenido inválido
  }
  return porDefecto()
}

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // en modo privado el guardado puede fallar; la sesión sigue funcionando en memoria
  }
}

function leerUsuarios() {
  return leer(CLAVE_USUARIOS, () => {
    const inicial = clonar(semilla.usuarios)
    escribir(CLAVE_USUARIOS, inicial)
    return inicial
  })
}

const hashContrasena = (usuarioId, contrasena) => sha256(`${usuarioId}:${contrasena}`)

function siguienteId(usuarios, rol) {
  const base = rol === 'encargado' ? 100 : 200
  const numeros = usuarios
    .filter((u) => u.rol === rol)
    .map((u) => Number(String(u.id).split('-')[1]))
    .filter(Number.isFinite)
  return `US-${(numeros.length ? Math.max(...numeros) : base) + 1}`
}

function nuevoToken() {
  const aleatorio = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return aleatorio.replace(/-/g, '').slice(0, 24)
}

function crearToken(usuarioId, tipo, minutos) {
  const tokens = leer(CLAVE_TOKENS, () => [])
  const token = nuevoToken()
  const vigentes = tokens.filter(
    (t) => !(t.usuarioId === usuarioId && t.tipo === tipo) && Date.parse(t.expira) > Date.now(),
  )
  vigentes.push({
    token,
    tipo,
    usuarioId,
    expira: new Date(Date.now() + minutos * 60000).toISOString(),
  })
  escribir(CLAVE_TOKENS, vigentes)
  return token
}

function tomarToken(token, tipo) {
  const tokens = leer(CLAVE_TOKENS, () => [])
  const encontrado = tokens.find((t) => t.token === token && t.tipo === tipo)
  if (!encontrado || Date.parse(encontrado.expira) < Date.now())
    throw new ErrorCuenta('El enlace no es válido o ya expiró. Solicita uno nuevo.', 410)
  return encontrado
}

function borrarToken(token) {
  escribir(
    CLAVE_TOKENS,
    leer(CLAVE_TOKENS, () => []).filter((t) => t.token !== token),
  )
}

function avisoDeCuenta(usuario) {
  if (usuario.rol === 'estudiante' && Number(usuario.deudaPendiente) > 0)
    return `Tienes una penalidad pendiente de ${formatearSoles(usuario.deudaPendiente)}. Puedes ingresar para ver tu historial, pero no solicitar equipos hasta regularizar en Tesorería.`
  if (usuario.estado === 'pendiente_aprobacion')
    return 'Tu alta de encargado está pendiente de aprobación. Hasta entonces no podrás aprobar solicitudes ni registrar entregas.'
  return null
}

// ----------------------------------------------------------------------- sesión

/** Vista 1.2. Cinco intentos fallidos bloquean el correo por 15 minutos. */
export async function iniciarSesion({ correo, contrasena, recordarme = false }) {
  await esperar()
  const errores = validarInicioSesion({ correo, contrasena })
  if (Object.keys(errores).length)
    throw new ErrorCuenta(Object.values(errores)[0], 422, { errores })

  const clave = normalizarCorreo(correo)
  const intentos = leer(CLAVE_INTENTOS, () => ({}))
  const registro = intentos[clave] ?? { fallidos: 0, bloqueadoHasta: null }
  if (registro.bloqueadoHasta && Date.parse(registro.bloqueadoHasta) > Date.now()) {
    const minutos = Math.ceil((Date.parse(registro.bloqueadoHasta) - Date.now()) / 60000)
    throw new ErrorCuenta(
      `Superaste los ${INTENTOS_MAXIMOS} intentos. Vuelve a intentarlo en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} o recupera tu contraseña.`,
      429,
      { tipo: 'bloqueo-temporal' },
    )
  }

  const usuario = leerUsuarios().find((u) => normalizarCorreo(u.correo) === clave)
  const coincide =
    usuario && (await hashContrasena(usuario.id, contrasena)) === usuario.contrasenaHash
  if (!coincide) {
    const fallidos = registro.fallidos + 1
    const restantes = Math.max(0, INTENTOS_MAXIMOS - fallidos)
    intentos[clave] =
      restantes === 0
        ? {
            fallidos: 0,
            bloqueadoHasta: new Date(Date.now() + MINUTOS_BLOQUEO_TEMPORAL * 60000).toISOString(),
          }
        : { fallidos, bloqueadoHasta: null }
    escribir(CLAVE_INTENTOS, intentos)
    throw new ErrorCuenta(
      restantes === 0
        ? `Correo o contraseña incorrectos. Bloqueamos el acceso por ${MINUTOS_BLOQUEO_TEMPORAL} minutos.`
        : `Correo o contraseña incorrectos. Te ${restantes === 1 ? 'queda 1 intento' : `quedan ${restantes} intentos`}.`,
      401,
      { tipo: 'credenciales', intentosRestantes: restantes },
    )
  }

  delete intentos[clave]
  escribir(CLAVE_INTENTOS, intentos)

  if (usuario.estado === 'bloqueado')
    throw new ErrorCuenta(
      `Tu cuenta está bloqueada${usuario.motivoBloqueo ? `: ${usuario.motivoBloqueo.replace(/\.$/, '')}` : ''}. Escribe a almacen.equipos@ulima.edu.pe para regularizarla.`,
      403,
      { tipo: 'bloqueada' },
    )
  if (usuario.estado === 'por_verificar')
    throw new ErrorCuenta(
      'Tu cuenta aún no está activa. Abre el enlace de verificación que enviamos a tu correo.',
      403,
      { tipo: 'por-verificar' },
    )

  guardarSesion(usuario.id, recordarme)
  return { usuario: usuarioPublico(usuario), aviso: avisoDeCuenta(usuario) }
}

function guardarSesion(usuarioId, recordarme) {
  cerrarSesion()
  try {
    const destino = recordarme ? localStorage : sessionStorage
    destino.setItem(CLAVE_SESION, JSON.stringify({ usuarioId, desde: ahora() }))
  } catch {
    // sin almacenamiento la sesión dura lo que dure la pestaña
  }
}

/** Usuario en sesión, releído para que un cambio de datos o un bloqueo se note al instante. */
export function obtenerSesion() {
  try {
    const crudo = sessionStorage.getItem(CLAVE_SESION) ?? localStorage.getItem(CLAVE_SESION)
    if (!crudo) return null
    const { usuarioId } = JSON.parse(crudo)
    const usuario = leerUsuarios().find((u) => u.id === usuarioId)
    if (!usuario || usuario.estado === 'bloqueado' || usuario.estado === 'por_verificar') {
      cerrarSesion()
      return null
    }
    return usuarioPublico(usuario)
  } catch {
    return null
  }
}

export function cerrarSesion() {
  try {
    sessionStorage.removeItem(CLAVE_SESION)
    localStorage.removeItem(CLAVE_SESION)
  } catch {
    // nada que limpiar
  }
}

// ---------------------------------------------------------------------- registro

async function crearCuenta(datos, rol, estado, extra) {
  const usuarios = leerUsuarios()
  const correo = normalizarCorreo(datos.correo)
  if (usuarios.some((u) => normalizarCorreo(u.correo) === correo))
    throw new ErrorCuenta(`Ya existe una cuenta con el correo ${correo}.`, 409, {
      tipo: 'duplicado',
    })

  const id = siguienteId(usuarios, rol)
  const usuario = {
    id,
    rol,
    nombres: datos.nombres.trim(),
    apellidos: datos.apellidos.trim(),
    correo,
    ...extra,
    estado,
    contrasenaHash: await hashContrasena(id, datos.contrasena),
    creadoEn: ahora(),
  }
  usuarios.push(usuario)
  escribir(CLAVE_USUARIOS, usuarios)
  return usuario
}

/** Vista 1.3: la cuenta queda «por verificar» hasta abrir el enlace del correo. */
export async function registrarEstudiante(datos) {
  await esperar()
  const errores = validarRegistroEstudiante(datos)
  if (Object.keys(errores).length)
    throw new ErrorCuenta('Revisa los campos marcados.', 422, { errores })
  const usuario = await crearCuenta(datos, 'estudiante', 'por_verificar', {
    carrera: datos.carrera,
    ciclo: Number(datos.ciclo),
    celular: '',
    deudaPendiente: 0,
  })
  const token = crearToken(usuario.id, 'verificacion', HORAS_ENLACE_VERIFICACION * 60)
  return { usuario: usuarioPublico(usuario), enlacePrueba: `/verificar?token=${token}` }
}

/** Vista 1.4: el alta queda pendiente hasta que la apruebe el jefe de laboratorio. */
export async function registrarEncargado(datos) {
  await esperar()
  const errores = validarRegistroEncargado(datos)
  if (Object.keys(errores).length)
    throw new ErrorCuenta('Revisa los campos marcados.', 422, { errores })
  const usuario = await crearCuenta(datos, 'encargado', 'pendiente_aprobacion', {
    almacenAsignado: datos.almacenAsignado,
    anexo: String(datos.anexo).trim(),
  })
  return { usuario: usuarioPublico(usuario) }
}

/** Abrir el enlace dos veces no es un error: la segunda vez la cuenta ya está activa. */
export async function verificarCuenta(token) {
  await esperar(200)
  const registro = tomarToken(token, 'verificacion')
  const usuarios = leerUsuarios()
  const usuario = usuarios.find((u) => u.id === registro.usuarioId)
  if (!usuario) throw new ErrorCuenta('La cuenta ya no existe.', 404)
  if (usuario.estado === 'por_verificar') {
    usuario.estado = 'activo'
    escribir(CLAVE_USUARIOS, usuarios)
  }
  return usuarioPublico(usuario)
}

// ------------------------------------------------------------------ recuperación

/**
 * Vista 1.5, paso 1. La respuesta es la misma exista o no la cuenta, para no revelar qué
 * correos están registrados. Solo para la demo se devuelve el enlace que llegaría por correo.
 */
export async function solicitarRecuperacion(correo) {
  await esperar()
  const error = validarCorreoInstitucional(correo)
  if (error) throw new ErrorCuenta(error, 422, { errores: { correo: error } })
  const usuario = leerUsuarios().find(
    (u) => normalizarCorreo(u.correo) === normalizarCorreo(correo),
  )
  if (!usuario) return { enviado: true, enlacePrueba: null }
  const token = crearToken(usuario.id, 'recuperacion', MINUTOS_ENLACE_RECUPERACION)
  return { enviado: true, enlacePrueba: `/restablecer?token=${token}` }
}

export async function revisarEnlaceRecuperacion(token) {
  await esperar(150)
  const registro = tomarToken(token, 'recuperacion')
  const usuario = leerUsuarios().find((u) => u.id === registro.usuarioId)
  if (!usuario) throw new ErrorCuenta('La cuenta ya no existe.', 404)
  return { correo: usuario.correo }
}

/** Vista 1.5, paso 3. El enlace sirve una sola vez. */
export async function restablecerContrasena(token, datos) {
  await esperar()
  const errores = validarRestablecer(datos)
  if (Object.keys(errores).length)
    throw new ErrorCuenta('Revisa los campos marcados.', 422, { errores })
  const registro = tomarToken(token, 'recuperacion')
  const usuarios = leerUsuarios()
  const usuario = usuarios.find((u) => u.id === registro.usuarioId)
  if (!usuario) throw new ErrorCuenta('La cuenta ya no existe.', 404)
  usuario.contrasenaHash = await hashContrasena(usuario.id, datos.nueva)
  escribir(CLAVE_USUARIOS, usuarios)
  borrarToken(token)
  const intentos = leer(CLAVE_INTENTOS, () => ({}))
  delete intentos[normalizarCorreo(usuario.correo)]
  escribir(CLAVE_INTENTOS, intentos)
  return { correo: usuario.correo }
}

// --------------------------------------------------------------------- mi cuenta

/** Vista 1.6. Solo se cambian los campos que el usuario puede editar; el correo no. */
export async function actualizarPerfil(usuarioId, datos) {
  await esperar(250)
  const usuarios = leerUsuarios()
  const usuario = usuarios.find((u) => u.id === usuarioId)
  if (!usuario) throw new ErrorCuenta('Tu sesión expiró. Vuelve a iniciar sesión.', 401)
  const errores = validarPerfil(datos, usuario.rol)
  if (Object.keys(errores).length)
    throw new ErrorCuenta('Revisa los campos marcados.', 422, { errores })

  usuario.nombres = datos.nombres.trim()
  usuario.apellidos = datos.apellidos.trim()
  usuario.celular = String(datos.celular ?? '').replace(/\s/g, '')
  if (usuario.rol === 'estudiante') {
    usuario.carrera = datos.carrera
    usuario.ciclo = Number(datos.ciclo)
  } else {
    usuario.anexo = String(datos.anexo).trim()
  }
  usuario.actualizadoEn = ahora()
  escribir(CLAVE_USUARIOS, usuarios)
  return usuarioPublico(usuario)
}

export async function cambiarContrasena(usuarioId, datos) {
  await esperar(300)
  const errores = validarCambioContrasena(datos)
  if (Object.keys(errores).length)
    throw new ErrorCuenta('Revisa los campos marcados.', 422, { errores })
  const usuarios = leerUsuarios()
  const usuario = usuarios.find((u) => u.id === usuarioId)
  if (!usuario) throw new ErrorCuenta('Tu sesión expiró. Vuelve a iniciar sesión.', 401)
  if ((await hashContrasena(usuario.id, datos.actual)) !== usuario.contrasenaHash)
    throw new ErrorCuenta('La contraseña actual no es correcta.', 401, {
      errores: { actual: 'La contraseña actual no es correcta.' },
    })
  usuario.contrasenaHash = await hashContrasena(usuario.id, datos.nueva)
  escribir(CLAVE_USUARIOS, usuarios)
  return true
}

/** Resumen de la vista 1.6. Lee las solicitudes (HU-3/HU-4) sin modificarlas. */
export async function obtenerResumenPrestamos(usuarioId) {
  await esperar(150)
  const usuario = leerUsuarios().find((u) => u.id === usuarioId)
  const hoy = hoyISO()
  const suyas = leerSolicitudes().filter((s) => s.estudianteId === usuarioId)
  const prestamos = suyas.filter((s) => ['en_prestamo', 'devuelta'].includes(s.estado))
  const retrasos = prestamos.filter((s) =>
    s.estado === 'en_prestamo'
      ? s.fechaFin < hoy
      : s.fechaDevolucionReal && s.fechaDevolucionReal.slice(0, 10) > s.fechaFin,
  ).length
  return { prestamos: prestamos.length, retrasos, deuda: Number(usuario?.deudaPendiente) || 0 }
}

// ------------------------------------------------------- lectura para otras historias

/**
 * Datos de los estudiantes que otras historias pueden mostrar (la HU-4 en su bandeja, la
 * HU-7 en su listado): sin contraseña ni datos de acceso.
 */
export async function listarUsuariosPublicos() {
  await esperar(60)
  return leerUsuarios().map(usuarioPublico)
}

/** Vuelve a cargar los usuarios semilla. Útil para demostrar la data de prueba. */
export async function restablecerUsuarios() {
  escribir(CLAVE_USUARIOS, clonar(semilla.usuarios))
  escribir(CLAVE_INTENTOS, {})
  escribir(CLAVE_TOKENS, [])
  return true
}
