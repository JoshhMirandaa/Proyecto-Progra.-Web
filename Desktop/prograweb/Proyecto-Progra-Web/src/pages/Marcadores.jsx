import { Link } from 'react-router-dom'
import { EstadoVacio } from '../components/ui/Piezas.jsx'

/** Rutas de historias que aún no se integran: existen en la navegación del panel. */
export function PendienteDeOtraHistoria({ titulo, historia }) {
  return (
    <div>
      <div className="cabecera-vista">
        <h1>{titulo}</h1>
      </div>
      <section className="panel">
        <EstadoVacio
          marca="□"
          titulo={`Esta vista pertenece a la ${historia}`}
          descripcion="Esta sección la implementa otro integrante del equipo y todavía no está integrada."
        >
          <Link to="/inventario" className="boton boton--contorno">
            Volver al inventario
          </Link>
        </EstadoVacio>
      </section>
    </div>
  )
}
