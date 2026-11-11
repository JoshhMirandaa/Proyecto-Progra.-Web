import { useEffect, useState } from 'react'
import { useDevoluciones } from '../../context/DevolucionesContext.jsx'
import { formatearFecha, sumarDias } from '../../domain/solicitudes.js'
import { Campo, atributosControl } from '../ui/Campo.jsx'
import { Modal } from '../ui/Modal.jsx'
import { Cargando } from '../ui/Piezas.jsx'

/**
 * Vista 5.3 — Renovar un préstamo vigente. Muestra si es posible o por qué no
 * (no admite renovación, lista de espera, unidad comprometida o préstamo vencido).
 */
export function ModalRenovacion({ codigo, alCerrar, alRenovar }) {
  const { consultarRenovacion, renovarPrestamo } = useDevoluciones()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [dias, setDias] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vigente = true
    consultarRenovacion(codigo)
      .then((d) => {
        if (!vigente) return
        setDatos(d)
        setDias(String(d.diasMaximos || ''))
      })
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [codigo, consultarRenovacion])

  const n = Number(dias)
  const errorDias =
    datos?.posible && (!Number.isInteger(n) || n < 1 || n > datos.diasMaximos)
      ? `Indica entre 1 y ${datos.diasMaximos} días.`
      : null

  const renovar = async (e) => {
    e.preventDefault()
    if (errorDias) return
    setEnviando(true)
    const r = await renovarPrestamo(codigo, { dias: n })
    setEnviando(false)
    if (r.ok) {
      alRenovar?.(r.datos)
      alCerrar()
    }
  }

  return (
    <Modal titulo="Renovar préstamo" subtitulo={codigo} alCerrar={alCerrar} ancho="540px">
      {error ? (
        <div className="aviso aviso--error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      ) : !datos ? (
        <Cargando filas={3} etiqueta="Revisando si se puede renovar…" />
      ) : (
        <form noValidate onSubmit={renovar} style={{ marginTop: '1rem' }}>
          <dl className="detalle-solicitud">
            <dt>Estudiante</dt>
            <dd>{datos.solicitud.estudianteNombre}</dd>
            <dt>Equipo</dt>
            <dd>
              {datos.solicitud.equipoNombre} ·{' '}
              <span className="codigo">{datos.solicitud.codigoUnidad}</span>
            </dd>
            <dt>Devolución actual</dt>
            <dd className="codigo">{formatearFecha(datos.solicitud.fechaFin)}</dd>
          </dl>

          {datos.posible ? (
            <>
              <div className="aviso aviso--info" style={{ marginTop: '1rem' }}>
                Se puede renovar: el equipo lo admite, nadie está en lista de espera y la unidad
                sigue libre. Hasta {datos.diasMaximos} {datos.diasMaximos === 1 ? 'día' : 'días'}{' '}
                más.
              </div>
              <div style={{ marginTop: '1rem' }}>
                <Campo
                  id="dias-renovacion"
                  rotulo="Días que se extiende"
                  error={errorDias}
                  ayuda={
                    errorDias
                      ? undefined
                      : `Nueva devolución: ${formatearFecha(sumarDias(datos.solicitud.fechaFin, n || 0))}`
                  }
                >
                  <input
                    type="number"
                    min={1}
                    max={datos.diasMaximos}
                    {...atributosControl('dias-renovacion', {
                      error: errorDias,
                      ayuda: true,
                      mono: true,
                    })}
                    value={dias}
                    onChange={(e) => setDias(e.target.value)}
                  />
                </Campo>
              </div>
            </>
          ) : (
            <div className="aviso aviso--error" style={{ marginTop: '1rem' }}>
              <strong>No se puede renovar.</strong> {datos.motivo}
            </div>
          )}

          <div className="modal-acciones">
            <button
              type="button"
              className="boton boton--neutro"
              onClick={alCerrar}
              disabled={enviando}
            >
              {datos.posible ? 'Cancelar' : 'Cerrar'}
            </button>
            {datos.posible && (
              <button type="submit" className="boton" disabled={enviando}>
                {enviando ? 'Renovando…' : 'Renovar préstamo'}
              </button>
            )}
          </div>
        </form>
      )}
    </Modal>
  )
}
