import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import * as servicio from '../services/reservasService.js'
import { useNotificacion } from './NotificacionContext.jsx'
import { useSesion } from './SesionContext.jsx'

const ReservaContext = createContext(null)

export function ReservaProvider({ children }) {
  const [equipos, setEquipos] = useState([])
  const [reservas, setReservas] = useState([])
  const [reservasOcupacion, setReservasOcupacion] = useState([])
  const [listaEspera, setListaEspera] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const { aviso, error: notificarError, exito } = useNotificacion()
  const { usuario } = useSesion()

  const recargar = useCallback(async () => {
    const [listaEquipos, listaReservas, listaOcupacion, enEspera] = await Promise.all([
      servicio.listarEquiposReservables(),
      servicio.listarReservas(usuario.id),
      servicio.listarReservasOcupacion(),
      servicio.listarListaEspera(usuario.id),
    ])
    setEquipos(listaEquipos)
    setReservas(listaReservas)
    setReservasOcupacion(listaOcupacion)
    setListaEspera(enEspera)
    setError(null)
  }, [usuario.id])

  useEffect(() => {
    let vigente = true
    async function cargar() {
      setCargando(true)
      try {
        const convertidas = await servicio.convertirReservasProximas()
        if (convertidas.length)
          aviso(
            `${convertidas.length} reserva(s) próxima(s) se convirtió(eron) en solicitud de préstamo.`,
          )
        const [listaEquipos, listaReservas, listaOcupacion, enEspera] = await Promise.all([
          servicio.listarEquiposReservables(),
          servicio.listarReservas(usuario.id),
          servicio.listarReservasOcupacion(),
          servicio.listarListaEspera(usuario.id),
        ])
        if (vigente) {
          setEquipos(listaEquipos)
          setReservas(listaReservas)
          setReservasOcupacion(listaOcupacion)
          setListaEspera(enEspera)
          setError(null)
        }
      } catch (e) {
        if (vigente) {
          setError(e.message)
          notificarError(e.message)
        }
      } finally {
        if (vigente) setCargando(false)
      }
    }
    cargar()
    return () => {
      vigente = false
    }
  }, [aviso, notificarError, usuario.id])

  const escribir = useCallback(
    async (operacion, mensajeExito) => {
      try {
        const resultado = await operacion()
        await recargar()
        exito(
          typeof mensajeExito === 'function' ? mensajeExito(resultado) : mensajeExito,
        )
        return { ok: true, datos: resultado }
      } catch (e) {
        notificarError(e.message ?? 'No pudimos completar la operación.')
        return { ok: false, error: e.message }
      }
    },
    [exito, notificarError, recargar],
  )

  const valor = useMemo(
    () => ({
      equipos,
      reservas,
      reservasOcupacion,
      listaEspera,
      cargando,
      error,
      crearReserva: (datos) =>
        escribir(
          () => servicio.crearReserva({ ...datos, usuarioId: usuario.id }),
          ({ reserva, posicion }) =>
            reserva.estado === 'confirmada'
              ? 'Reserva confirmada.'
              : `El equipo no está libre en esas fechas. Quedaste en el puesto ${posicion} de la lista de espera.`,
        ),
      cancelarReserva: (id) =>
        escribir(
          () => servicio.cancelarReserva(id, usuario.id),
          ({ promovidas }) =>
            promovidas.length
              ? `Reserva cancelada. Se confirmó la siguiente reserva en espera (${promovidas.length}).`
              : 'Reserva cancelada.',
        ),
    }),
    [
      cargando,
      equipos,
      error,
      listaEspera,
      reservas,
      reservasOcupacion,
      usuario.id,
      escribir,
    ],
  )

  return <ReservaContext.Provider value={valor}>{children}</ReservaContext.Provider>
}

export function useReservas() {
  const contexto = useContext(ReservaContext)
  if (!contexto) throw new Error('useReservas debe usarse dentro de ReservaProvider.')
  return contexto
}
