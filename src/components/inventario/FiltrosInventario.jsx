import { useEffect, useState } from 'react'
import { CATEGORIAS, ESTADOS_UNIDAD } from '../../domain/catalogos.js'
import { useRetardo } from '../../hooks/useRetardo.js'

/** Filtros por categoría y estado, búsqueda por código y ordenamiento. */
export function FiltrosInventario({ filtros, alCambiar }) {
  const [texto, setTexto] = useState(filtros.texto)
  const textoRetardado = useRetardo(texto, 320)

  useEffect(() => {
    if (textoRetardado !== filtros.texto) alCambiar({ texto: textoRetardado })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoRetardado])

  // si los filtros se limpian desde fuera, el cuadro de búsqueda acompaña
  useEffect(() => {
    if (filtros.texto === '' && texto !== '') setTexto('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.texto])

  return (
    <div className="campo-fila" style={{ marginBottom: '1rem' }}>
      <div>
        <label className="oculto-visual" htmlFor="filtro-categoria">
          Categoría
        </label>
        <select
          id="filtro-categoria"
          className="entrada"
          value={filtros.categoria}
          onChange={(e) => alCambiar({ categoria: e.target.value })}
        >
          <option value="todas">Categoría: todas</option>
          {CATEGORIAS.map((c) => (
            <option key={c.valor} value={c.valor}>
              Categoría: {c.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="oculto-visual" htmlFor="filtro-estado">
          Estado de las unidades
        </label>
        <select
          id="filtro-estado"
          className="entrada"
          value={filtros.estado}
          onChange={(e) => alCambiar({ estado: e.target.value })}
        >
          <option value="todos">Estado: todos</option>
          {ESTADOS_UNIDAD.map((e) => (
            <option key={e.valor} value={e.valor}>
              Estado: con unidades {e.plural}
            </option>
          ))}
        </select>
      </div>

      <div className="buscador">
        <label className="oculto-visual" htmlFor="filtro-texto">
          Buscar por código de inventario, nombre, marca o modelo
        </label>
        <input
          id="filtro-texto"
          className="entrada entrada--mono"
          type="search"
          value={texto}
          placeholder="Código de inventario"
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>

      <div>
        <label className="oculto-visual" htmlFor="filtro-orden">
          Ordenar por
        </label>
        <select
          id="filtro-orden"
          className="entrada"
          value={filtros.orden}
          onChange={(e) => alCambiar({ orden: e.target.value })}
        >
          <option value="nombre-asc">Orden: nombre (A–Z)</option>
          <option value="nombre-desc">Orden: nombre (Z–A)</option>
          <option value="categoria-asc">Orden: categoría</option>
          <option value="disponibles-desc">Orden: más unidades libres</option>
          <option value="disponibles-asc">Orden: menos unidades libres</option>
        </select>
      </div>
    </div>
  )
}
