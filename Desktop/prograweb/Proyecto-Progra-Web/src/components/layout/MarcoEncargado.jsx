import { NavLink, Link } from 'react-router-dom'
import { useInventario } from '../../context/InventarioContext.jsx'
import { usePrestamos } from '../../context/PrestamosContext.jsx'
import { useSesion } from '../../context/SesionContext.jsx'
import { ALMACEN } from '../../domain/catalogos.js'
import { MenuUsuario } from './MenuUsuario.jsx'

const SINCRONIZACION = '14/09/2026 08:05'

function Enlace({ a, children, cuenta, alerta = false }) {
  return (
    <NavLink to={a} className={({ isActive }) => (isActive ? 'activo' : undefined)} end>
      <span>{children}</span>
      {cuenta != null &&
        (alerta && cuenta > 0 ? (
          <span className="contador contador--alerta">{cuenta}</span>
        ) : typeof cuenta === 'string' ? (
          <span className="riel-cuenta">{cuenta}</span>
        ) : (
          <span className="riel-cuenta">{cuenta}</span>
        ))}
    </NavLink>
  )
}

/** Marco del panel del encargado: barra superior, riel de navegación y pie. */
export function MarcoEncargado({ children }) {
  const { resumen } = useInventario()
  const { almacen } = useSesion()
  const externos = resumen?.externos
  const { contadores } = usePrestamos()

  return (
    <div className="marco">
      <header className="barra">
        <Link to="/inventario" className="marca">
          <span className="marca-icono" aria-hidden="true" />
          <span className="marca-nombre">Almacén de Equipos</span>
          <span className="marca-rol">Panel del encargado</span>
        </Link>

        <form className="barra-busqueda" role="search" onSubmit={(e) => e.preventDefault()}>
          <div className="buscador">
            <label className="oculto-visual" htmlFor="busqueda-global">
              Buscar por código de inventario
            </label>
            <input
              id="busqueda-global"
              className="entrada entrada--mono"
              type="search"
              placeholder="Buscar por código de inventario: INV-OSC-0042"
              disabled
              title="La búsqueda global pertenece a otra historia. Usa el filtro de la lista."
            />
          </div>
        </form>

        <div className="barra-fin">
          <Link to="/solicitudes" className="pendientes">
            Solicitudes pendientes
            <span className="contador">{contadores.pendientes}</span>
          </Link>
          <MenuUsuario detalle={almacen.replace('Almacén ', '')} />
        </div>
      </header>

      <div className="cuerpo">
        <nav className="riel" aria-label="Navegación del panel">
          <div className="riel-grupo">
            <p className="riel-titulo">Operación</p>
            <div className="riel-nav">
              <Enlace a="/inventario" cuenta={resumen?.unidades}>
                Inventario
              </Enlace>
              <Enlace a="/solicitudes" cuenta={contadores.pendientes}>
                Solicitudes
              </Enlace>
              <Enlace a="/prestamos" cuenta={contadores.vigentes}>
                Préstamos vigentes
              </Enlace>
              <Enlace a="/vencidos" cuenta={contadores.vencidos} alerta>
                Vencidos
              </Enlace>
              <Enlace a="/devoluciones" cuenta={contadores.vencidos + contadores.vencenHoy}>
                Devoluciones
              </Enlace>
            </div>
          </div>

          <div className="riel-grupo">
            <p className="riel-titulo">Complementarios</p>
            <div className="riel-nav">
              <Enlace a="/reservas" cuenta={externos?.reservas}>
                Reservas
              </Enlace>
              <Enlace a="/mis-reservas">Mis reservas</Enlace>
              <Enlace a="/lista-espera" cuenta={externos?.listaEspera}>
                Lista de espera
              </Enlace>
              <Enlace a="/tablero">Tablero</Enlace>
              <Enlace a="/usuarios" cuenta={externos?.usuarios}>
                Usuarios
              </Enlace>
            </div>
          </div>
        </nav>

        <main className="trabajo">{children}</main>
      </div>

      <footer className="pie">
        <p>
          <strong>Almacén de Equipos</strong> · Panel del encargado · {ALMACEN.nombre}
        </p>
        <div className="pie-enlaces">
          <a href="#manual">Manual del encargado</a>
          <span>Soporte: sistemas@ulima.edu.pe</span>
          <span>Última sincronización: {SINCRONIZACION}</span>
        </div>
      </footer>
    </div>
  )
}
