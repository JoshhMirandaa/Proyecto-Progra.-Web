import { Link } from 'react-router-dom'
import { SelectorPerfilDemo } from './SelectorPerfilDemo.jsx'

/** Marco de las vistas públicas (visitante sin sesión): ficha del equipo. */
export function MarcoPublico({ children }) {
  return (
    <div className="marco">
      <header className="barra">
        <Link to="/" className="marca">
          <span className="marca-icono" aria-hidden="true" />
          <span className="marca-nombre">Almacén de Equipos</span>
        </Link>

        <nav className="barra-nav" aria-label="Navegación pública">
          <a href="#inicio">Inicio</a>
          <Link to="/catalogo" className="activo">
            Catálogo
          </Link>
          <a href="#reglas">Reglas del préstamo</a>
          <a href="#ayuda">Ayuda</a>
        </nav>

        <div className="barra-fin">
          <SelectorPerfilDemo />
          <a href="#ingresar" className="boton boton--contorno boton--sm">
            Iniciar sesión
          </a>
          <a href="#crear-cuenta" className="boton boton--sm">
            Crear cuenta
          </a>
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
