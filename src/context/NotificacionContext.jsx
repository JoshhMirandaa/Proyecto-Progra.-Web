/**
 * Notificaciones de resultado.
 * Requerimiento no funcional: toda operación de escritura notifica su resultado.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const NotificacionContext = createContext(null)
const DURACION_MS = 4500

export function NotificacionProvider({ children }) {
  const [avisos, setAvisos] = useState([])
  const contador = useRef(0)

  const cerrar = useCallback((id) => {
    setAvisos((previos) => previos.filter((a) => a.id !== id))
  }, [])

  const notificar = useCallback(
    (tipo, mensaje) => {
      const id = ++contador.current
      setAvisos((previos) => [...previos, { id, tipo, mensaje }])
      setTimeout(() => cerrar(id), DURACION_MS)
      return id
    },
    [cerrar],
  )

  const exito = useCallback((mensaje) => notificar('exito', mensaje), [notificar])
  const error = useCallback((mensaje) => notificar('error', mensaje), [notificar])
  const aviso = useCallback((mensaje) => notificar('aviso', mensaje), [notificar])

  const valor = useMemo(
    () => ({ avisos, cerrar, exito, error, aviso }),
    [avisos, cerrar, exito, error, aviso],
  )

  return <NotificacionContext.Provider value={valor}>{children}</NotificacionContext.Provider>
}

export function useNotificacion() {
  const contexto = useContext(NotificacionContext)
  if (!contexto) throw new Error('useNotificacion debe usarse dentro de NotificacionProvider.')
  return contexto
}
