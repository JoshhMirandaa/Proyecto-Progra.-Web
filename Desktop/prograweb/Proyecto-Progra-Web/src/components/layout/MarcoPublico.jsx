import { Link, NavLink, useLocation } from 'react-router-dom'

const activo = ({ isActive }) => (isActive ? 'activo' : undefined)

/** Marco de las vistas públicas (visitante sin sesión): inicio, catálogo, acceso y ficha. */
export function MarcoPublico({ children }) {
  const { pathname } = useLocation()
  const enInicio = pathname === '/'

  return (
    <div className="marco">
      <header className="barra">
        <Link to="/" className="marca">
          <span className="marca-icono" aria-hidden="true" />
          <span className="marca-nombre">Almacén de Equipos</span>
        </Link>

        <nav className="barra-nav" aria-label="Navegación pública">
          <NavLink to="/" end className={activo}>
            Inicio
          </NavLink>
          <NavLink to="/catalogo" className={activo}>
            Catálogo
          </NavLink>
          <Link to="/#reglas">Reglas del préstamo</Link>
          <Link to="/#ayuda">Ayuda</Link>
        </nav>

        <div className="barra-fin">
          <NavLink to="/login" className="boton boton--contorno boton--sm">
            Iniciar sesión
          </NavLink>
          <NavLink to="/registro" className="boton boton--sm">
            Crear cuenta
          </NavLink>
        </div>
      </header>

      <main className="publico">{children}</main>

      <footer className="pie">
        <div>
          <p>
            <strong>Almacén de Equipos</strong> · Facultad de Ingeniería
          </p>
          {enInicio && (
            <p className="pie-direccion">
              Universidad de Lima · Av. Javier Prado Este 4600, Santiago de Surco
            </p>
          )}
        </div>
        <div className="pie-enlaces">
          <a href="#reglamento">Reglamento de préstamo</a>
          <span>almacen.equipos@ulima.edu.pe</span>
          <span>Anexo 3120</span>
        </div>
      </footer>
    </div>
  )
}
