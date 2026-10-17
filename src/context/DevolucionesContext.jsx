/**
 * Estado de la HU-5: devoluciones, renovaciones, historial y pagos.
 *
 * Es el único punto que conversa con `devolucionesService`. Después de cada escritura avisa
 * al inventario (HU-2) y a los préstamos (HU-4) para que sus vistas y contadores recarguen.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as servicio from '../services/devolucionesService.js'
import { useInventario } from './InventarioContext.jsx'
import { useNotificacion } from './NotificacionContext.jsx'
import { usePrestamos } from './PrestamosContext.jsx'
import { useSesion } from './SesionContext.jsx'

const DevolucionesContext = createContext(null)

export function DevolucionesProvider({ children }) {
  const notificacion = useNotificacion()
  const { usuario } = useSesion()
  const { refrescar: refrescarInventario } = useInventario()
  const { refrescar: refrescarPrestamos } = usePrestamos()
  const [version, setVersion] = useState(0)

  /** Envuelve una escritura: notifica el resultado y avisa a las vistas que recarguen. */
  const escribir = useCallback(
    async (operacion, mensajeExito) => {
      try {
        const resultado = await operacion()
        setVersion((v) => v + 1)
        refrescarInventario()
        refrescarPrestamos()
        notificacion.exito(
          typeof mensajeExito === 'function' ? mensajeExito(resultado) : mensajeExito,
        )
        return { ok: true, datos: resultado }
      } catch (e) {
        notificacion.error(e.message ?? 'No pudimos completar la operación.')
        return { ok: false, error: e.message, errores: e.errores ?? null, estado: e.estado }
      }
    },
    [notificacion, refrescarInventario, refrescarPrestamos],
  )

  const valor = useMemo(
    () => ({
      version,

      // consultas
      listarPorDevolver: servicio.listarPorDevolver,
      obtenerParaDevolucion: servicio.obtenerParaDevolucion,
      consultarRenovacion: servicio.consultarRenovacion,
      obtenerHistorial: (estudianteId) => servicio.obtenerHistorial(estudianteId, usuario),

      // escritura
      registrarDevolucion: (codigo, datos) =>
        escribir(
          () => servicio.registrarDevolucion(codigo, datos, usuario),
          (r) =>
            r.diasRetraso > 0
              ? `Devolución registrada con ${r.diasRetraso} ${r.diasRetraso === 1 ? 'día' : 'días'} de retraso. Penalidad: S/ ${r.penalidad.toFixed(2)}.`
              : `Devolución registrada a tiempo. La unidad ${r.codigoUnidad} quedó ${r.estadoUnidad === 'mantenimiento' ? 'en mantenimiento' : 'disponible'}.`,
        ),
      renovarPrestamo: (codigo, datos) =>
        escribir(
          () => servicio.renovarPrestamo(codigo, datos, usuario),
          (r) => `Préstamo ${r.codigoPrestamo} renovado.`,
        ),
      registrarPago: (estudianteId) =>
        escribir(
          () => servicio.registrarPago(estudianteId, usuario),
          (r) => `Pago registrado: S/ ${r.monto.toFixed(2)}. La deuda quedó en cero.`,
        ),
    }),
    [version, escribir, usuario],
  )

  return <DevolucionesContext.Provider value={valor}>{children}</DevolucionesContext.Provider>
}

export function useDevoluciones() {
  const contexto = useContext(DevolucionesContext)
  if (!contexto) throw new Error('useDevoluciones debe usarse dentro de DevolucionesProvider.')
  return contexto
}
