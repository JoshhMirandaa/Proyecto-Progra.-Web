import { useEffect, useState } from 'react'
import { useCatalogo } from '../context/CatalogoContext.jsx'

/** Carga una página del catálogo cada vez que cambian los filtros. */
export function useListaCatalogo(filtros) {
  const { listarCatalogo } = useCatalogo()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // Los filtros llegan como objeto nuevo en cada render; se comparan por su contenido.
  const clave = JSON.stringify(filtros)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError(null)
    listarCatalogo(JSON.parse(clave))
      .then((r) => vigente && setDatos(r))
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [clave, listarCatalogo])

  return { datos, cargando, error }
}
