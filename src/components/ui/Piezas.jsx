import { useState } from 'react'
import { etiquetaEstado } from '../../domain/catalogos.js'
import { clases } from './Campo.jsx'

/** Pastilla de estado de una unidad. */
export function Pastilla({ estado }) {
  return (
    <span className="pastilla" data-estado={estado}>
      {etiquetaEstado(estado)}
    </span>
  )
}

/** Imagen de equipo con respaldo cuando no hay fotografía o no carga. */
export function Miniatura({ fotografia, nombre, grande = false, className }) {
  const [falla, setFalla] = useState(false)
  const clase = clases('miniatura', grande && 'miniatura--grande', className)

  if (!fotografia || falla) {
    return <div className={clases(clase, 'miniatura--vacia')} role="presentation" />
  }
  return (
    <img
      className={clase}
      src={fotografia.url}
      alt={fotografia.alt || `Fotografía de ${nombre}`}
      onError={() => setFalla(true)}
      loading="lazy"
    />
  )
}

/** Imagen con respaldo cuando la dirección no carga. */
export function ImagenConRespaldo({ src, alt, className }) {
  const [falla, setFalla] = useState(false)
  if (!src || falla) {
    return <div className={clases(className, 'miniatura--vacia')} role="presentation" />
  }
  return <img className={className} src={src} alt={alt} onError={() => setFalla(true)} />
}

/** Estado vacío: toda vista que pueda quedar sin datos usa este componente. */
export function EstadoVacio({ titulo, descripcion, marca = '+', children }) {
  return (
    <div className="vacio">
      <div className="vacio-marca" aria-hidden="true">
        {marca}
      </div>
      <p className="vacio-titulo">{titulo}</p>
      {descripcion && <p>{descripcion}</p>}
      {children}
    </div>
  )
}

/** Barras de carga mientras responde el servicio. */
export function Cargando({ filas = 4, etiqueta = 'Cargando…' }) {
  return (
    <div className="carga" role="status" aria-live="polite">
      <span className="oculto-visual">{etiqueta}</span>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="barra-carga" style={{ width: `${100 - i * 9}%` }} />
      ))}
    </div>
  )
}

export function Paginacion({ pagina, totalPaginas, alCambiar }) {
  if (totalPaginas <= 1) return null
  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1)

  return (
    <nav className="paginacion" aria-label="Paginación del inventario">
      <button type="button" onClick={() => alCambiar(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior">
        ‹
      </button>
      {paginas.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => alCambiar(n)}
          aria-current={n === pagina ? 'page' : undefined}
          aria-label={`Página ${n}`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={() => alCambiar(pagina + 1)}
        disabled={pagina === totalPaginas}
        aria-label="Página siguiente"
      >
        ›
      </button>
    </nav>
  )
}
