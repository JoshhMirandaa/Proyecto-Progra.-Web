import { useEffect, useState } from 'react'
import { useCatalogo } from '../context/CatalogoContext.jsx'

/** Ficha de un equipo del catálogo con su disponibilidad (vistas 3.2 y 3.3). */
export function useDetalleEquipo(equipoId) {
  const { obtenerDetalleEquipo, version } = useCatalogo()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    setError(null)
    obtenerDetalleEquipo(equipoId)
      .then((r) => vigente && setDatos(r))
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [equipoId, obtenerDetalleEquipo, version])

  const vigenteParaEsteId = datos?.equipo?.id === equipoId
  return {
    equipo: vigenteParaEsteId ? datos.equipo : null,
    proximaLiberacion: vigenteParaEsteId ? datos.proximaLiberacion : null,
    cargando: !error && !vigenteParaEsteId,
    error,
  }
}
