import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiltrosInventario } from '../components/inventario/FiltrosInventario.jsx'
import { TablaEquipos } from '../components/inventario/TablaEquipos.jsx'
import { Confirmacion } from '../components/ui/Modal.jsx'
import { Cargando, EstadoVacio, Paginacion } from '../components/ui/Piezas.jsx'
import { useInventario } from '../context/InventarioContext.jsx'
import { ALMACEN } from '../domain/catalogos.js'

/** Vista 2.1 — Inventario de equipos. */
export function InventarioLista() {
  const { lista, filtros, cargando, error, resumen, cambiarFiltros, limpiarFiltros, eliminarEquipo } =
    useInventario()
  const [porEliminar, setPorEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const hayFiltros =
    filtros.categoria !== 'todas' || filtros.estado !== 'todos' || filtros.texto.trim() !== ''

  async function confirmarEliminacion() {
    setEliminando(true)
    const resultado = await eliminarEquipo(porEliminar.id, porEliminar.nombre)
    setEliminando(false)
    if (resultado.ok) setPorEliminar(null)
  }

  return (
    <div>
      <div className="cabecera-vista">
        <div>
          <h1>Inventario de equipos</h1>
          <p className="sub">
            {resumen
              ? `${resumen.equipos} ${resumen.equipos === 1 ? 'modelo' : 'modelos'} · ${resumen.unidades} ${
                  resumen.unidades === 1 ? 'unidad registrada' : 'unidades registradas'
                } en el ${ALMACEN.nombre}`
              : 'Cargando el resumen del almacén…'}
          </p>
        </div>
        <Link to="/inventario/nuevo" className="boton">
          Nuevo equipo
        </Link>
      </div>

      <FiltrosInventario filtros={filtros} alCambiar={cambiarFiltros} />

      <section className="panel" aria-label="Equipos registrados">
        {error ? (
          <div style={{ padding: '1.5rem' }}>
            <div className="aviso aviso--error">{error}</div>
          </div>
        ) : cargando ? (
          <Cargando filas={6} etiqueta="Cargando el inventario…" />
        ) : lista.equipos.length === 0 ? (
          hayFiltros ? (
            <EstadoVacio
              marca="□"
              titulo="Ningún equipo coincide con estos filtros"
              descripcion="Prueba con otra categoría o con otro código de inventario."
            >
              <button type="button" className="boton boton--contorno" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            </EstadoVacio>
          ) : (
            <EstadoVacio
              titulo="Todavía no hay equipos registrados"
              descripcion="Registra el primer modelo de equipo para empezar a inventariar sus unidades."
            >
              <Link to="/inventario/nuevo" className="boton">
                Nuevo equipo
              </Link>
            </EstadoVacio>
          )
        ) : (
          <>
            <TablaEquipos equipos={lista.equipos} alEliminar={setPorEliminar} />
            <div className="tabla-pie">
              <span>
                Mostrando {lista.desde} a {lista.hasta} de {lista.total}{' '}
                {lista.total === 1 ? 'equipo' : 'equipos'}
                {hayFiltros && lista.totalEquipos !== lista.total && ` (de ${lista.totalEquipos} en total)`}
              </span>
              <Paginacion
                pagina={lista.pagina}
                totalPaginas={lista.totalPaginas}
                alCambiar={(pagina) => cambiarFiltros({ pagina })}
              />
            </div>
          </>
        )}
      </section>

      {porEliminar && (
        <Confirmacion
          titulo="Eliminar equipo"
          mensaje={`Se eliminará "${porEliminar.nombre}" y sus ${porEliminar.totalUnidades} ${
            porEliminar.totalUnidades === 1 ? 'unidad registrada' : 'unidades registradas'
          }. Esta acción no se puede deshacer.`}
          detalle={
            porEliminar.unidadesPorEstado.prestada > 0
              ? `Hay ${porEliminar.unidadesPorEstado.prestada} unidad(es) prestada(s): el sistema no permitirá eliminar el equipo hasta que se registre la devolución.`
              : null
          }
          textoConfirmar="Eliminar equipo"
          trabajando={eliminando}
          alConfirmar={confirmarEliminacion}
          alCerrar={() => setPorEliminar(null)}
        />
      )}
    </div>
  )
}
