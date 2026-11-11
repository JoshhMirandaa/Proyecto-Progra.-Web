import { useCallback, useState } from 'react'
import { sinErrores } from '../domain/validaciones.js'

/**
 * Estado de un formulario con validación.
 *
 * El error de un campo se muestra una vez que el campo fue tocado o cuando se
 * intentó enviar, de modo que el formulario no grite antes de que el usuario escriba.
 */
export function useFormulario({ inicial, validar }) {
  const [valores, setValores] = useState(inicial)
  const [tocados, setTocados] = useState({})
  const [intentoEnvio, setIntentoEnvio] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const errores = validar(valores)

  const ponerValor = useCallback((campo, valor) => {
    setValores((previos) => ({ ...previos, [campo]: valor }))
  }, [])

  const ponerValores = useCallback((cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }))
  }, [])

  const tocar = useCallback((campo) => {
    setTocados((previos) => ({ ...previos, [campo]: true }))
  }, [])

  const errorDe = useCallback(
    (campo) => ((tocados[campo] || intentoEnvio) && errores[campo]) || null,
    [errores, tocados, intentoEnvio],
  )

  const enviar = useCallback(
    (alEnviar) => async (evento) => {
      evento?.preventDefault()
      setIntentoEnvio(true)
      if (!sinErrores(errores)) return
      setEnviando(true)
      try {
        await alEnviar(valores)
      } finally {
        setEnviando(false)
      }
    },
    [errores, valores],
  )

  const reiniciar = useCallback(
    (nuevos = inicial) => {
      setValores(nuevos)
      setTocados({})
      setIntentoEnvio(false)
    },
    [inicial],
  )

  return {
    valores,
    errores,
    errorDe,
    ponerValor,
    ponerValores,
    tocar,
    enviar,
    enviando,
    reiniciar,
    valido: sinErrores(errores),
    intentoEnvio,
  }
}
