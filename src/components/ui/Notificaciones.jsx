import { useNotificacion } from '../../context/NotificacionContext.jsx'

/** Pila de notificaciones de resultado de las operaciones de escritura. */
export function Notificaciones() {
  const { avisos, cerrar } = useNotificacion()
  if (avisos.length === 0) return null

  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map((aviso) => (
        <div key={aviso.id} className={`notificacion notificacion--${aviso.tipo}`}>
          <p>{aviso.mensaje}</p>
          <button type="button" onClick={() => cerrar(aviso.id)} aria-label="Cerrar notificación">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
