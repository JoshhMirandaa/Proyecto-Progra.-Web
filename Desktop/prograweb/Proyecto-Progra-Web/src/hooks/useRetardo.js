import { useEffect, useState } from 'react'

/** Devuelve el valor con retardo, para no filtrar en cada tecla. */
export function useRetardo(valor, ms = 350) {
  const [retardado, setRetardado] = useState(valor)

  useEffect(() => {
    const id = setTimeout(() => setRetardado(valor), ms)
    return () => clearTimeout(id)
  }, [valor, ms])

  return retardado
}
