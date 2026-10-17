import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Cargando, EstadoVacio } from '../components/ui/Piezas.jsx'
import { usePrestamos } from '../context/PrestamosContext.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import { formatearSoles } from '../domain/catalogos.js'
import { duracionDias, formatearFecha } from '../domain/solicitudes.js'

const fechaHora = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Vista 4.5 — Constancia de entrega. La ven el encargado y el estudiante dueño del préstamo. */
export function ConstanciaEntrega() {
  const { codigo } = useParams()
  const { obtenerConstancia } = usePrestamos()
  const { esEncargado } = useSesion()
  const [c, setC] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerConstancia(codigo)
      .then((d) => vigente && setC(d))
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
    // La función cambia con el usuario en sesión; el código manda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo])

  const volver = esEncargado ? (
    <Link to="/prestamos" className="boton boton--neutro">
      Ir a préstamos vigentes
    </Link>
  ) : (
    <Link to="/mis-solicitudes" className="boton boton--neutro">
      Volver a mis solicitudes
    </Link>
  )

  if (error)
    return (
      <section className="panel">
        <EstadoVacio marca="!" titulo="No podemos mostrar esta constancia" descripcion={error}>
          {volver}
        </EstadoVacio>
      </section>
    )
  if (!c)
    return (
      <section className="panel">
        <Cargando filas={6} etiqueta="Cargando la constancia…" />
      </section>
    )

  const dias = duracionDias(c.fechaInicio, c.fechaFin)
  const faltantes = c.detalleAccesorios.filter((a) => !a.entregado)

  return (
    <div className="constancia-pagina">
      <div className="fila-fin no-imprimir" style={{ marginBottom: '1rem' }}>
        {volver}
        <button
          type="button"
          className="boton boton--contorno"
          onClick={() => window.print()}
          title="En el diálogo de impresión elige «Guardar como PDF»"
        >
          Descargar PDF
        </button>
        <button type="button" className="boton" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      <article className="panel constancia" aria-labelledby="titulo-constancia">
        <header className="constancia-cabecera">
          <div>
            <p className="rotulo">Universidad de Lima · {c.almacen}</p>
            <h1 id="titulo-constancia">Constancia de entrega de equipo</h1>
          </div>
          <div className="constancia-numero">
            <span className="rotulo">Código de préstamo</span>
            <span className="codigo constancia-codigo">{c.codigoPrestamo}</span>
          </div>
        </header>

        <div className="constancia-cuerpo">
          <section>
            <h2 className="rotulo">Estudiante</h2>
            <p className="constancia-dato">{c.estudianteNombre}</p>
            <p className="sm suave">
              {c.estudianteCodigo && <>Código {c.estudianteCodigo} · </>}
              {c.estudianteDetalle}
            </p>
          </section>
          <section>
            <h2 className="rotulo">Curso</h2>
            <p className="constancia-dato">{c.cursoNombre}</p>
            <p className="sm suave">{c.cursoDocente}</p>
          </section>
          <section>
            <h2 className="rotulo">Equipo</h2>
            <p className="constancia-dato">{c.equipoNombreCompleto}</p>
            <p className="sm suave">
              Unidad <span className="codigo">{c.codigoUnidad}</span>
              {c.ubicacionUnidad && <> · {c.ubicacionUnidad}</>}
            </p>
          </section>
          <section>
            <h2 className="rotulo">Periodo</h2>
            <p className="constancia-dato codigo">
              {formatearFecha(c.fechaInicio)} → {formatearFecha(c.fechaFin)}
            </p>
            <p className="sm suave">
              {dias} {dias === 1 ? 'día' : 'días'}
            </p>
          </section>
          <section>
            <h2 className="rotulo">Entregado el</h2>
            <p className="constancia-dato codigo">
              {fechaHora.format(new Date(c.fechaEntregaReal))}
            </p>
            <p className="sm suave">por {c.encargadoNombre || 'el encargado de almacén'}</p>
          </section>
          <section className="constancia-devolucion">
            <h2 className="rotulo">Devolver a más tardar</h2>
            <p className="constancia-dato codigo">{c.devolucionTexto}</p>
            {c.penalidadPorDia > 0 && (
              <p className="sm">
                Penalidad por retraso: {formatearSoles(c.penalidadPorDia)} por día.
              </p>
            )}
          </section>
        </div>

        <section className="constancia-seccion">
          <h2 className="rotulo">Accesorios</h2>
          {c.detalleAccesorios.length === 0 ? (
            <p className="sm suave">El equipo se entrega sin accesorios.</p>
          ) : (
            <ul className="constancia-accesorios">
              {c.detalleAccesorios.map((a) => (
                <li key={a.nombre} data-entregado={a.entregado || undefined}>
                  <span aria-hidden="true">{a.entregado ? '✓' : '✗'}</span>
                  <span>
                    {a.nombre}
                    <span className="oculto-visual">
                      {a.entregado ? ' (entregado)' : ' (no entregado)'}
                    </span>
                    {a.nota && <span className="suave"> · {a.nota}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {faltantes.length > 0 && (
            <p className="sm texto-peligro" style={{ marginTop: '0.5rem' }}>
              No se entregó: {faltantes.map((a) => a.nombre).join(', ')}. No se cobrará al devolver.
            </p>
          )}
        </section>

        <section className="constancia-seccion">
          <h2 className="rotulo">Estado del equipo al entregar</h2>
          <p className="prosa">{c.observacionesEntrega}</p>
        </section>

        <p className="constancia-declaracion">
          Declaro recibir el equipo en las condiciones descritas y me comprometo a devolverlo en la
          fecha pactada.
          {c.penalidadPorDia > 0 &&
            ` El retraso genera una penalidad de ${formatearSoles(c.penalidadPorDia)} por día y suspende nuevos préstamos.`}
        </p>

        <footer className="constancia-firmas">
          <div>
            <span className="constancia-linea" />
            <p className="sm">{c.encargadoNombre || 'Encargado de almacén'}</p>
            <p className="sm suave">Firma del encargado de almacén</p>
          </div>
          <div>
            <span className="constancia-linea" />
            <p className="sm">{c.estudianteNombre}</p>
            <p className="sm suave">Firma del estudiante</p>
          </div>
        </footer>
      </article>
    </div>
  )
}
