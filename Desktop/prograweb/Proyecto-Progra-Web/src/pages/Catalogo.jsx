import { FiltrosCatalogo } from '../components/catalogo/FiltrosCatalogo.jsx'
import { TarjetaEquipo, TarjetasCargando } from '../components/catalogo/TarjetaEquipo.jsx'
import { EstadoVacio, Paginacion } from '../components/ui/Piezas.jsx'
import { etiquetaCategoria } from '../domain/catalogos.js'
import { OPCIONES_DURACION, ORDENES_CATALOGO } from '../domain/solicitudes.js'
import { useFiltrosCatalogo } from '../hooks/useFiltrosCatalogo.js'
import { useListaCatalogo } from '../hooks/useListaCatalogo.js'

/** Resumen bajo el título: «9 equipos con unidades libres y préstamo de hasta 7 días». */
function resumen(total, filtros) {
  let texto = `${total} ${total === 1 ? 'equipo' : 'equipos'}`
  const libres = filtros.disponibilidad === 'libres'
  if (libres) texto += ' con unidades libres'
  if (filtros.duracion !== 'todas')
    texto += `${libres ? ' y' : ' con'} préstamo de hasta ${filtros.duracion} días`
  if (filtros.categorias.length)
    texto += ` en ${filtros.categorias.map((c) => etiquetaCategoria(c).toLowerCase()).join(', ')}`
  if (filtros.texto) texto += ` que coinciden con «${filtros.texto}»`
  if (texto === `${total} ${total === 1 ? 'equipo' : 'equipos'}`) texto += ' en el catálogo'
  return texto
}

/** Vista 3.1 — Catálogo de equipos. */
export function Catalogo() {
  const { filtros, cambiarFiltros, limpiarFiltros, hayFiltros } = useFiltrosCatalogo()
  const { datos, cargando, error } = useListaCatalogo(filtros)

  const etiquetas = [
    ...filtros.categorias.map((c) => ({
      clave: `cat-${c}`,
      texto: `Categoría: ${etiquetaCategoria(c).toLowerCase()}`,
      quitar: () => cambiarFiltros({ categorias: filtros.categorias.filter((x) => x !== c) }),
    })),
    filtros.disponibilidad === 'libres' && {
      clave: 'disp',
      texto: 'Con unidades libres',
      quitar: () => cambiarFiltros({ disponibilidad: 'todas' }),
    },
    filtros.duracion !== 'todas' && {
      clave: 'dur',
      texto: OPCIONES_DURACION.find((o) => o.valor === filtros.duracion)?.etiqueta,
      quitar: () => cambiarFiltros({ duracion: 'todas' }),
    },
    filtros.texto && {
      clave: 'q',
      texto: `Búsqueda: «${filtros.texto}»`,
      quitar: () => cambiarFiltros({ texto: '' }),
    },
  ].filter(Boolean)

  return (
    <div className="catalogo">
      <FiltrosCatalogo
        key={`${filtros.categorias.join(',')}|${filtros.disponibilidad}|${filtros.duracion}`}
        filtros={filtros}
        conteoCategorias={datos?.conteoCategorias}
        alAplicar={(cambios) => cambiarFiltros(cambios)}
        alLimpiar={limpiarFiltros}
      />

      <section className="catalogo-resultados" aria-label="Equipos del catálogo">
        <div className="cabecera-vista">
          <div>
            <h1>Catálogo de equipos</h1>
            <p className="sub">{datos ? resumen(datos.total, filtros) : 'Buscando equipos…'}</p>
          </div>
          <label className="orden-catalogo">
            <span className="oculto-visual">Ordenar el catálogo</span>
            <select
              className="entrada"
              value={filtros.orden}
              onChange={(e) => cambiarFiltros({ orden: e.target.value })}
            >
              {ORDENES_CATALOGO.map((o) => (
                <option key={o.valor} value={o.valor}>
                  Ordenar: {o.etiqueta}
                </option>
              ))}
            </select>
          </label>
        </div>

        {etiquetas.length > 0 && (
          <div className="etiquetas-filtro">
            {etiquetas.map((e) => (
              <button key={e.clave} type="button" className="etiqueta-filtro" onClick={e.quitar}>
                {e.texto} <span aria-label="Quitar filtro">✕</span>
              </button>
            ))}
            <button type="button" className="boton boton--texto" onClick={limpiarFiltros}>
              Limpiar todo
            </button>
          </div>
        )}

        {error ? (
          <div className="aviso aviso--error">{error}</div>
        ) : cargando && !datos ? (
          <TarjetasCargando />
        ) : datos.equipos.length === 0 ? (
          <div className="panel">
            {hayFiltros ? (
              <EstadoVacio
                marca="?"
                titulo="Ningún equipo coincide con estos filtros"
                descripcion="Prueba ampliando la duración máxima o revisa otra categoría."
              >
                <button type="button" className="boton boton--contorno" onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              </EstadoVacio>
            ) : (
              <EstadoVacio
                marca="□"
                titulo="Todavía no hay equipos en el catálogo"
                descripcion="El almacén aún no publica equipos con unidades activas."
              />
            )}
          </div>
        ) : (
          <>
            <div className={`rejilla-catalogo${cargando ? ' rejilla-catalogo--actualizando' : ''}`}>
              {datos.equipos.map((equipo) => (
                <TarjetaEquipo key={equipo.id} equipo={equipo} />
              ))}
            </div>
            <div className="catalogo-pie">
              <span>
                Mostrando {datos.desde} a {datos.hasta} de {datos.total}{' '}
                {datos.total === 1 ? 'equipo' : 'equipos'}
              </span>
              <Paginacion
                pagina={datos.pagina}
                totalPaginas={datos.totalPaginas}
                alCambiar={(pagina) => cambiarFiltros({ pagina })}
              />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
