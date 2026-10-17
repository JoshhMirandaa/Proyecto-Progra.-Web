import { Link, useNavigate } from 'react-router-dom'
import { useSesion } from '../../context/SesionContext.jsx'

/** Nombre, avatar (lleva a Mi cuenta) y botón para cerrar sesión. Va en la barra superior. */
export function MenuUsuario({ detalle }) {
  const { nombreCorto, iniciales, cerrarSesion } = useSesion()
  const navegar = useNavigate()

  return (
    <div className="menu-usuario">
      <Link to="/mi-cuenta" className="usuario" title="Ir a Mi cuenta">
        <span>{detalle ? `${nombreCorto} · ${detalle}` : nombreCorto}</span>
        <span className="avatar" aria-hidden="true">
          {iniciales}
        </span>
      </Link>
      <button
        type="button"
        className="boton boton--neutro boton--sm"
        onClick={() => {
          cerrarSesion()
          navegar('/login')
        }}
      >
        Salir
      </button>
    </div>
  )
}
