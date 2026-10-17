/**
 * Sesión y rol (HU-1 — Cuenta y acceso).
 *
 * Es el único punto que conversa con `cuentasService`. El resto de historias consume
 * solo `usuario`, `rol`, `esEncargado` y `esEstudiante`; sin sesión, `usuario` es un
 * visitante con `id: null`, así ninguna vista tiene que preguntar si existe.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as servicio from '../services/cuentasService.js'
import { useNotificacion } from './NotificacionContext.jsx'

const SesionContext = createContext(null)

const VISITANTE = { id: null, rol: 'visitante' }

/** Convierte el error del servicio en una respuesta que los formularios saben leer. */
const fallo = (e) => ({
  ok: false,
  error: e.message ?? 'No pudimos completar la operación.',
  errores: e.errores ?? null,
  tipo: e.tipo ?? null,
  estado: e.estado ?? null,
})

export function SesionProvider({ children }) {
  const notificacion = useNotificacion()
  // La sesión guardada se lee al arrancar, sin esperar: así una recarga no saca al usuario.
  const [usuario, setUsuario] = useState(() => servicio.obtenerSesion() ?? VISITANTE)

  const iniciarSesion = useCallback(async (datos) => {
    try {
      const r = await servicio.iniciarSesion(datos)
      setUsuario(r.usuario)
      return { ok: true, ...r }
    } catch (e) {
      return fallo(e)
    }
  }, [])

  const cerrarSesion = useCallback(() => {
    servicio.cerrarSesion()
    // `salio` evita que la protección de rutas recuerde la página del usuario anterior.
    setUsuario({ ...VISITANTE, salio: true })
    notificacion.exito('Cerraste sesión.')
  }, [notificacion])

  /** Para las operaciones que no tocan la sesión: devuelven { ok, ... } sin notificar. */
  const intentar = useCallback(async (operacion) => {
    try {
      return { ok: true, ...(await operacion()) }
    } catch (e) {
      return fallo(e)
    }
  }, [])

  const actualizarPerfil = useCallback(
    async (datos) => {
      try {
        const actualizado = await servicio.actualizarPerfil(usuario.id, datos)
        setUsuario(actualizado)
        notificacion.exito('Guardamos los cambios de tu cuenta.')
        return { ok: true, usuario: actualizado }
      } catch (e) {
        notificacion.error(e.message)
        return fallo(e)
      }
    },
    [usuario.id, notificacion],
  )

  const cambiarContrasena = useCallback(
    async (datos) => {
      try {
        await servicio.cambiarContrasena(usuario.id, datos)
        notificacion.exito('Tu contraseña se actualizó.')
        return { ok: true }
      } catch (e) {
        notificacion.error(e.message)
        return fallo(e)
      }
    },
    [usuario.id, notificacion],
  )

  const valor = useMemo(() => {
    const conSesion = Boolean(usuario.id)
    const nombreCorto = conSesion
      ? `${usuario.nombres.split(' ')[0]} ${usuario.apellidos.split(' ')[0]}`
      : 'Visitante'
    return {
      usuario,
      rol: usuario.rol,
      conSesion,
      esEncargado: usuario.rol === 'encargado',
      esEstudiante: usuario.rol === 'estudiante',
      /** Un encargado con el alta pendiente puede entrar, pero no aprobar ni entregar. */
      encargadoActivo: usuario.rol === 'encargado' && usuario.estado === 'activo',
      nombreCorto,
      iniciales: conSesion ? `${usuario.nombres[0]}${usuario.apellidos[0]}`.toUpperCase() : '··',
      almacen: usuario.almacenAsignado ?? 'Almacén H-102',

      iniciarSesion,
      cerrarSesion,
      actualizarPerfil,
      cambiarContrasena,
      registrarEstudiante: (datos) => intentar(() => servicio.registrarEstudiante(datos)),
      registrarEncargado: (datos) => intentar(() => servicio.registrarEncargado(datos)),
      verificarCuenta: (token) =>
        intentar(async () => ({ usuario: await servicio.verificarCuenta(token) })),
      solicitarRecuperacion: (correo) => intentar(() => servicio.solicitarRecuperacion(correo)),
      revisarEnlaceRecuperacion: (token) =>
        intentar(() => servicio.revisarEnlaceRecuperacion(token)),
      restablecerContrasena: (token, datos) =>
        intentar(() => servicio.restablecerContrasena(token, datos)),
      obtenerResumenPrestamos: () => servicio.obtenerResumenPrestamos(usuario.id),
    }
  }, [usuario, iniciarSesion, cerrarSesion, actualizarPerfil, cambiarContrasena, intentar])

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}

export function useSesion() {
  const contexto = useContext(SesionContext)
  if (!contexto) throw new Error('useSesion debe usarse dentro de SesionProvider.')
  return contexto
}
