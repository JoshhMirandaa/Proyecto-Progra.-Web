/**
 * Estado de la HU-4: bandeja de solicitudes, entrega y préstamos vigentes.
 *
 * Es el único punto que conversa con `prestamosService`. Lleva los contadores que muestra
 * el marco del encargado y un `version` que sube con cada escritura para que las vistas
 * vuelvan a pedir sus datos.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as servicio from '../services/prestamosService.js'
import { useInventario } from './InventarioContext.jsx'
import { useNotificacion } from './NotificacionContext.jsx'
import { useSesion } from './SesionContext.jsx'

const PrestamosContext = createContext(null)
const SIN_CONTADORES = { pendientes: 0, vigentes: 0, vencidos: 0 }

export function PrestamosProvider({ children }) {
  const notificacion = useNotificacion()
  const { usuario, esEncargado } = useSesion()
  const { refrescar: refrescarInventario } = useInventario()
  const [version, setVersion] = useState(0)
  const [contadores, setContadores] = useState(SIN_CONTADORES)

  useEffect(() => {
    if (!esEncargado) return undefined
    let vigente = true
    servicio
      .obtenerContadores()
      .then((c) => vigente && setContadores(c))
      .catch(() => vigente && setContadores(SIN_CONTADORES))
    return () => {
      vigente = false
    }
  }, [esEncargado, version])

  /** Envuelve una escritura: notifica el resultado y avisa a las vistas que recarguen. */
  const escribir = useCallback(
    async (operacion, mensajeExito) => {
      try {
        const resultado = await operacion()
        setVersion((v) => v + 1)
        notificacion.exito(
          typeof mensajeExito === 'function' ? mensajeExito(resultado) : mensajeExito,
        )
        return { ok: true, datos: resultado }
      } catch (e) {
        notificacion.error(e.message ?? 'No pudimos completar la operación.')
        return { ok: false, error: e.message, errores: e.errores ?? null, estado: e.estado }
      }
    },
    [notificacion],
  )

  const valor = useMemo(
    () => ({
      version,
      contadores,

      // consultas
      listarBandeja: servicio.listarBandeja,
      obtenerOpcionesAprobacion: servicio.obtenerOpcionesAprobacion,
      obtenerParaEntrega: servicio.obtenerParaEntrega,
      obtenerConstancia: (codigo) => servicio.obtenerConstancia(codigo, usuario),
      listarVigentes: servicio.listarVigentes,

      // escritura
      aprobarSolicitud: (id, datos) =>
        escribir(
          () => servicio.aprobarSolicitud(id, datos, usuario),
          (s) =>
            `Solicitud aprobada. Se asignó la unidad ${s.codigoUnidad} a ${s.estudianteNombre}.`,
        ),
      rechazarSolicitud: (id, datos) =>
        escribir(
          () => servicio.rechazarSolicitud(id, datos, usuario),
          (s) => `Solicitud rechazada. ${s.estudianteNombre} verá el motivo en «Mis solicitudes».`,
        ),
      registrarEntrega: async (id, datos) => {
        const resultado = await escribir(
          () => servicio.registrarEntrega(id, datos, usuario),
          (r) => `Entrega registrada con el código ${r.codigoPrestamo}.`,
        )
        // La unidad pasó a prestada en el inventario (HU-2).
        if (resultado.ok) refrescarInventario()
        return resultado
      },
    }),
    [version, contadores, escribir, usuario, refrescarInventario],
  )

  return <PrestamosContext.Provider value={valor}>{children}</PrestamosContext.Provider>
}

export function usePrestamos() {
  const contexto = useContext(PrestamosContext)
  if (!contexto) throw new Error('usePrestamos debe usarse dentro de PrestamosProvider.')
  return contexto
}
