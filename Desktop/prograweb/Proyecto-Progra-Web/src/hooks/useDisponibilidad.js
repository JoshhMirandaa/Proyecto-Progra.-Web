import { useEffect, useState } from 'react'
import { useCatalogo } from '../context/CatalogoContext.jsx'
import { useRetardo } from './useRetardo.js'

/**
 * Revisa cuántas unidades quedan libres en el rango elegido. Espera a que el estudiante
 * deje de cambiar las fechas (useRetardo) para no consultar en cada clic del calendario.
 */
export function useDisponibilidad(equipoId, fechaInicio, fechaFin) {
  const { consultarDisponibilidad, version } = useCatalogo()
  const rango = useRetardo(`${fechaInicio}|${fechaFin}`, 300)
  const [resultado, setResultado] = useState({ libres: null, proximoRango: null, mensaje: null })
  const [consultando, setConsultando] = useState(false)

  useEffect(() => {
    const [inicio, fin] = rango.split('|')
    if (!equipoId || !inicio || !fin) {
      setResultado({ libres: null, proximoRango: null, mensaje: null })
      return undefined
    }
    let vigente = true
    setConsultando(true)
    consultarDisponibilidad(equipoId, inicio, fin)
      .then((r) => vigente && setResultado(r))
      .catch(() => vigente && setResultado({ libres: null, proximoRango: null, mensaje: null }))
      .finally(() => vigente && setConsultando(false))
    return () => {
      vigente = false
    }
  }, [equipoId, rango, consultarDisponibilidad, version])

  return { ...resultado, consultando }
}
