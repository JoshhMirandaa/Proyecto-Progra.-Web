import { useCallback, useEffect, useState } from 'react'
import { useInventario } from '../context/InventarioContext.jsx'

/**
 * Carga un equipo con sus unidades y lo vuelve a pedir cada vez que ocurre una
 * escritura en el inventario (observa `version` del Context).
 */
export function useEquipo(equipoId) {
  const { obtenerEquipo, version } = useInventario()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(
    async (señal) => {
      setCargando(true)
      setError(null)
      try {
        const respuesta = await obtenerEquipo(equipoId)
        if (!señal?.cancelado) setDatos(respuesta)
      } catch (e) {
        if (!señal?.cancelado) setError(e.message)
      } finally {
        if (!señal?.cancelado) setCargando(false)
      }
    },
    [equipoId, obtenerEquipo],
  )

  useEffect(() => {
    const señal = { cancelado: false }
    cargar(señal)
    return () => {
      señal.cancelado = true
    }
  }, [cargar, version])

  return { equipo: datos?.equipo ?? null, unidades: datos?.unidades ?? [], cargando, error }
}
