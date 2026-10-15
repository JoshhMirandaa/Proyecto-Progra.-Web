import { Link } from 'react-router-dom'
import { EstadoVacio } from '../components/ui/Piezas.jsx'

/** Rutas de otras historias: existen en la navegación pero no son de la HU-2. */
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
          descripcion="La HU-2 solo es dueña del inventario de equipos y unidades. Esta sección la implementa otro integrante del equipo."
        >
          <Link to="/inventario" className="boton boton--contorno">
            Volver al inventario
          </Link>
        </EstadoVacio>
      </section>
    </div>
  )
}

export function NoEncontrado() {
  return (
    <section className="panel">
      <EstadoVacio
        marca="□"
        titulo="No encontramos esta página"
        descripcion="Revisa la dirección o vuelve al inventario de equipos."
      >
        <Link to="/inventario" className="boton">
          Ir al inventario
        </Link>
      </EstadoVacio>
    </section>
  )
}
