import { Link } from 'react-router-dom'
import { HORA_DEVOLUCION } from '../../domain/prestamos.js'
import { formatearFecha } from '../../domain/solicitudes.js'
import { Modal } from '../ui/Modal.jsx'
import { EstadoSolicitud } from './EstadoSolicitud.jsx'

const fechaHora = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Vista de detalle de una solicitud (desde «Mis solicitudes»). */
export function DetalleSolicitud({ solicitud, alCerrar, alRetirar }) {
  const s = solicitud
  return (
    <Modal
      titulo={s.equipoNombre}
      subtitulo={`Solicitud ${s.id} · enviada el ${fechaHora.format(new Date(s.creadaEn))}`}
      alCerrar={alCerrar}
      ancho="560px"
    >
      <dl className="detalle-solicitud">
        <dt>Estado</dt>
        <dd>
          <EstadoSolicitud estado={s.estado} />
        </dd>

        <dt>Fechas</dt>
        <dd className="codigo">
          {formatearFecha(s.fechaInicio)} → {formatearFecha(s.fechaFin)}
          <span className="suave">
            {' '}
            · {s.duracion} {s.duracion === 1 ? 'día' : 'días'}
          </span>
        </dd>

        <dt>Curso</dt>
        <dd>
          {s.cursoNombre}
          {s.cursoDocente && <span className="suave"> · {s.cursoDocente}</span>}
        </dd>

        <dt>Unidad asignada</dt>
        <dd className="codigo">
          {s.codigoUnidad ?? (s.estado === 'pendiente' ? 'Pendiente de asignar' : '—')}
        </dd>

        {s.codigoPrestamo && (
          <>
            <dt>Código de préstamo</dt>
            <dd className="codigo">{s.codigoPrestamo}</dd>
          </>
        )}

        <dt>Motivo</dt>
        <dd className="prosa">{s.motivo}</dd>

        {s.resueltaEn && (
          <>
            <dt>{s.estado === 'retirada' ? 'Retirada el' : 'Resuelta el'}</dt>
            <dd>{fechaHora.format(new Date(s.resueltaEn))}</dd>
          </>
        )}
      </dl>

      {s.estado === 'rechazada' && (
        <div className="aviso aviso--error" style={{ marginTop: '1rem' }}>
          <strong>Motivo del rechazo:</strong>{' '}
          {s.motivoRechazo || 'El encargado no registró un motivo.'}
        </div>
      )}
      {s.estado === 'en_prestamo' && (
        <div className="aviso aviso--info" style={{ marginTop: '1rem' }}>
          Devuelve el equipo el {formatearFecha(s.fechaFin)} antes de las {HORA_DEVOLUCION}. Tu
          constancia de entrega tiene el código {s.codigoPrestamo}.
        </div>
      )}

      <div className="modal-acciones">
        {s.retirable && (
          <button type="button" className="boton boton--peligro" onClick={() => alRetirar(s)}>
            Retirar solicitud
          </button>
        )}
        {s.codigoPrestamo && (
          <Link to={`/constancias/${s.codigoPrestamo}`} className="boton boton--contorno">
            Ver constancia
          </Link>
        )}
        <button type="button" className="boton boton--neutro" onClick={alCerrar}>
          Cerrar
        </button>
      </div>
    </Modal>
  )
}
