export const FILTROS_INICIALES = {
  categoria: 'todas',
  estado: 'todos',
  texto: '',
  orden: 'nombre-asc',
  pagina: 1,
  porPagina: 8,
}

export const estadoInicial = {
  filtros: FILTROS_INICIALES,
  lista: {
    equipos: [],
    total: 0,
    totalEquipos: 0,
    pagina: 1,
    totalPaginas: 1,
    porPagina: 8,
    desde: 0,
    hasta: 0,
  },
  resumen: null,
  cargando: true,
  error: null,
  /** Se incrementa en cada escritura: las vistas de detalle lo observan para recargar. */
  version: 0,
}

export function inventarioReducer(estado, accion) {
  switch (accion.tipo) {
    case 'CARGANDO':
      return { ...estado, cargando: true, error: null }

    case 'LISTA_LISTA':
      return { ...estado, cargando: false, error: null, lista: accion.lista }

    case 'LISTA_FALLO':
      return { ...estado, cargando: false, error: accion.error }

    case 'RESUMEN_LISTO':
      return { ...estado, resumen: accion.resumen }

    case 'CAMBIAR_FILTROS':
      return {
        ...estado,
        filtros: {
          ...estado.filtros,
          ...accion.filtros,
          // cualquier cambio que no sea de página vuelve a la primera
          pagina: accion.filtros.pagina ?? 1,
        },
      }

    case 'LIMPIAR_FILTROS':
      return { ...estado, filtros: FILTROS_INICIALES }

    case 'ESCRITURA_OK':
      return { ...estado, version: estado.version + 1 }

    default:
      return estado
  }
}
