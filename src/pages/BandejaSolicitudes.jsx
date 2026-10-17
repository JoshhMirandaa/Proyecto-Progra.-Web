import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EstadoSolicitud } from '../components/catalogo/EstadoSolicitud.jsx'
import { ModalAprobacion } from '../components/prestamos/ModalAprobacion.jsx'
import { ModalRechazo } from '../components/prestamos/ModalRechazo.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { Cargando, EstadoVacio, Paginacion } from '../components/ui/Piezas.jsx'
import { usePrestamos } from '../context/PrestamosContext.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import { formatearSoles } from '../domain/catalogos.js'
import { FILTROS_BANDEJA_INICIALES } from '../domain/prestamos.js'
import { duracionDias, formatearFecha, formatearFechaCorta } from '../domain/solicitudes.js'

const PESTANAS = [
  { valor: 'pendiente', etiqueta: 'Enviadas', cuenta: 'pendiente' },
  { valor: 'aprobada', etiqueta: 'Aprobadas', cuenta: 'aprobada' },
  { valor: 'en_prestamo', etiqueta: 'Entregadas', cuenta: 'en_prestamo' },
  { valor: 'rechazada', etiqueta: 'Rechazadas', cuenta: 'rechazada' },
  { valor: 'todos', etiqueta: 'Todas', cuenta: 'total' },
]

/** Los filtros viven en la URL: se puede volver con «atrás» o compartir el enlace. */
function leerFiltros(parametros) {
  const f = { ...FILTROS_BANDEJA_INICIALES }
  for (const clave of ['estado', 'equipoId', 'desde', 'hasta', 'texto'])
    if (parametros.has(clave)) f[clave] = parametros.get(clave)
  f.pagina = Number(parametros.get('pagina')) || 1
  return f
}

/** Vista 4.1 — Bandeja de solicitudes del encargado. */
export function BandejaSolicitudes() {
  const { listarBandeja, version } = usePrestamos()
  const { encargadoActivo } = useSesion()
  const [parametros, setParametros] = useSearchParams()
  const filtros = leerFiltros(parametros)
  const clave = parametros.toString()

  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [texto, setTexto] = useState(filtros.texto)
  const [aprobando, setAprobando] = useState(null)
  const [rechazando, setRechazando] = useState(null)
  const [motivo, setMotivo] = useState(null)

  useEffect(() => {
    let vigente = true
    setError(null)
    listarBandeja(leerFiltros(new URLSearchParams(clave)))
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [clave, version, listarBandeja])

  // La búsqueda se aplica al dejar de escribir, no en cada tecla. El temporizador llama a la
  // versión más reciente de `cambiar` para no reponer filtros que ya se limpiaron.
  const temporizador = useRef(null)
  const cambiarVigente = useRef(null)
  useEffect(() => {
    cambiarVigente.current = cambiar
  })
  useEffect(() => () => clearTimeout(temporizador.current), [])

  const escribirBusqueda = (valor) => {
    setTexto(valor)
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => cambiarVigente.current({ texto: valor }), 300)
  }

  // Se parte de la URL vigente (no de este render): la búsqueda diferida no pisa otro filtro.
  function cambiar(cambios) {
    setParametros(
      (previos) => {
        const siguiente = { ...leerFiltros(previos), pagina: 1, ...cambios }
        const p = new URLSearchParams()
        for (const [k, v] of Object.entries(siguiente))
          if (v !== '' && v !== FILTROS_BANDEJA_INICIALES[k]) p.set(k, String(v))
        return p
      },
      { replace: true },
    )
  }

  const limpiar = () => {
    clearTimeout(temporizador.current)
    setTexto('')
    setParametros(filtros.estado === 'pendiente' ? {} : { estado: filtros.estado }, {
      replace: true,
    })
  }
  const hayFiltros = filtros.equipoId !== 'todos' || filtros.desde || filtros.hasta || filtros.texto

  const proponer = (solicitud, rango) => {
    setAprobando(null)
    setRechazando({
      solicitud,
      inicial: {
        motivo: 'Fechas no disponibles',
        detalle: `No quedan unidades libres en las fechas que pediste. Puedes solicitarlo del ${formatearFechaCorta(rango.inicio)} al ${formatearFecha(rango.fin)}, que sí hay disponibilidad.`,
      },
    })
  }

  const c = datos?.contadores

  return (
    <div>
      <div className="cabecera-vista">
        <div>
          <h1>Solicitudes</h1>
          <p className="sub">
            {c
              ? `${c.pendiente} pendientes de revisión · ${c.aprobada} aprobadas por entregar · ${c.en_prestamo} en préstamo`
              : 'Cargando…'}
          </p>
        </div>
      </div>

      {!encargadoActivo && (
        <div className="aviso aviso--atencion" style={{ marginBottom: '1rem' }}>
          Tu alta de encargado está pendiente de aprobación. Puedes revisar la bandeja, pero aún no
          aprobar, rechazar ni entregar.
        </div>
      )}

      {datos?.deuda.estudiantes > 0 && (
        <div className="aviso aviso--atencion" style={{ marginBottom: '1rem' }}>
          {datos.deuda.estudiantes === 1
            ? '1 estudiante de esta lista tiene'
            : `${datos.deuda.estudiantes} estudiantes de esta lista tienen`}{' '}
          penalidades pendientes por {formatearSoles(datos.deuda.monto)}. Aparecen marcados con
          «Deuda».
        </div>
      )}

      <div className="pestanas" role="tablist" aria-label="Estado de la solicitud">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            type="button"
            role="tab"
            aria-selected={filtros.estado === p.valor}
            onClick={() => {
              clearTimeout(temporizador.current)
              setTexto('')
              setParametros(p.valor === 'pendiente' ? {} : { estado: p.valor }, { replace: true })
            }}
          >
            {p.etiqueta}
            {c && <span className="pestana-cuenta">{c[p.cuenta]}</span>}
          </button>
        ))}
      </div>

      <div className="filtros-bandeja">
        <div className="buscador">
          <label className="oculto-visual" htmlFor="buscar-solicitud">
            Buscar por estudiante, curso, equipo o código
          </label>
          <input
            id="buscar-solicitud"
            type="search"
            className="entrada"
            placeholder="Buscar por estudiante, curso, equipo o código"
            value={texto}
            onChange={(e) => escribirBusqueda(e.target.value)}
          />
        </div>
        <label>
          <span className="oculto-visual">Filtrar por equipo</span>
          <select
            className="entrada"
            value={filtros.equipoId}
            onChange={(e) => cambiar({ equipoId: e.target.value })}
          >
            <option value="todos">Equipo: todos</option>
            {datos?.equipos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
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
              value={filtros.desde}
              max={filtros.hasta || undefined}
              onChange={(e) => cambiar({ desde: e.target.value })}
            />
          </label>
          <span aria-hidden="true">—</span>
          <label>
            <span className="oculto-visual">Hasta</span>
            <input
              type="date"
              className="entrada entrada--mono"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              onChange={(e) => cambiar({ hasta: e.target.value })}
            />
          </label>
        </div>
        {hayFiltros && (
          <button type="button" className="boton boton--texto" onClick={limpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      <section className="panel">
        {error ? (
          <div style={{ padding: '1.5rem' }}>
            <div className="aviso aviso--error">{error}</div>
          </div>
        ) : !datos ? (
          <Cargando filas={6} etiqueta="Cargando solicitudes…" />
        ) : datos.total === 0 ? (
          hayFiltros ? (
            <EstadoVacio
              marca="?"
              titulo="Ninguna solicitud coincide con estos filtros"
              descripcion="Prueba con otro equipo, amplía el rango de fechas o borra la búsqueda."
            >
              <button type="button" className="boton boton--contorno" onClick={limpiar}>
                Limpiar filtros
              </button>
            </EstadoVacio>
          ) : (
            <EstadoVacio
              marca="✓"
              titulo={
                filtros.estado === 'pendiente'
                  ? 'No hay solicitudes pendientes'
                  : 'No hay solicitudes en este estado'
              }
              descripcion={
                filtros.estado === 'pendiente'
                  ? 'Cuando un estudiante envíe una solicitud desde el catálogo aparecerá aquí.'
                  : undefined
              }
            />
          )
        ) : (
          <>
            <div className="tabla-marco">
              <table className="tabla tabla-bandeja">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Equipo y curso</th>
                    <th>Fechas</th>
                    <th>Motivo</th>
                    <th>Antigüedad</th>
                    <th>Estado</th>
                    <th>
                      <span className="oculto-visual">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {datos.solicitudes.map((s) => (
                    <FilaSolicitud
                      key={s.id}
                      s={s}
                      habilitado={encargadoActivo}
                      alAprobar={() => setAprobando(s.id)}
                      alRechazar={() => setRechazando({ solicitud: s })}
                      alVerMotivo={() => setMotivo(s)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tabla-pie">
              <span>
                Mostrando {datos.desde}–{datos.hasta} de {datos.total}
              </span>
              <Paginacion
                pagina={datos.pagina}
                totalPaginas={datos.totalPaginas}
                alCambiar={(pagina) => cambiar({ pagina })}
              />
            </div>
          </>
        )}
      </section>

      {aprobando && (
        <ModalAprobacion
          solicitudId={aprobando}
          alCerrar={() => setAprobando(null)}
          alProponer={proponer}
        />
      )}
      {motivo && (
        <Modal
          titulo="Motivo del rechazo"
          subtitulo={`Solicitud ${motivo.id} · ${motivo.estudianteNombre}`}
          alCerrar={() => setMotivo(null)}
          ancho="520px"
        >
          <div className="aviso aviso--error" style={{ marginTop: '1rem' }}>
            {motivo.motivoRechazo || 'No se registró un motivo.'}
          </div>
          <p className="sm suave" style={{ marginTop: '0.75rem' }}>
            El estudiante ve este mismo texto en «Mis solicitudes».
          </p>
          <div className="modal-acciones">
            <button type="button" className="boton boton--neutro" onClick={() => setMotivo(null)}>
              Cerrar
            </button>
          </div>
        </Modal>
      )}
      {rechazando && (
        <ModalRechazo
          solicitud={rechazando.solicitud}
          inicial={rechazando.inicial}
          alCerrar={() => setRechazando(null)}
        />
      )}
    </div>
  )
}

function FilaSolicitud({ s, habilitado, alAprobar, alRechazar, alVerMotivo }) {
  const dias = duracionDias(s.fechaInicio, s.fechaFin)
  return (
    <tr>
      <td>
        <span className="tabla-nombre">{s.estudianteNombre}</span>
        <p className="sm suave">
          {s.estudianteDetalle || s.estudianteCodigo}
          {s.deudaEstudiante > 0 && (
            <span
              className="marca-deuda"
              title={`Penalidades pendientes: ${formatearSoles(s.deudaEstudiante)}`}
            >
              Deuda {formatearSoles(s.deudaEstudiante)}
            </span>
          )}
        </p>
      </td>
      <td>
        <span className="tabla-nombre">{s.equipoNombre}</span>
        <p className="sm suave">{s.cursoNombre}</p>
      </td>
      <td className="sin-corte">
        <span className="codigo">
          {formatearFechaCorta(s.fechaInicio)} → {formatearFecha(s.fechaFin)}
        </span>
        <p className="sm suave">
          {dias} {dias === 1 ? 'día' : 'días'}
          {s.codigoUnidad && <> · {s.codigoUnidad}</>}
        </p>
      </td>
      <td className="celda-motivo">
        <p className="sm" title={s.motivo}>
          {s.motivo}
        </p>
      </td>
      <td className="sm suave sin-corte">{s.antiguedad}</td>
      <td>
        <EstadoSolicitud estado={s.estado} />
      </td>
      <td>
        <div className="acciones-bandeja">
          {s.estado === 'pendiente' && (
            <>
              <button
                type="button"
                className="boton boton--sm"
                onClick={alAprobar}
                disabled={!habilitado}
              >
                Aprobar
              </button>
              <button
                type="button"
                className="boton boton--sm boton--neutro"
                onClick={alRechazar}
                disabled={!habilitado}
              >
                Rechazar
              </button>
            </>
          )}
          {s.estado === 'aprobada' &&
            (habilitado ? (
              <Link to={`/entregas/${s.id}`} className="boton boton--sm">
                Registrar entrega
              </Link>
            ) : (
              <button type="button" className="boton boton--sm" disabled>
                Registrar entrega
              </button>
            ))}
          {s.estado === 'rechazada' && (
            <button type="button" className="boton boton--sm boton--texto" onClick={alVerMotivo}>
              Ver motivo
            </button>
          )}
          {(s.estado === 'en_prestamo' || s.estado === 'devuelta') && s.codigoPrestamo && (
            <Link
              to={`/constancias/${s.codigoPrestamo}`}
              className="boton boton--sm boton--contorno"
            >
              Ver constancia
            </Link>
          )}
        </div>
      </td>
    </tr>
  )
}
