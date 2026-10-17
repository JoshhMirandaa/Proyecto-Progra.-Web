import { LIMITES_PRESTAMO, MOTIVOS_RECHAZO, validarRechazo } from '../../domain/prestamos.js'
import { useFormulario } from '../../hooks/useFormulario.js'
import { usePrestamos } from '../../context/PrestamosContext.jsx'
import { Campo, atributosControl } from '../ui/Campo.jsx'
import { Modal } from '../ui/Modal.jsx'
import { ResumenSolicitud } from './ResumenSolicitud.jsx'

/**
 * Vista 4.3 — Rechazar con motivo. El texto queda guardado en la solicitud y el estudiante
 * lo ve en «Mis solicitudes» (HU-3). `inicial` permite llegar con una propuesta de fechas.
 */
export function ModalRechazo({ solicitud, inicial, alCerrar }) {
  const { rechazarSolicitud } = usePrestamos()
  const { valores, errorDe, ponerValor, tocar, enviar, enviando } = useFormulario({
    inicial: inicial ?? { motivo: '', detalle: '' },
    validar: validarRechazo,
  })
  const L = LIMITES_PRESTAMO.detalleRechazo
  const largo = valores.detalle.trim().length

  return (
    <Modal
      titulo="Rechazar solicitud"
      subtitulo={`Solicitud ${solicitud.id}`}
      alCerrar={alCerrar}
      ancho="620px"
    >
      <form
        noValidate
        onSubmit={enviar(async (v) => {
          const r = await rechazarSolicitud(solicitud.id, v)
          if (r.ok) alCerrar()
        })}
        style={{ marginTop: '1rem' }}
      >
        <ResumenSolicitud solicitud={solicitud} />

        <div style={{ marginTop: '1.25rem' }}>
          <Campo id="motivo-rechazo" rotulo="Motivo" error={errorDe('motivo')}>
            <select
              {...atributosControl('motivo-rechazo', { error: errorDe('motivo') })}
              value={valores.motivo}
              onChange={(e) => ponerValor('motivo', e.target.value)}
              onBlur={() => tocar('motivo')}
            >
              <option value="">Elige un motivo</option>
              {MOTIVOS_RECHAZO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            id="detalle-rechazo"
            rotulo="Explicación para el estudiante"
            error={errorDe('detalle')}
            ayuda={`${largo}/${L.max} · El estudiante verá este texto tal cual.`}
          >
            <textarea
              {...atributosControl('detalle-rechazo', {
                error: errorDe('detalle'),
                ayuda: true,
              })}
              rows={4}
              maxLength={L.max + 20}
              value={valores.detalle}
              onChange={(e) => ponerValor('detalle', e.target.value)}
              onBlur={() => tocar('detalle')}
              placeholder="Ej.: Las 3 unidades están asignadas esa semana. Puedes pedirlo del 09/11 al 13/11."
            />
          </Campo>
        </div>

        <div className="modal-acciones">
          <button
            type="button"
            className="boton boton--neutro"
            onClick={alCerrar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button type="submit" className="boton boton--peligro" disabled={enviando}>
            {enviando ? 'Rechazando…' : 'Rechazar solicitud'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
