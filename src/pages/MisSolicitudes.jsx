import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DetalleSolicitud } from '../components/catalogo/DetalleSolicitud.jsx'
import { EstadoSolicitud } from '../components/catalogo/EstadoSolicitud.jsx'
import { Confirmacion } from '../components/ui/Modal.jsx'
import { Cargando, EstadoVacio } from '../components/ui/Piezas.jsx'
import { useCatalogo } from '../context/CatalogoContext.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import {
  ESTADOS_SOLICITUD,
  formatearFecha,
  formatearFechaCorta,
  seSolapan,
} from '../domain/solicitudes.js'

const ACCION = {
  pendiente: null,
  aprobada: 'Ver detalle',
  en_prestamo: 'Ver constancia',
  devuelta: 'Ver detalle',
  rechazada: 'Ver motivo',
  retirada: 'Ver detalle',
}

function resumen(lista) {
  const pendientes = lista.filter((s) => s.estado === 'pendiente').length
  const aprobadas = lista.filter((s) => s.estado === 'aprobada').length
  const historial = lista.length - pendientes
  return [
    `${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'}`,
    `${aprobadas} ${aprobadas === 1 ? 'aprobada' : 'aprobadas'}`,
    `${historial} en el historial`,
  ].join(' · ')
}

/** Vista 3.4 — Mis solicitudes. */
export function MisSolicitudes() {
  const { esEstudiante } = useSesion()
  const { misSolicitudes, cargando, error, retirarSolicitud } = useCatalogo()
  const [estado, setEstado] = useState('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [abierta, setAbierta] = useState(null)
  const [porRetirar, setPorRetirar] = useState(null)
  const [retirando, setRetirando] = useState(false)

  if (!esEstudiante) {
    return (
      <section className="panel">
        <EstadoVacio
          marca="!"
          titulo="Esta vista es para estudiantes"
          descripcion="Inicia sesión con tu cuenta de estudiante para ver tus solicitudes."
        />
      </section>
    )
  }

  const filtradas = misSolicitudes.filter(
    (s) =>
      (estado === 'todos' || s.estado === estado) &&
      seSolapan(desde || '0000-01-01', hasta || '9999-12-31', s.fechaInicio, s.fechaFin),
  )
  const hayFiltros = estado !== 'todos' || desde || hasta

  const confirmarRetiro = async () => {
    setRetirando(true)
    await retirarSolicitud(porRetirar.id)
    setRetirando(false)
    setPorRetirar(null)
    setAbierta(null)
  }

  return (
    <div>
      <div className="cabecera-vista">
        <div>
          <h1>Mis solicitudes</h1>
          <p className="sub">{resumen(misSolicitudes)}</p>
        </div>
        <div className="filtros-solicitudes">
          <label>
            <span className="oculto-visual">Filtrar por estado</span>
            <select className="entrada" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="todos">Estado: todos</option>
              {ESTADOS_SOLICITUD.map((e) => (
                <option key={e.valor} value={e.valor}>
                  Estado: {e.etiqueta.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <div className="rango-fechas">
            <label>
              <span className="oculto-visual">Desde</span>
              <input
                type="date"
                className="entrada entrada--mono"
                value={desde}
                max={hasta || undefined}
                onChange={(e) => setDesde(e.target.value)}
              />
            </label>
            <span aria-hidden="true">—</span>
            <label>
              <span className="oculto-visual">Hasta</span>
              <input
                type="date"
                className="entrada entrada--mono"
                value={hasta}
                min={desde || undefined}
                onChange={(e) => setHasta(e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      <section className="panel">
        {error ? (
          <div style={{ padding: '1.5rem' }}>
            <div className="aviso aviso--error">{error}</div>
          </div>
        ) : cargando && misSolicitudes.length === 0 ? (
          <Cargando filas={5} etiqueta="Cargando tus solicitudes…" />
        ) : misSolicitudes.length === 0 ? (
          <EstadoVacio
            marca="□"
            titulo="Aún no tienes solicitudes"
            descripcion="Busca un equipo en el catálogo y solicita tu primer préstamo."
          >
            <Link to="/catalogo" className="boton boton--contorno">
              Ir al catálogo
            </Link>
          </EstadoVacio>
        ) : filtradas.length === 0 ? (
          <EstadoVacio
            marca="?"
            titulo="Ninguna solicitud coincide con estos filtros"
            descripcion="Prueba con otro estado o amplía el rango de fechas."
          >
            {hayFiltros && (
              <button
                type="button"
                className="boton boton--contorno"
                onClick={() => {
                  setEstado('todos')
                  setDesde('')
                  setHasta('')
                }}
              >
                Limpiar filtros
              </button>
            )}
          </EstadoVacio>
        ) : (
          <div className="tabla-marco">
            <table className="tabla tabla-solicitudes">
              <thead>
                <tr>
                  <th>Equipo y curso</th>
                  <th>Fechas</th>
                  <th>Unidad asignada</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/catalogo/${s.equipoId}`} className="tabla-nombre">
                        {s.equipoNombre}
                      </Link>
                      <p className="sm suave">{s.cursoNombre}</p>
                    </td>
                    <td className="codigo sin-corte">
                      {formatearFecha(s.fechaInicio)} → {formatearFecha(s.fechaFin)}
                    </td>
                    <td className={s.codigoUnidad ? 'codigo' : 'suave'}>
                      {s.codigoUnidad ?? (s.estado === 'pendiente' ? 'Pendiente de asignar' : '—')}
                    </td>
                    <td>
                      <EstadoSolicitud estado={s.estado} />
                    </td>
                    <td>
                      {s.retirable ? (
                        <button
                          type="button"
                          className="boton boton--texto texto-peligro"
                          onClick={() => setPorRetirar(s)}
                        >
                          Retirar solicitud
                        </button>
                      ) : s.estado === 'en_prestamo' && s.codigoPrestamo ? (
                        <Link
                          to={`/constancias/${s.codigoPrestamo}`}
                          className="boton boton--texto"
                        >
                          Ver constancia
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="boton boton--texto"
                          onClick={() => setAbierta(s)}
                        >
                          {ACCION[s.estado] ?? 'Ver detalle'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {abierta && (
        <DetalleSolicitud
          solicitud={abierta}
          alCerrar={() => setAbierta(null)}
          alRetirar={(s) => {
            setAbierta(null)
            setPorRetirar(s)
          }}
        />
      )}

      {porRetirar && (
        <Confirmacion
          titulo="¿Retirar la solicitud?"
          mensaje={`Vas a retirar tu solicitud del ${porRetirar.equipoNombre} del ${formatearFechaCorta(porRetirar.fechaInicio)} al ${formatearFecha(porRetirar.fechaFin)}. El encargado ya no la verá en su bandeja.`}
          detalle="Si luego necesitas el equipo, tendrás que enviar una solicitud nueva."
          textoConfirmar="Retirar solicitud"
          textoTrabajando="Retirando…"
          trabajando={retirando}
          alConfirmar={confirmarRetiro}
          alCerrar={() => setPorRetirar(null)}
        />
      )}
    </div>
  )
}
