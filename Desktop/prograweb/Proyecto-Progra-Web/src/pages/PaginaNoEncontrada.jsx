import { Link } from 'react-router-dom'

/** Vista 1.7 — Página no encontrada (404), para cualquier rol. */
export function PaginaNoEncontrada() {
  return (
    <section className="pagina-error">
      <div className="pagina-error-marca" aria-hidden="true">
        ?
      </div>
      <p className="rotulo">Error 404 · Página no encontrada</p>
      <h1>No encontramos esta página</h1>
      <p className="prosa">
        El enlace pudo cambiar o la ficha del equipo ya no está publicada en el catálogo.
      </p>
      <div className="fila-centro">
        <Link to="/" className="boton">
          Ir al inicio
        </Link>
        <Link to="/catalogo" className="boton boton--contorno">
          Buscar un equipo
        </Link>
      </div>
    </section>
  )
}
