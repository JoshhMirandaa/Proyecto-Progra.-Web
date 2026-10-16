import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { HistorialEquipo } from '../components/inventario/HistorialEquipo.jsx'
import { ModalCambioEstado } from '../components/inventario/ModalCambioEstado.jsx'
import { ModalUnidad } from '../components/inventario/ModalUnidad.jsx'
import { PanelCondiciones } from '../components/inventario/PanelCondiciones.jsx'
import { TablaUnidades } from '../components/inventario/TablaUnidades.jsx'
import { Confirmacion } from '../components/ui/Modal.jsx'
import { Cargando, EstadoVacio, Miniatura } from '../components/ui/Piezas.jsx'
import { useInventario } from '../context/InventarioContext.jsx'
import { ALMACEN, etiquetaCategoria } from '../domain/catalogos.js'
import { useEquipo } from '../hooks/useEquipo.js'
import semilla from '../data/seed-inventario.json'

const PESTANAS = [
  { id: 'unidades', etiqueta: 'Unidades' },
  { id: 'condiciones', etiqueta: 'Condiciones del préstamo' },
  { id: 'historial', etiqueta: 'Historial' },
]

/** Vista 2.3 — Unidades del equipo, con las pestañas 2.5 (condiciones) e historial. */
export function EquipoDetalle() {
  const { equipoId } = useParams()
  const [parametros, setParametros] = useSearchParams()
  const { equipo, unidades, cargando, error } = useEquipo(equipoId)
  const {
    crearUnidad,
    actualizarUnidad,
    eliminarUnidad,
    cambiarEstadoUnidad,
    guardarCondiciones,
    listarCodigosOcupados,
  } = useInventario()

  const [codigos, setCodigos] = useState([])
  const [unidadEnForm, setUnidadEnForm] = useState(null) // { unidad } | { unidad: null } para alta
  const [unidadEnEstado, setUnidadEnEstado] = useState(null)
  const [unidadPorEliminar, setUnidadPorEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const pestana = parametros.get('pestana') ?? 'unidades'

  useEffect(() => {
    let vigente = true
    listarCodigosOcupados().then((c) => vigente && setCodigos(c))
    return () => {
      vigente = false
    }
  }, [listarCodigosOcupados, unidades.length])

  if (error) {
    return (
      <div className="panel panel-cuerpo">
        <div className="aviso aviso--error">{error}</div>
        <p style={{ marginTop: '1rem' }}>
          <Link to="/inventario">Volver al inventario</Link>
        </p>
      </div>
    )
  }

  if (cargando && !equipo) {
    return (
      <div className="panel">
        <Cargando filas={7} etiqueta="Cargando el equipo…" />
      </div>
    )
  }

  async function confirmarEliminacionUnidad() {
    setEliminando(true)
    const resultado = await eliminarUnidad(unidadPorEliminar.id, unidadPorEliminar.codigoInventario)
    setEliminando(false)
    if (resultado.ok) setUnidadPorEliminar(null)
  }

  return (
    <div>
      <nav className="migas" aria-label="Ruta">
        <Link to="/inventario">Inventario</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/inventario?categoria=${equipo.categoria}`}>{etiquetaCategoria(equipo.categoria)}</Link>
        <span aria-hidden="true">/</span>
        <span>{equipo.nombre}</span>
      </nav>

      <div className="cabecera-vista">
        <div className="cabecera-equipo">
          <Miniatura fotografia={equipo.fotografias?.[0]} nombre={equipo.nombre} grande />
          <div>
            <h1>{equipo.nombre}</h1>
            <p className="sub">
              {equipo.marca} · {equipo.modelo} · {equipo.totalUnidades}{' '}
              {equipo.totalUnidades === 1 ? 'unidad registrada' : 'unidades registradas'} ·{' '}
              {ALMACEN.nombre}
            </p>
            {equipo.esBorrador && (
              <p style={{ marginTop: '0.5rem' }}>
                <span className="distintivo distintivo--borrador">Borrador</span>{' '}
                <span className="sm suave">No aparece en el catálogo del estudiante.</span>
              </p>
            )}
          </div>
        </div>

        <div className="fila-fin">
          {equipo.esPublicable && (
            <Link to={`/catalogo/${equipo.id}`} className="boton boton--texto">
              Ver ficha pública
            </Link>
          )}
          <Link to={`/inventario/${equipo.id}/editar`} className="boton boton--contorno">
            Editar equipo
          </Link>
          <button type="button" className="boton" onClick={() => setUnidadEnForm({ unidad: null })}>
            Nueva unidad
          </button>
        </div>
      </div>

      <div className="pestanas" role="tablist">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setParametros(p.id === 'unidades' ? {} : { pestana: p.id })}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'unidades' && (
        <section className="panel" aria-label="Unidades del equipo">
          {unidades.length === 0 ? (
            <EstadoVacio
              titulo="Este equipo aún no tiene unidades"
              descripcion="Registra al menos una unidad con su código de inventario para que aparezca en el catálogo."
            >
              <button type="button" className="boton" onClick={() => setUnidadEnForm({ unidad: null })}>
                Registrar la primera unidad
              </button>
            </EstadoVacio>
          ) : (
            <>
              <TablaUnidades
                unidades={unidades}
                alCambiarEstado={setUnidadEnEstado}
                alEditar={(unidad) => setUnidadEnForm({ unidad })}
                alEliminar={setUnidadPorEliminar}
              />
              <div className="tabla-pie">
                <span>
                  {equipo.unidadesDisponibles} de {equipo.totalUnidades}{' '}
                  {equipo.totalUnidades === 1 ? 'unidad disponible' : 'unidades disponibles'}
                </span>
                {!equipo.esPublicable && (
                  <span className="suave">
                    Sin unidades activas: el equipo no se lista en el catálogo.
                  </span>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {pestana === 'condiciones' && (
        <PanelCondiciones
          key={equipo.actualizadoEn}
          equipo={equipo}
          alGuardar={(condiciones) => guardarCondiciones(equipo.id, condiciones)}
        />
      )}

      {pestana === 'historial' && (
        <HistorialEquipo unidades={unidades} usuarios={semilla.usuarios} />
      )}

      {unidadEnForm && (
        <ModalUnidad
          unidad={unidadEnForm.unidad}
          codigosOcupados={codigos}
          alCerrar={() => setUnidadEnForm(null)}
          alGuardar={(datos) =>
            unidadEnForm.unidad
              ? actualizarUnidad(unidadEnForm.unidad.id, datos)
              : crearUnidad(equipo.id, datos)
          }
        />
      )}

      {unidadEnEstado && (
        <ModalCambioEstado
          unidad={unidadEnEstado}
          equipo={equipo}
          alCerrar={() => setUnidadEnEstado(null)}
          alGuardar={(datos) => cambiarEstadoUnidad(unidadEnEstado.id, datos)}
        />
      )}

      {unidadPorEliminar && (
        <Confirmacion
          titulo="Eliminar unidad"
          mensaje={`Se eliminará la unidad ${unidadPorEliminar.codigoInventario} y su historial de estados. Esta acción no se puede deshacer.`}
          detalle={
            unidadPorEliminar.estado === 'prestada'
              ? 'La unidad está prestada: el sistema no permitirá eliminarla hasta que se registre la devolución.'
              : unidadPorEliminar.estado === 'baja'
                ? 'Las unidades dadas de baja suelen conservarse como registro histórico. Elimínala solo si se registró por error.'
                : null
          }
          textoConfirmar="Eliminar unidad"
          trabajando={eliminando}
          alConfirmar={confirmarEliminacionUnidad}
          alCerrar={() => setUnidadPorEliminar(null)}
        />
      )}
    </div>
  )
}
