import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/** Diálogo modal: cierra con Escape, atrapa el foco y bloquea el desplazamiento. */
export function Modal({ titulo, subtitulo, alCerrar, children, ancho }) {
  const caja = useRef(null)

  useEffect(() => {
    const anterior = document.activeElement
    const alTeclear = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        alCerrar()
        return
      }
      if (e.key !== 'Tab' || !caja.current) return
      const focuseables = caja.current.querySelectorAll(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )
      if (focuseables.length === 0) return
      const primero = focuseables[0]
      const ultimo = focuseables[focuseables.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alTeclear)
    const desbordeAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    caja.current?.querySelector('input, select, textarea, button')?.focus()

    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = desbordeAnterior
      anterior?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div className="telon" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div
        className="modal"
        style={ancho ? { width: `min(100%, ${ancho})` } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        ref={caja}
      >
        <div className="modal-cuerpo">
          <h2 className="modal-titulo">{titulo}</h2>
          {subtitulo && <p className="modal-sub">{subtitulo}</p>}
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Confirmación para toda acción destructiva. */
export function Confirmacion({
  titulo,
  mensaje,
  detalle,
  textoConfirmar = 'Eliminar',
  trabajando = false,
  alConfirmar,
  alCerrar,
}) {
  return (
    <Modal titulo={titulo} alCerrar={alCerrar} ancho="460px">
      <p className="prosa" style={{ marginTop: '0.5rem' }}>
        {mensaje}
      </p>
      {detalle && (
        <div className="aviso aviso--atencion" style={{ marginTop: '1rem' }}>
          {detalle}
        </div>
      )}
      <div className="modal-acciones">
        <button type="button" className="boton boton--neutro" onClick={alCerrar} disabled={trabajando}>
          Cancelar
        </button>
        <button type="button" className="boton boton--peligro" onClick={alConfirmar} disabled={trabajando}>
          {trabajando ? 'Eliminando…' : textoConfirmar}
        </button>
      </div>
    </Modal>
  )
}
