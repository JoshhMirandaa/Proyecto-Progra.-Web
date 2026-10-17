import { Link } from 'react-router-dom'
import { etiquetaCategoria } from '../../domain/catalogos.js'
import { Miniatura } from '../ui/Piezas.jsx'

/** Tarjeta de equipo del catálogo: foto, nombre, marca y modelo, categoría y unidades libres. */
export function TarjetaEquipo({ equipo }) {
  const libres = equipo.unidadesDisponibles
  return (
    <Link to={`/catalogo/${equipo.id}`} className="tarjeta-equipo">
      <Miniatura fotografia={equipo.fotografia} nombre={equipo.nombre} className="tarjeta-foto" />
      <div className="tarjeta-cuerpo">
        <p className="tarjeta-nombre">{equipo.nombre}</p>
        <p className="sm suave">
          {equipo.marca} · {equipo.modelo}
        </p>
        <div className="tarjeta-pie">
          <span className="etiqueta-categoria">{etiquetaCategoria(equipo.categoria)}</span>
          <span className={`tarjeta-libres${libres === 0 ? ' tarjeta-libres--agotado' : ''}`}>
            {libres} / {equipo.unidadesActivas} libres
          </span>
        </div>
      </div>
    </Link>
  )
}

/** Tarjetas vacías mientras carga el catálogo (mockup 3.1, estado «cargando»). */
export function TarjetasCargando({ cantidad = 8 }) {
  return (
    <div className="rejilla-catalogo" role="status" aria-live="polite">
      <span className="oculto-visual">Cargando equipos…</span>
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="tarjeta-equipo tarjeta-equipo--cargando" aria-hidden="true">
          <div className="tarjeta-foto barra-carga" />
          <div className="tarjeta-cuerpo">
            <div className="barra-carga" style={{ width: '80%' }} />
            <div className="barra-carga" style={{ width: '55%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
