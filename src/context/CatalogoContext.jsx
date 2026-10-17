/**
 * Estado de la HU-3: catálogo y solicitudes del estudiante.
 *
 * Es el único punto que conversa con `catalogoService`. Las vistas del catálogo no
 * importan el servicio: piden lo que necesitan a este Context.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import * as servicio from '../services/catalogoService.js'
import { catalogoReducer, estadoInicialCatalogo } from './catalogoReducer.js'
import { useNotificacion } from './NotificacionContext.jsx'
import { useSesion } from './SesionContext.jsx'

const CatalogoContext = createContext(null)

export function CatalogoProvider({ children }) {
  const [estado, dispatch] = useReducer(catalogoReducer, estadoInicialCatalogo)
  const notificacion = useNotificacion()
  const { usuario, esEstudiante } = useSesion()
  const { version } = estado

  useEffect(() => {
    if (!esEstudiante) {
      dispatch({ tipo: 'SIN_SESION' })
      return undefined
    }
    let vigente = true
    dispatch({ tipo: 'SOLICITUDES_CARGANDO' })
    servicio
      .listarMisSolicitudes(usuario.id)
      .then((lista) => vigente && dispatch({ tipo: 'SOLICITUDES_LISTAS', lista }))
      .catch((e) => vigente && dispatch({ tipo: 'SOLICITUDES_FALLO', error: e.message }))
    return () => {
      vigente = false
    }
  }, [esEstudiante, usuario.id, version])

  /** Envuelve una escritura: notifica el resultado y avisa a las vistas que recarguen. */
  const escribir = useCallback(
    async (operacion, mensajeExito) => {
      try {
        const resultado = await operacion()
        dispatch({ tipo: 'ESCRITURA_OK' })
        notificacion.exito(
          typeof mensajeExito === 'function' ? mensajeExito(resultado) : mensajeExito,
        )
        return { ok: true, datos: resultado }
      } catch (e) {
        notificacion.error(e.message ?? 'No pudimos completar la operación.')
        return { ok: false, error: e.message, errores: e.errores ?? null }
      }
    },
    [notificacion],
  )

  const valor = useMemo(
    () => ({
      ...estado,

      // consultas
      listarCatalogo: servicio.listarCatalogo,
      obtenerDetalleEquipo: servicio.obtenerDetalleEquipo,
      consultarDisponibilidad: servicio.consultarDisponibilidad,

      // escritura
      crearSolicitud: (datos) =>
        escribir(
          () => servicio.crearSolicitud(datos, usuario),
          (s) => `Solicitud enviada. El encargado revisará tu pedido de ${s.equipoNombre}.`,
        ),
      retirarSolicitud: (id) =>
        escribir(
          () => servicio.retirarSolicitud(id, usuario.id),
          'Solicitud retirada. La unidad vuelve a quedar disponible para otros estudiantes.',
        ),

      // mantenimiento de la data de prueba
      restablecerSolicitudes: () =>
        escribir(servicio.restablecerSolicitudes, 'Solicitudes restablecidas a los datos semilla.'),
    }),
    [estado, escribir, usuario],
  )

  return <CatalogoContext.Provider value={valor}>{children}</CatalogoContext.Provider>
}

export function useCatalogo() {
  const contexto = useContext(CatalogoContext)
  if (!contexto) throw new Error('useCatalogo debe usarse dentro de CatalogoProvider.')
  return contexto
}
