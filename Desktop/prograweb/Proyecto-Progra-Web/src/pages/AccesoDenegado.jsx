import { Link } from 'react-router-dom'
import { useSesion } from '../context/SesionContext.jsx'

/** Vista 1.7 — Acceso denegado (403). Se muestra dentro del marco de quien intentó entrar. */
export function AccesoDenegado() {
  const { esEstudiante } = useSesion()
  return (
    <section className="pagina-error">
      <div className="pagina-error-marca" aria-hidden="true">
        !
      </div>
      <p className="rotulo">Error 403 · Acceso denegado</p>
      <h1>No tienes permiso para ver esta página</h1>
      {esEstudiante ? (
        <>
          <p className="prosa">
            Esta sección pertenece al panel del encargado de almacén. Si crees que es un error,
            escribe a almacen.equipos@ulima.edu.pe indicando tu código de estudiante.
          </p>
          <div className="fila-centro">
            <Link to="/catalogo" className="boton">
              Ir al catálogo
            </Link>
            <Link to="/mis-solicitudes" className="boton boton--contorno">
              Ver mis solicitudes
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="prosa">
            Esta sección es para estudiantes. Desde tu cuenta de encargado puedes gestionar el
            inventario y las solicitudes.
          </p>
          <div className="fila-centro">
            <Link to="/inventario" className="boton">
              Ir al inventario
            </Link>
            <Link to="/solicitudes" className="boton boton--contorno">
              Ver la bandeja de solicitudes
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
