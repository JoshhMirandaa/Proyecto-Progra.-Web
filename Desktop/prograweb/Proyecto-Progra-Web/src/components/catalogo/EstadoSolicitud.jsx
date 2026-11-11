import { etiquetaSolicitud } from '../../domain/solicitudes.js'

/** Etiqueta del estado de una solicitud: Enviada, Aprobada, Entregada, Devuelta… */
export function EstadoSolicitud({ estado }) {
  return (
    <span className="pastilla-solicitud" data-estado={estado}>
      {etiquetaSolicitud(estado)}
    </span>
  )
}
