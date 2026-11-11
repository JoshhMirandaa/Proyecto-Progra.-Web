export const estadoInicialCatalogo = {
  misSolicitudes: [],
  cargando: false,
  error: null,
  /** Se incrementa en cada escritura: las vistas que dependen de solicitudes lo observan. */
  version: 0,
}

export function catalogoReducer(estado, accion) {
  switch (accion.tipo) {
    case 'SOLICITUDES_CARGANDO':
      return { ...estado, cargando: true, error: null }

    case 'SOLICITUDES_LISTAS':
      return { ...estado, cargando: false, error: null, misSolicitudes: accion.lista }

    case 'SOLICITUDES_FALLO':
      return { ...estado, cargando: false, error: accion.error }

    case 'SIN_SESION':
      return { ...estado, cargando: false, error: null, misSolicitudes: [] }

    case 'ESCRITURA_OK':
      return { ...estado, version: estado.version + 1 }

    default:
      return estado
  }
}
