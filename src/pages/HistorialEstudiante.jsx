import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Confirmacion } from '../components/ui/Modal.jsx'
import { Cargando, EstadoVacio } from '../components/ui/Piezas.jsx'
import { useDevoluciones } from '../context/DevolucionesContext.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import { formatearSoles } from '../domain/catalogos.js'
import { etiquetaRetorno } from '../domain/devoluciones.js'
import { formatearFecha, hoyISO } from '../domain/solicitudes.js'

const fechaDe = (iso) => (iso ? formatearFecha(hoyISO(new Date(iso))) : '—')

/**
 * Vista 5.4 — Historial del estudiante, con el aviso de deuda 5.5. El encargado la abre
 * desde la bandeja o la devolución; el estudiante ve la suya en «Mi deuda».
 */
export function HistorialEstudiante({ propio = false }) {
  const parametros = useParams()
  const { usuario, esEncargado, encargadoActivo } = useSesion()
  const { obtenerHistorial, registrarPago, version } = useDevoluciones()
  const estudianteId = propio ? usuario.id : parametros.estudianteId
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [pagando, setPagando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    let vigente = true
    setError(null)
    obtenerHistorial(estudianteId)
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
    // obtenerHistorial cambia con la sesión; el estudiante y la versión mandan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estudianteId, version])

  if (error)
    return (
      <section className="panel">
        <EstadoVacio marca="!" titulo="No podemos mostrar este historial" descripcion={error} />
      </section>
    )
  if (!datos)
    return (
      <section className="panel">
        <Cargando filas={6} etiqueta="Cargando el historial…" />
      </section>
    )

  const { estudiante: e, prestamos, resumen, detalleDeuda } = datos
  const pagar = async () => {
    setPagando(true)
    await registrarPago(e.id)
    setPagando(false)
    setConfirmar(false)
  }

  return (
    <div>
      {esEncargado && (
        <nav className="migas" aria-label="Ruta">
          <Link to="/solicitudes">Solicitudes</Link>
          <span aria-hidden="true">/</span>
          <span>Estudiantes</span>
          <span aria-hidden="true">/</span>
          <span>
            {e.nombres} {e.apellidos}
          </span>
        </nav>
      )}

      <div className="cabecera-vista">
        <div>
          <h1>{propio ? 'Mi deuda e historial' : `${e.nombres} ${e.apellidos}`}</h1>
          <p className="sub">
            {e.carrera} · {e.ciclo}.º ciclo · código {e.codigo} · {e.correo}
          </p>
        </div>
        {esEncargado && resumen.deuda > 0 && (
          <button
            type="button"
            className="boton"
            disabled={!encargadoActivo}
            onClick={() => setConfirmar(true)}
          >
            Registrar pago
          </button>
        )}
      </div>

      {resumen.deuda > 0 && (
        <div className="aviso aviso--error" style={{ marginBottom: '1rem' }} role="status">
          <strong>Aviso de deuda pendiente.</strong> {formatearSoles(resumen.deuda)} por{' '}
          {detalleDeuda
            .map(
              (d) => `${d.dias} ${d.dias === 1 ? 'día' : 'días'} de retraso en ${d.codigoPrestamo}`,
            )
            .join(' y ')}
          {resumen.faltantesPorValorizar > 0 &&
            `, más ${resumen.faltantesPorValorizar} ${resumen.faltantesPorValorizar === 1 ? 'accesorio faltante' : 'accesorios faltantes'} por valorizar`}
          .{' '}
          {propio
            ? 'Regularízala en Tesorería para volver a solicitar equipos.'
            : 'No puede solicitar equipos hasta regularizar.'}
        </div>
      )}

      <dl className="resumen-historial">
        <div>
          <dt>Préstamos</dt>
          <dd>{resumen.prestamos}</dd>
        </div>
        <div data-alerta={resumen.retrasos > 0 || undefined}>
          <dt>Retrasos acumulados</dt>
          <dd>{resumen.retrasos}</dd>
        </div>
        <div data-alerta={resumen.deuda > 0 || undefined}>
          <dt>Penalidades pendientes</dt>
          <dd>{formatearSoles(resumen.deuda)}</dd>
        </div>
        <div data-alerta={resumen.deuda > 0 || undefined}>
          <dt>Estado</dt>
          <dd className="resumen-estado">{resumen.deuda > 0 ? 'Con deuda' : 'Al día'}</dd>
        </div>
      </dl>

      <section className="panel">
        {prestamos.length === 0 ? (
          <EstadoVacio
            marca="□"
            titulo="Todavía no hay préstamos"
            descripcion="Aquí aparecerán los préstamos entregados y devueltos."
          />
        ) : (
          <div className="tabla-marco">
            <table className="tabla tabla-historial">
              <thead>
                <tr>
                  <th>Préstamo</th>
                  <th>Equipo y unidad</th>
                  <th>Entrega</th>
                  <th>Devolución</th>
                  <th>Retraso</th>
                  <th>Penalidad</th>
                </tr>
              </thead>
              <tbody>
                {prestamos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/constancias/${p.codigoPrestamo}`} className="codigo">
                        {p.codigoPrestamo}
                      </Link>
                    </td>
                    <td>
                      <span className="tabla-nombre">{p.equipoNombre}</span>
                      <p className="sm suave codigo">{p.codigoUnidad}</p>
                    </td>
                    <td className="codigo sin-corte">{fechaDe(p.fechaEntregaReal)}</td>
                    <td className="sin-corte">
                      {p.estado === 'devuelta' ? (
                        <>
                          <span className="codigo">
                            {formatearFecha(p.fechaDevolucionReal ?? p.fechaFin)}
                          </span>
                          {p.estadoRetorno && p.estadoRetorno !== 'sin_novedades' && (
                            <p className="sm texto-peligro">{etiquetaRetorno(p.estadoRetorno)}</p>
                          )}
                        </>
                      ) : (
                        <span className="suave">
                          En préstamo · vence {formatearFecha(p.fechaFin)}
                        </span>
                      )}
                    </td>
                    <td className={p.retraso > 0 ? 'texto-peligro' : 'suave'}>
                      {p.retraso > 0 ? `${p.retraso} d` : '—'}
                    </td>
                    <td>
                      {p.penalidad ? (
                        <>
                          <span className="codigo">{formatearSoles(p.penalidad.monto)}</span>{' '}
                          <span className="estado-penalidad" data-estado={p.penalidad.estado}>
                            {p.penalidad.estado === 'pagada' ? 'pagada' : 'pendiente'}
                          </span>
                        </>
                      ) : (
                        <span className="suave">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirmar && (
        <Confirmacion
          titulo="¿Registrar el pago?"
          mensaje={`${e.nombres} ${e.apellidos} pagó ${formatearSoles(resumen.deuda)} en Tesorería. Las penalidades quedarán como pagadas y podrá volver a solicitar equipos.`}
          textoConfirmar="Registrar pago"
          textoTrabajando="Registrando…"
          trabajando={pagando}
          alConfirmar={pagar}
          alCerrar={() => setConfirmar(false)}
        />
      )}
    </div>
  )
}
