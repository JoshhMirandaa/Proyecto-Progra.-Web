import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FILTROS_CATALOGO_INICIALES } from '../domain/solicitudes.js'

const DISPONIBILIDADES = ['libres', 'todas']
const DURACIONES = ['7', '15', 'todas']
const ORDENES = ['disponibles', 'nombre-asc', 'nombre-desc', 'categoria']

/**
 * Filtros del catálogo guardados en la URL (?cat=robotica&disp=libres&dur=7&q=...).
 * Así el filtro sobrevive al volver desde el detalle, se puede compartir el enlace y
 * la búsqueda de la barra superior llega al catálogo sin pasar por ningún estado global.
 */
export function useFiltrosCatalogo() {
  const [parametros, setParametros] = useSearchParams()

  const filtros = useMemo(() => {
    const disp = parametros.get('disp')
    const dur = parametros.get('dur')
    const orden = parametros.get('orden')
    const pagina = Number(parametros.get('pag'))
    return {
      ...FILTROS_CATALOGO_INICIALES,
      categorias: (parametros.get('cat') ?? '').split(',').filter(Boolean),
      disponibilidad: DISPONIBILIDADES.includes(disp)
        ? disp
        : FILTROS_CATALOGO_INICIALES.disponibilidad,
      duracion: DURACIONES.includes(dur) ? dur : FILTROS_CATALOGO_INICIALES.duracion,
      orden: ORDENES.includes(orden) ? orden : FILTROS_CATALOGO_INICIALES.orden,
      texto: parametros.get('q') ?? '',
      pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
    }
  }, [parametros])

  /** Aplica cambios. Cualquier cambio que no sea de página vuelve a la primera. */
  const cambiarFiltros = useCallback(
    (cambios) => {
      const siguiente = { ...filtros, ...cambios }
      if (!('pagina' in cambios)) siguiente.pagina = 1
      const p = new URLSearchParams()
      if (siguiente.categorias.length) p.set('cat', siguiente.categorias.join(','))
      if (siguiente.disponibilidad !== FILTROS_CATALOGO_INICIALES.disponibilidad)
        p.set('disp', siguiente.disponibilidad)
      if (siguiente.duracion !== FILTROS_CATALOGO_INICIALES.duracion)
        p.set('dur', siguiente.duracion)
      if (siguiente.orden !== FILTROS_CATALOGO_INICIALES.orden) p.set('orden', siguiente.orden)
      if (siguiente.texto.trim()) p.set('q', siguiente.texto.trim())
      if (siguiente.pagina > 1) p.set('pag', String(siguiente.pagina))
      setParametros(p)
    },
    [filtros, setParametros],
  )

  const limpiarFiltros = useCallback(() => setParametros(new URLSearchParams()), [setParametros])

  const hayFiltros =
    filtros.categorias.length > 0 ||
    filtros.disponibilidad !== FILTROS_CATALOGO_INICIALES.disponibilidad ||
    filtros.duracion !== FILTROS_CATALOGO_INICIALES.duracion ||
    filtros.texto.trim() !== ''

  return { filtros, cambiarFiltros, limpiarFiltros, hayFiltros }
}
