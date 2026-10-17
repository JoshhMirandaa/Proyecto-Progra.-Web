import { duracionDias, formatearFecha } from '../../domain/solicitudes.js'

/** Datos de la solicitud que el encargado revisa antes de aprobar, rechazar o entregar. */
export function ResumenSolicitud({ solicitud: s }) {
  const dias = duracionDias(s.fechaInicio, s.fechaFin)
  return (
    <dl className="detalle-solicitud resumen-solicitud">
      <dt>Estudiante</dt>
      <dd>
        {s.estudianteNombre}
        {s.estudianteDetalle && <span className="suave"> · {s.estudianteDetalle}</span>}
      </dd>

      <dt>Equipo</dt>
      <dd>
        {s.equipoNombre}
        {s.equipoMarcaModelo && <span className="suave"> · {s.equipoMarcaModelo}</span>}
      </dd>

      <dt>Fechas</dt>
      <dd className="codigo">
        {formatearFecha(s.fechaInicio)} → {formatearFecha(s.fechaFin)}
        <span className="suave">
          {' '}
          · {dias} {dias === 1 ? 'día' : 'días'}
        </span>
      </dd>

      <dt>Curso</dt>
      <dd>
        {s.cursoNombre}
        {s.cursoDocente && <span className="suave"> · {s.cursoDocente}</span>}
      </dd>

      <dt>Motivo</dt>
      <dd className="prosa">{s.motivo}</dd>
    </dl>
  )
}
