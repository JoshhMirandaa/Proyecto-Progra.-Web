import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cargando, EstadoVacio } from '../components/ui/Piezas.jsx'
import { usePrestamos } from '../context/PrestamosContext.jsx'
import { HORA_DEVOLUCION } from '../domain/prestamos.js'
import { formatearFecha } from '../domain/solicitudes.js'

const GRUPOS = [
  { tipo: 'vencido', titulo: 'Vencidos', columna: 'Retraso' },
  { tipo: 'hoy', titulo: 'Vencen hoy', columna: 'Vence' },
  { tipo: 'en_curso', titulo: 'En curso', columna: 'Días restantes' },
]

/** Vista 4.6 — Préstamos vigentes, agrupados en vencidos, vencen hoy y en curso. */
export function PrestamosVigentes({ soloVencidos = false }) {
  const { listarVigentes, version } = usePrestamos()
  const [lista, setLista] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    listarVigentes()
      .then((l) => vigente && setLista(l))
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [listarVigentes, version])

  const de = (tipo) => (lista ?? []).filter((p) => p.vigencia.tipo === tipo)
  const grupos = soloVencidos ? GRUPOS.slice(0, 1) : GRUPOS

  return (
    <div>
      <div className="cabecera-vista">
        <div>
          <h1>{soloVencidos ? 'Préstamos vencidos' : 'Préstamos vigentes'}</h1>
          <p className="sub">
            {lista
              ? `${lista.length} ${lista.length === 1 ? 'préstamo activo' : 'préstamos activos'} · ${de('hoy').length} vence hoy · ${de('vencido').length} vencidos`
              : 'Cargando…'}
          </p>
        </div>
        {soloVencidos && (
          <Link to="/prestamos" className="boton boton--contorno">
            Ver todos los vigentes
          </Link>
        )}
      </div>

      {error ? (
        <div className="aviso aviso--error">{error}</div>
      ) : !lista ? (
        <section className="panel">
          <Cargando filas={5} etiqueta="Cargando préstamos…" />
        </section>
      ) : lista.length === 0 ? (
        <section className="panel">
          <EstadoVacio
            marca="✓"
            titulo="No hay préstamos vigentes"
            descripcion="Cuando registres una entrega desde la bandeja de solicitudes aparecerá aquí."
          >
            <Link to="/solicitudes?estado=aprobada" className="boton boton--contorno">
              Ver solicitudes aprobadas
            </Link>
          </EstadoVacio>
        </section>
      ) : (
        grupos.map((g) => <GrupoPrestamos key={g.tipo} grupo={g} prestamos={de(g.tipo)} />)
      )}
    </div>
  )
}

function GrupoPrestamos({ grupo, prestamos }) {
  return (
    <section
      className="panel grupo-prestamos"
      data-tipo={grupo.tipo}
      aria-labelledby={`grupo-${grupo.tipo}`}
    >
      <h2 className="grupo-titulo" id={`grupo-${grupo.tipo}`}>
        {grupo.titulo} · {prestamos.length}
      </h2>
      {prestamos.length === 0 ? (
        <p className="grupo-vacio sm suave">
          {grupo.tipo === 'vencido' ? 'Ningún préstamo está vencido.' : 'Ninguno por ahora.'}
        </p>
      ) : (
        <div className="tabla-marco">
          <table className="tabla tabla-vigentes">
            <thead>
              <tr>
                <th>Préstamo</th>
                <th>Unidad</th>
                <th>Estudiante</th>
                <th>Vencimiento</th>
                <th>{grupo.columna}</th>
                <th>
                  <span className="oculto-visual">Acciones</span>
                </th>
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
                    <span className="codigo">{p.codigoUnidad}</span>
                    <p className="sm suave">{p.equipoNombre}</p>
                  </td>
                  <td>
                    <Link to={`/estudiantes/${p.estudianteId}`} className="tabla-nombre">
                      {p.estudianteNombre}
                    </Link>
                    <p className="sm suave">{p.cursoNombre}</p>
                  </td>
                  <td className="codigo sin-corte">
                    {formatearFecha(p.fechaFin)}
                    <p className="sm suave">{HORA_DEVOLUCION}</p>
                  </td>
                  <td>
                    <span className="vigencia" data-tipo={p.vigencia.tipo}>
                      {p.vigencia.texto}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-bandeja">
                      <Link
                        to={`/constancias/${p.codigoPrestamo}`}
                        className="boton boton--sm boton--neutro"
                      >
                        Constancia
                      </Link>
                      {p.vigencia.tipo !== 'vencido' && (
                        <Link
                          to={`/devoluciones?codigo=${p.codigoPrestamo}&accion=renovar`}
                          className="boton boton--sm boton--neutro"
                        >
                          Renovar
                        </Link>
                      )}
                      <Link
                        to={`/devoluciones?codigo=${p.codigoPrestamo}`}
                        className="boton boton--sm boton--contorno"
                      >
                        Registrar devolución
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
