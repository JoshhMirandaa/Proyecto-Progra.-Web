/**
 * Estado del inventario.
 *
 * Es el único punto que conversa con la capa de servicios. Los componentes de
 * interfaz no importan `inventarioService`: piden lo que necesitan a este Context.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import * as servicio from '../services/inventarioService.js'
import { etiquetaEstado } from '../domain/catalogos.js'
import { estadoInicial, inventarioReducer } from './inventarioReducer.js'
import { useNotificacion } from './NotificacionContext.jsx'
import { useSesion } from './SesionContext.jsx'

const InventarioContext = createContext(null)

export function InventarioProvider({ children }) {
  const [estado, dispatch] = useReducer(inventarioReducer, estadoInicial)
  const notificacion = useNotificacion()
  const { usuario } = useSesion()

  const { filtros, version } = estado

  const cargarResumen = useCallback(async () => {
    try {
      const resumen = await servicio.obtenerResumenInventario()
      dispatch({ tipo: 'RESUMEN_LISTO', resumen })
    } catch {
      // el resumen es complementario: si falla, la vista sigue siendo usable
    }
  }, [])

  useEffect(() => {
    let vigente = true
    dispatch({ tipo: 'CARGANDO' })
    servicio
      .listarEquipos(filtros)
      .then((lista) => vigente && dispatch({ tipo: 'LISTA_LISTA', lista }))
      .catch((e) => vigente && dispatch({ tipo: 'LISTA_FALLO', error: e.message }))
    return () => {
      vigente = false
    }
  }, [filtros, version])

  useEffect(() => {
    cargarResumen()
  }, [cargarResumen, version])

  /** Envuelve una escritura: notifica el resultado y refresca lo que haga falta. */
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
        return { ok: false, error: e.message }
      }
    },
    [notificacion],
  )

  const valor = useMemo(
    () => ({
      ...estado,

      // consultas
      cambiarFiltros: (cambios) => dispatch({ tipo: 'CAMBIAR_FILTROS', filtros: cambios }),
      limpiarFiltros: () => dispatch({ tipo: 'LIMPIAR_FILTROS' }),
      /** Otra historia cambió unidades (la entrega de la HU-4): recarga lista y resumen. */
      refrescar: () => dispatch({ tipo: 'ESCRITURA_OK' }),
      obtenerEquipo: servicio.obtenerEquipo,
      obtenerFichaPublica: servicio.obtenerFichaPublica,
      listarCodigosOcupados: servicio.listarCodigosOcupados,
      listarClavesEquipos: servicio.listarClavesEquipos,

      // escritura de equipos
      crearEquipo: (datos, opciones) =>
        escribir(
          () => servicio.crearEquipo(datos, opciones),
          (eq) =>
            eq.esBorrador
              ? `Borrador de "${eq.nombre}" guardado.`
              : `Equipo "${eq.nombre}" registrado.`,
        ),
      actualizarEquipo: (id, datos, opciones) =>
        escribir(
          () => servicio.actualizarEquipo(id, datos, opciones),
          (eq) =>
            eq.esBorrador
              ? `Borrador de "${eq.nombre}" guardado.`
              : `Cambios guardados en "${eq.nombre}".`,
        ),
      guardarCondiciones: (id, condiciones) =>
        escribir(
          () => servicio.guardarCondiciones(id, condiciones),
          'Condiciones del préstamo guardadas.',
        ),
      eliminarEquipo: (id, nombre) =>
        escribir(
          () => servicio.eliminarEquipo(id),
          (r) =>
            r.unidadesEliminadas > 0
              ? `Equipo "${nombre}" eliminado junto con sus ${r.unidadesEliminadas} unidad(es).`
              : `Equipo "${nombre}" eliminado.`,
        ),

      // escritura de unidades
      crearUnidad: (equipoId, datos) =>
        escribir(
          () => servicio.crearUnidad(equipoId, { ...datos, usuarioId: usuario.id }),
          (u) => `Unidad ${u.codigoInventario} registrada como disponible.`,
        ),
      actualizarUnidad: (id, datos) =>
        escribir(
          () => servicio.actualizarUnidad(id, datos),
          (u) => `Cambios guardados en la unidad ${u.codigoInventario}.`,
        ),
      eliminarUnidad: (id, codigo) =>
        escribir(() => servicio.eliminarUnidad(id), `Unidad ${codigo} eliminada.`),
      cambiarEstadoUnidad: (id, datos) =>
        escribir(
          () => servicio.cambiarEstadoUnidad(id, { ...datos, usuarioId: usuario.id }),
          (u) =>
            `La unidad ${u.codigoInventario} pasó a ${etiquetaEstado(u.estado).toLowerCase()}.`,
        ),

      // mantenimiento de la data de prueba
      restablecerSemilla: () =>
        escribir(servicio.restablecerSemilla, 'Inventario restablecido a los datos semilla.'),
    }),
    [estado, escribir, usuario.id],
  )

  return <InventarioContext.Provider value={valor}>{children}</InventarioContext.Provider>
}

export function useInventario() {
  const contexto = useContext(InventarioContext)
  if (!contexto) throw new Error('useInventario debe usarse dentro de InventarioProvider.')
  return contexto
}
