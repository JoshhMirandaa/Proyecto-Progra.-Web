import { useState } from 'react'
import { CATEGORIAS } from '../../domain/catalogos.js'
import { OPCIONES_DISPONIBILIDAD, OPCIONES_DURACION } from '../../domain/solicitudes.js'

/**
 * Panel de filtros del catálogo (vista 3.1). Los cambios se preparan aquí y recién se
 * aplican con «Aplicar filtros», como en el mockup. El padre lo vuelve a montar (key)
 * cuando los filtros aplicados cambian desde fuera, por ejemplo al quitar una etiqueta.
 */
export function FiltrosCatalogo({ filtros, conteoCategorias = {}, alAplicar, alLimpiar }) {
  // En pantallas angostas el panel empieza plegado para que los equipos se vean primero.
  const [abierto, setAbierto] = useState(false)
  const activos =
    filtros.categorias.length +
    (filtros.disponibilidad !== 'todas' ? 1 : 0) +
    (filtros.duracion !== 'todas' ? 1 : 0)
  const [borrador, setBorrador] = useState({
    categorias: filtros.categorias,
    disponibilidad: filtros.disponibilidad,
    duracion: filtros.duracion,
  })

  const alternarCategoria = (valor) =>
    setBorrador((b) => ({
      ...b,
      categorias: b.categorias.includes(valor)
        ? b.categorias.filter((c) => c !== valor)
        : [...b.categorias, valor],
    }))

  return (
    <aside
      className={`panel filtros-catalogo${abierto ? ' filtros-catalogo--abierto' : ''}`}
      aria-label="Filtros del catálogo"
    >
      <button
        type="button"
        className="filtros-alternar"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
      >
        <span>
          Filtros
          {activos > 0 && <span className="suave"> · {activos} activos</span>}
        </span>
        <span aria-hidden="true">{abierto ? '▴' : '▾'}</span>
      </button>
      <form
        className="panel-cuerpo"
        onSubmit={(e) => {
          e.preventDefault()
          alAplicar(borrador)
        }}
      >
        <h2 className="filtros-titulo">Filtros</h2>

        <fieldset className="filtros-grupo">
          <legend className="rotulo">Categoría</legend>
          {CATEGORIAS.map((c) => (
            <label key={c.valor} className="opcion">
              <input
                type="checkbox"
                checked={borrador.categorias.includes(c.valor)}
                onChange={() => alternarCategoria(c.valor)}
              />
              <span>
                {c.etiqueta} <span className="suave">({conteoCategorias[c.valor] ?? 0})</span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="filtros-grupo">
          <legend className="rotulo">Disponibilidad</legend>
          {OPCIONES_DISPONIBILIDAD.map((o) => (
            <label key={o.valor} className="opcion">
              <input
                type="radio"
                name="disponibilidad"
                checked={borrador.disponibilidad === o.valor}
                onChange={() => setBorrador((b) => ({ ...b, disponibilidad: o.valor }))}
              />
              <span>{o.etiqueta}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="filtros-grupo">
          <legend className="rotulo">Duración máxima</legend>
          {OPCIONES_DURACION.map((o) => (
            <label key={o.valor} className="opcion">
              <input
                type="radio"
                name="duracion"
                checked={borrador.duracion === o.valor}
                onChange={() => setBorrador((b) => ({ ...b, duracion: o.valor }))}
              />
              <span>{o.etiqueta}</span>
            </label>
          ))}
        </fieldset>

        <button type="submit" className="boton boton--bloque">
          Aplicar filtros
        </button>
        <button type="button" className="boton boton--texto filtros-limpiar" onClick={alLimpiar}>
          Limpiar todo
        </button>
      </form>
    </aside>
  )
}
