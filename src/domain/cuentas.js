/**
 * Reglas de la HU-1 (cuenta y acceso). Funciones puras: se usan en los formularios y
 * otra vez en el servicio, y en la segunda entrega se pueden reutilizar en el servidor.
 */

export const DOMINIO_ESTUDIANTE = '@aloe.ulima.edu.pe'
export const DOMINIO_PERSONAL = '@ulima.edu.pe'

export const CARRERAS = [
  'Arquitectura',
  'Comunicación',
  'Ingeniería Civil',
  'Ingeniería de Sistemas',
  'Ingeniería Electrónica',
  'Ingeniería Industrial',
]

export const CICLOS = Array.from({ length: 12 }, (_, i) => i + 1)

export const ALMACENES = ['Almacén H-102', 'Almacén N-005', 'Laboratorio de Electrónica H-210']

export const ESTADOS_CUENTA = {
  activo: 'Activa',
  por_verificar: 'Por verificar',
  pendiente_aprobacion: 'Pendiente de aprobación',
  bloqueado: 'Bloqueada',
}

/** Vista principal según el rol, a donde se llega después de iniciar sesión. */
export const INICIO_POR_ROL = { encargado: '/inventario', estudiante: '/catalogo' }

export const INTENTOS_MAXIMOS = 5
export const MINUTOS_BLOQUEO_TEMPORAL = 15
export const MINUTOS_ENLACE_RECUPERACION = 60
export const HORAS_ENLACE_VERIFICACION = 24

const vacio = (v) => String(v ?? '').trim().length === 0
const formatoCorreo = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? '').trim())

export function normalizarCorreo(correo) {
  return String(correo ?? '')
    .trim()
    .toLowerCase()
}

/** Mínimo 8 caracteres, una mayúscula y un número (mockups 1.3 y 1.4). */
export function errorContrasena(contrasena) {
  const c = String(contrasena ?? '')
  if (c.length === 0) return 'Ingresa una contraseña.'
  if (c.length < 8) return 'Debe tener al menos 8 caracteres.'
  if (!/[A-ZÁÉÍÓÚÑ]/.test(c)) return 'Debe tener al menos una mayúscula.'
  if (!/[0-9]/.test(c)) return 'Debe tener al menos un número.'
  return null
}

/** Fortaleza de la contraseña para la barra del paso 3 de recuperación. */
export function fortalezaContrasena(contrasena) {
  const c = String(contrasena ?? '')
  if (!c) return { nivel: '', puntaje: 0 }
  let puntaje = 0
  if (c.length >= 8) puntaje++
  if (c.length >= 12) puntaje++
  if (/[A-Z]/.test(c) && /[a-z]/.test(c)) puntaje++
  if (/[0-9]/.test(c)) puntaje++
  if (/[^A-Za-z0-9]/.test(c)) puntaje++
  if (puntaje <= 2) return { nivel: 'Débil', puntaje: 1 }
  if (puntaje <= 3) return { nivel: 'Media', puntaje: 2 }
  return { nivel: 'Segura', puntaje: 3 }
}

function validarNombres(datos, errores) {
  if (vacio(datos.nombres)) errores.nombres = 'Ingresa tus nombres.'
  else if (datos.nombres.trim().length < 2) errores.nombres = 'Los nombres son muy cortos.'
  if (vacio(datos.apellidos)) errores.apellidos = 'Ingresa tus apellidos.'
  else if (datos.apellidos.trim().length < 2) errores.apellidos = 'Los apellidos son muy cortos.'
}

function validarClaves(datos, errores) {
  const error = errorContrasena(datos.contrasena)
  if (error) errores.contrasena = error
  if (vacio(datos.confirmarContrasena)) errores.confirmarContrasena = 'Repite la contraseña.'
  else if (datos.contrasena !== datos.confirmarContrasena)
    errores.confirmarContrasena = 'Las contraseñas no coinciden.'
}

function validarCorreoDominio(correo, dominio, errores) {
  const c = normalizarCorreo(correo)
  if (!c) errores.correo = `Ingresa tu correo institucional (${dominio}).`
  else if (!formatoCorreo(c) || !c.endsWith(dominio)) errores.correo = `Debe terminar en ${dominio}`
}

/** Vista 1.3 */
export function validarRegistroEstudiante(datos) {
  const errores = {}
  validarNombres(datos, errores)
  if (!CARRERAS.includes(datos.carrera)) errores.carrera = 'Elige tu carrera.'
  if (!CICLOS.includes(Number(datos.ciclo))) errores.ciclo = 'Elige tu ciclo.'
  validarCorreoDominio(datos.correo, DOMINIO_ESTUDIANTE, errores)
  validarClaves(datos, errores)
  if (!datos.aceptaReglamento) errores.aceptaReglamento = 'Debes aceptar el reglamento de préstamo.'
  return errores
}

/** Vista 1.4 */
export function validarRegistroEncargado(datos) {
  const errores = {}
  validarNombres(datos, errores)
  validarCorreoDominio(datos.correo, DOMINIO_PERSONAL, errores)
  if (normalizarCorreo(datos.correo).endsWith(DOMINIO_ESTUDIANTE))
    errores.correo = `Usa tu correo de personal (${DOMINIO_PERSONAL}), no el de estudiante.`
  validarClaves(datos, errores)
  if (!ALMACENES.includes(datos.almacenAsignado))
    errores.almacenAsignado = 'Elige el almacén asignado.'
  if (!/^\d{4}$/.test(String(datos.anexo ?? '').trim())) errores.anexo = 'El anexo tiene 4 dígitos.'
  return errores
}

/** Vista 1.2: solo revisa que haya algo que enviar; las credenciales las revisa el servicio. */
export function validarInicioSesion({ correo, contrasena }) {
  const errores = {}
  if (vacio(correo)) errores.correo = 'Ingresa tu correo institucional.'
  else if (!formatoCorreo(correo)) errores.correo = 'Revisa el formato del correo.'
  if (vacio(contrasena)) errores.contrasena = 'Ingresa tu contraseña.'
  return errores
}

/** Vista 1.6: datos personales. El correo no se edita. */
export function validarPerfil(datos, rol) {
  const errores = {}
  validarNombres(datos, errores)
  if (rol === 'estudiante') {
    if (!CARRERAS.includes(datos.carrera)) errores.carrera = 'Elige tu carrera.'
    if (!CICLOS.includes(Number(datos.ciclo))) errores.ciclo = 'Elige tu ciclo.'
  }
  if (rol === 'encargado' && !/^\d{4}$/.test(String(datos.anexo ?? '').trim()))
    errores.anexo = 'El anexo tiene 4 dígitos.'
  const celular = String(datos.celular ?? '').replace(/\s/g, '')
  if (celular && !/^9\d{8}$/.test(celular))
    errores.celular = 'El celular tiene 9 dígitos y empieza con 9.'
  return errores
}

/** Vista 1.6: cambio de contraseña. La contraseña actual la revisa el servicio. */
export function validarCambioContrasena({ actual, nueva, confirmar }) {
  const errores = {}
  if (vacio(actual)) errores.actual = 'Ingresa tu contraseña actual.'
  const error = errorContrasena(nueva)
  if (error) errores.nueva = error
  else if (nueva === actual) errores.nueva = 'La nueva contraseña debe ser distinta de la actual.'
  if (vacio(confirmar)) errores.confirmar = 'Repite la nueva contraseña.'
  else if (nueva !== confirmar) errores.confirmar = 'Las contraseñas no coinciden.'
  return errores
}

/** Vista 1.5, paso 3. */
export function validarRestablecer({ nueva, confirmar }) {
  const errores = {}
  const error = errorContrasena(nueva)
  if (error) errores.nueva = error
  if (vacio(confirmar)) errores.confirmar = 'Repite la nueva contraseña.'
  else if (nueva !== confirmar) errores.confirmar = 'Las contraseñas no coinciden.'
  return errores
}

/** Correo institucional de cualquiera de los dos dominios (vista 1.5, paso 1). */
export function validarCorreoInstitucional(correo) {
  const c = normalizarCorreo(correo)
  if (!c) return 'Ingresa tu correo institucional.'
  if (!formatoCorreo(c) || (!c.endsWith(DOMINIO_PERSONAL) && !c.endsWith(DOMINIO_ESTUDIANTE)))
    return `Debe terminar en ${DOMINIO_ESTUDIANTE} o ${DOMINIO_PERSONAL}`
  return null
}

/** Datos que se pueden mostrar de un usuario: nunca el hash de la contraseña. */
export function usuarioPublico(usuario) {
  if (!usuario) return null
  const { contrasenaHash: _omitido, ...resto } = usuario
  return resto
}

/** Solo se vuelve a la página pedida si el rol puede verla; si no, a su vista principal. */
export function destinoTrasIngresar(desde, rol) {
  if (!desde || desde === '/' || desde.startsWith('/login')) return INICIO_POR_ROL[rol]
  const deEncargado =
    /^\/(inventario|solicitudes|prestamos|vencidos|entregas|devoluciones|lista-espera)/
  const deEstudiante = /^\/(mis-solicitudes|catalogo\/[^/]+\/solicitar)/
  if (rol === 'estudiante' && deEncargado.test(desde)) return INICIO_POR_ROL[rol]
  if (rol === 'encargado' && deEstudiante.test(desde)) return INICIO_POR_ROL[rol]
  return desde
}
