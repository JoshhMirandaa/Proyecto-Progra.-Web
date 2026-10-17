import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useSesion } from '../../context/SesionContext.jsx'
import { MenuUsuario } from './MenuUsuario.jsx'

const activo = ({ isActive }) => (isActive ? 'activo' : undefined)

/** Buscador de la barra: lleva al catálogo con el texto en la URL (?q=...). */
function Buscador({ inicial }) {
  const navegar = useNavigate()
  const [busqueda, setBusqueda] = useState(inicial)

  const buscar = (e) => {
    e.preventDefault()
    const texto = busqueda.trim()
    navegar(texto ? `/catalogo?q=${encodeURIComponent(texto)}` : '/catalogo')
  }

  return (
    <form className="barra-busqueda" role="search" onSubmit={buscar}>
      <div className="buscador">
        <label className="oculto-visual" htmlFor="busqueda-catalogo">
          Buscar equipo o código de inventario
        </label>
        <input
          id="busqueda-catalogo"
          className="entrada entrada--mono"
          type="search"
          placeholder="Buscar equipo o código de inventario"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>
    </form>
  )
}

/** Marco de las vistas del estudiante (mockups 3.1 a 3.4 y 6.1, 6.3). */
export function MarcoEstudiante({ children }) {
  const { esEstudiante } = useSesion()
  const { pathname, search } = useLocation()
  // Si el texto de la URL cambia (por ejemplo, al limpiar filtros), el buscador se reinicia.
  const textoUrl = pathname === '/catalogo' ? (new URLSearchParams(search).get('q') ?? '') : ''

  return (
    <div className="marco">
      <header className="barra barra--estudiante">
        <Link to="/catalogo" className="marca">
          <span className="marca-icono" aria-hidden="true" />
          <span className="marca-nombre">Almacén de Equipos</span>
        </Link>

        <nav className="barra-nav" aria-label="Navegación del estudiante">
          <NavLink to="/catalogo" className={activo}>
            Catálogo
          </NavLink>
          {esEstudiante && (
            <>
              <NavLink to="/mis-solicitudes" className={activo}>
                Mis solicitudes
              </NavLink>
              <NavLink to="/mis-reservas" className={activo}>
                Mis reservas
              </NavLink>
              <NavLink to="/reservas" className={activo}>
                Calendario
              </NavLink>
              <NavLink to="/mi-deuda" className={activo}>
                Mi deuda
              </NavLink>
            </>
          )}
        </nav>

        <Buscador key={textoUrl} inicial={textoUrl} />

        <div className="barra-fin">
          {esEstudiante ? (
            <MenuUsuario />
          ) : (
            <Link to="/login" className="boton boton--contorno boton--sm">
              Iniciar sesión
            </Link>
          )}
        </div>
      </header>

      <main className="publico">{children}</main>

      <footer className="pie">
        <p>
          <strong>Almacén de Equipos</strong> · Facultad de Ingeniería
        </p>
        <div className="pie-enlaces">
          <a href="#reglamento">Reglamento de préstamo</a>
          <span>almacen.equipos@ulima.edu.pe</span>
          <span>Anexo 3120</span>
        </div>
      </footer>
    </div>
  )
}
