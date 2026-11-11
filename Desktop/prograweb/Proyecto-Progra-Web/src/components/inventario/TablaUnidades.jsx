import { Pastilla } from '../ui/Piezas.jsx'

/** Unidades del equipo (vista 2.3). */
export function TablaUnidades({ unidades, alCambiarEstado, alEditar, alEliminar }) {
  return (
    <div className="tabla-marco">
      <table className="tabla">
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Ubicación</th>
            <th scope="col">Estado</th>
            <th scope="col">Observaciones</th>
            <th scope="col">Préstamo vigente</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {unidades.map((unidad) => (
            <tr key={unidad.id}>
              <td className="codigo">{unidad.codigoInventario}</td>
              <td className="medio sm">{unidad.ubicacion}</td>
              <td>
                <Pastilla estado={unidad.estado} />
              </td>
              <td className="medio sm">
                {unidad.observaciones || <span className="vacio-celda">—</span>}
              </td>
              <td className="codigo sm">
                {unidad.prestamoVigente ? (
                  <span style={{ color: 'var(--prestada)' }}>{unidad.prestamoVigente}</span>
                ) : (
                  <span className="vacio-celda">—</span>
                )}
              </td>
              <td>
                <span className="acciones-fila">
                  <button type="button" className="accion" onClick={() => alCambiarEstado(unidad)}>
                    Cambiar estado
                  </button>
                  ·
                  <button type="button" className="accion" onClick={() => alEditar(unidad)}>
                    Editar
                  </button>
                  ·
                  <button
                    type="button"
                    className="accion accion--peligro"
                    onClick={() => alEliminar(unidad)}
                  >
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
