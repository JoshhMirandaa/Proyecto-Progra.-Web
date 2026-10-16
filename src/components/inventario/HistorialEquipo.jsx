import { etiquetaEstado } from '../../domain/catalogos.js'
import { EstadoVacio, Pastilla } from '../ui/Piezas.jsx'

const formato = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Historial de cambios de estado de todas las unidades del equipo. */
export function HistorialEquipo({ unidades, usuarios }) {
  const eventos = unidades
    .flatMap((unidad) =>
      unidad.historialEstados.map((evento) => ({ ...evento, codigo: unidad.codigoInventario })),
    )
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  if (eventos.length === 0) {
    return (
      <section className="panel">
        <EstadoVacio
          marca="□"
          titulo="Todavía no hay movimientos"
          descripcion="El historial registra el alta de cada unidad y sus cambios de estado."
        />
      </section>
    )
  }

  const nombreDe = (id) => {
    const usuario = usuarios?.find((u) => u.id === id)
    return usuario ? `${usuario.nombres} ${usuario.apellidos}` : id
  }

  return (
    <section className="panel">
      <div className="panel-cuerpo">
        <ul className="historial">
          {eventos.map((evento, i) => (
            <li key={`${evento.codigo}-${evento.fecha}-${i}`}>
              <div>
                <p className="historial-fecha">{formato.format(new Date(evento.fecha))}</p>
                <p className="codigo sm">{evento.codigo}</p>
              </div>
              <div>
                <div className="historial-transicion">
                  {evento.de ? (
                    <>
                      <Pastilla estado={evento.de} />
                      <span className="suave" aria-label="cambia a">
                        →
                      </span>
                    </>
                  ) : (
                    <span className="distintivo">Alta</span>
                  )}
                  <Pastilla estado={evento.a} />
                </div>
                <p className="sm medio">{evento.motivo}</p>
                <p className="sm suave">
                  Registrado por {nombreDe(evento.usuarioId)}
                  {!evento.de && ` como ${etiquetaEstado(evento.a).toLowerCase()}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
