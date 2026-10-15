import { useState } from 'react'
import { LIMITES } from '../../domain/catalogos.js'

/** Accesorios incluidos con el equipo: se agregan y se quitan uno por uno. */
export function ListaAccesorios({ accesorios, alCambiar, error }) {
  const [borrador, setBorrador] = useState('')
  const lleno = accesorios.length >= LIMITES.accesorios.max

  function agregar() {
    const valor = borrador.trim()
    if (!valor || lleno) return
    if (accesorios.some((a) => a.toLowerCase() === valor.toLowerCase())) {
      setBorrador('')
      return
    }
    alCambiar([...accesorios, valor])
    setBorrador('')
  }

  return (
    <div className="bloque">
      <div className="bloque-rotulo">
        <span className="rotulo">Accesorios incluidos</span>
      </div>

      {accesorios.length === 0 && (
        <p className="campo-ayuda" style={{ marginBottom: '0.5rem' }}>
          Todavía no registras accesorios. Se listan en la ficha pública del equipo.
        </p>
      )}

      <ul className="lista-editable">
        {accesorios.map((accesorio, i) => (
          <li key={accesorio}>
            <span>{accesorio}</span>
            <button
              type="button"
              className="accion accion--peligro"
              onClick={() => alCambiar(accesorios.filter((_, j) => j !== i))}
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>

      <div className="agregar-fila">
        <label className="oculto-visual" htmlFor="accesorio-nuevo">
          Nombre del accesorio
        </label>
        <input
          id="accesorio-nuevo"
          className="entrada"
          value={borrador}
          placeholder="Nombre del accesorio"
          disabled={lleno}
          onChange={(e) => setBorrador(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              agregar()
            }
          }}
        />
        <button
          type="button"
          className="boton boton--contorno"
          onClick={agregar}
          disabled={lleno || borrador.trim() === ''}
        >
          Agregar
        </button>
      </div>

      {error ? (
        <p className="campo-error" role="alert">
          {error}
        </p>
      ) : (
        lleno && <p className="campo-ayuda">Llegaste al máximo de {LIMITES.accesorios.max} accesorios.</p>
      )}
    </div>
  )
}
