import { Navigate, useLocation } from 'react-router-dom'
import { useSesion } from '../../context/SesionContext.jsx'
import { AccesoDenegado } from '../../pages/AccesoDenegado.jsx'
import { MarcoSegunRol } from '../layout/MarcoSegunRol.jsx'

/**
 * Protección de rutas por rol (HU-1). Sin sesión, lleva al inicio de sesión y recuerda a
 * dónde quería ir. Con sesión pero sin el rol, muestra el 403 dentro de su propio marco.
 */
export function RutaProtegida({ roles, children }) {
  const { conSesion, rol, usuario } = useSesion()
  const ubicacion = useLocation()

  if (!conSesion)
    return (
      <Navigate
        to="/login"
        replace
        state={usuario.salio ? undefined : { desde: ubicacion.pathname + ubicacion.search }}
      />
    )

  if (roles && !roles.includes(rol))
    return (
      <MarcoSegunRol>
        <AccesoDenegado />
      </MarcoSegunRol>
    )

  return children
}
