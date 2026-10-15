import { Link } from 'react-router-dom'
import { ESTADOS_UNIDAD, etiquetaCategoria, etiquetaCorta } from '../../domain/catalogos.js'
import { Miniatura } from '../ui/Piezas.jsx'

/** Recuento de unidades por estado: la lectura rápida de la salud del equipo. */
function Recuento({ porEstado }) {
  const partes = ESTADOS_UNIDAD.filter((e) => porEstado[e.valor] > 0)

  if (partes.length === 0) {
    return <span className="vacio-celda sm">Sin unidades</span>
  }

  return (
    <span className="recuento">
      {partes.map((e, i) => (
        <span key={e.valor}>
          {i > 0 && <span className="recuento-sep"> · </span>}
          <span className="recuento-dato" data-estado={e.valor}>
            {porEstado[e.valor]} {etiquetaCorta(e.valor, porEstado[e.valor])}
          </span>
        </span>
      ))}
    </span>
  )
}

export function TablaEquipos({ equipos, alEliminar }) {
  return (
    <div className="tabla-marco">
      <table className="tabla">
        <thead>
          <tr>
            <th scope="col">
              <span className="oculto-visual">Foto</span>
              Foto
            </th>
            <th scope="col">Equipo</th>
            <th scope="col">Marca y modelo</th>
            <th scope="col">Categoría</th>
            <th scope="col" className="sin-corte">
              Unidades por estado
            </th>
            <th scope="col" className="sin-corte">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {equipos.map((equipo) => (
            <tr key={equipo.id}>
              <td>
                <Miniatura fotografia={equipo.fotografias?.[0]} nombre={equipo.nombre} />
              </td>
              <td>
                <Link to={`/inventario/${equipo.id}`} className="tabla-nombre">
                  {equipo.nombre}
                </Link>
                {equipo.esBorrador && (
                  <>
                    {' '}
                    <span className="distintivo distintivo--borrador">Borrador</span>
                  </>
                )}
              </td>
              <td className="medio sm">
                {equipo.marca} · {equipo.modelo}
              </td>
              <td className="medio sm">{etiquetaCategoria(equipo.categoria)}</td>
              <td className="sin-corte">
                <Recuento porEstado={equipo.unidadesPorEstado} />
              </td>
              <td className="sin-corte">
                <span className="acciones-fila">
                  <Link className="accion" to={`/inventario/${equipo.id}`}>
                    Unidades
                  </Link>
                  ·
                  <Link className="accion" to={`/inventario/${equipo.id}?pestana=condiciones`}>
                    Condiciones
                  </Link>
                  ·
                  <Link className="accion" to={`/inventario/${equipo.id}/editar`}>
                    Editar
                  </Link>
                  ·
                  <button type="button" className="accion accion--peligro" onClick={() => alEliminar(equipo)}>
                    Eliminar
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
