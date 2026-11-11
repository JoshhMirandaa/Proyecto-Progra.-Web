import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Cargando, EstadoVacio, ImagenConRespaldo } from '../components/ui/Piezas.jsx'
import { useCatalogo } from '../context/CatalogoContext.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import {
  ALMACEN,
  etiquetaCategoria,
  etiquetaEstado,
  formatearSoles,
  frasePreviaCondiciones,
} from '../domain/catalogos.js'
import {
  ESTADOS_ABIERTOS,
  etiquetaSolicitud,
  formatearFecha,
  hoyISO,
} from '../domain/solicitudes.js'
import { useDetalleEquipo } from '../hooks/useDetalleEquipo.js'

/** Vista 3.2 — Detalle del equipo para el estudiante, con su disponibilidad. */
export function DetalleEquipoCatalogo() {
  const { equipoId } = useParams()
  const { usuario } = useSesion()
  const { misSolicitudes } = useCatalogo()
  const { equipo, proximaLiberacion, cargando, error } = useDetalleEquipo(equipoId)
  const [activa, setActiva] = useState(0)

  if (error) {
    return (
      <section className="panel">
        <EstadoVacio marca="□" titulo="Este equipo no está en el catálogo" descripcion={error}>
          <Link to="/catalogo" className="boton boton--contorno">
            Volver al catálogo
          </Link>
        </EstadoVacio>
      </section>
    )
  }

  if (cargando) {
    return (
      <div className="panel">
        <Cargando filas={6} etiqueta="Cargando la ficha del equipo…" />
      </div>
    )
  }

  const fotos = equipo.fotografias ?? []
  const principal = fotos[activa] ?? fotos[0]
  const libres = equipo.unidadesDisponibles
  const activas = equipo.unidadesActivas
  const deuda = Number(usuario.deudaPendiente) || 0
  const abierta = misSolicitudes.find(
    (s) => s.equipoId === equipo.id && ESTADOS_ABIERTOS.includes(s.estado),
  )
  const categoria = etiquetaCategoria(equipo.categoria)
  const puedeSolicitar = libres > 0 && deuda === 0

  return (
    <div>
      <nav className="migas" aria-label="Ruta">
        <Link to="/catalogo">Catálogo</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/catalogo?cat=${equipo.categoria}`}>{categoria}</Link>
        <span aria-hidden="true">/</span>
        <span>{equipo.nombre}</span>
      </nav>

      <div className="rejilla-ficha">
        <div className="galeria">
          <ImagenConRespaldo
            className="galeria-principal"
            src={principal?.url}
            alt={principal?.alt || `Fotografía de ${equipo.nombre}`}
          />
          {fotos.length > 1 && (
            <div className="galeria-tiras">
              {fotos.map((foto, i) => (
                <button
                  key={`${foto.url.slice(0, 24)}-${i}`}
                  type="button"
                  className="galeria-tira"
                  aria-current={i === activa}
                  aria-label={`Ver la fotografía ${i + 1} de ${fotos.length}`}
                  onClick={() => setActiva(i)}
                >
                  <ImagenConRespaldo src={foto.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="panel">
          <div className="panel-cuerpo">
            <h1>{equipo.nombre}</h1>
            <p className="medio" style={{ marginTop: '0.35rem' }}>
              {equipo.marca} · {equipo.modelo} ·{' '}
              <Link to={`/catalogo?cat=${equipo.categoria}`}>{categoria}</Link>
            </p>

            {equipo.descripcion && (
              <p className="prosa" style={{ marginTop: '1rem' }}>
                {equipo.descripcion}
              </p>
            )}

            {equipo.accesorios?.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <span className="rotulo campo-rotulo">Accesorios incluidos</span>
                <div className="fichas">
                  {equipo.accesorios.map((accesorio) => (
                    <span key={accesorio} className="ficha">
                      {accesorio}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="recuadro" style={{ marginTop: '1.5rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Condiciones del préstamo</p>
              <p className="sm medio">{frasePreviaCondiciones(equipo.condicionesPrestamo)}</p>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <span className="rotulo campo-rotulo">Unidades de este equipo</span>
              <ul className="unidades-catalogo">
                {equipo.unidades.map((u) => (
                  <li key={u.id} data-estado={u.estado}>
                    <span className="codigo">{u.codigoInventario}</span>
                    <span>{etiquetaEstado(u.estado)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <aside className="columna-disponibilidad">
          <div className="panel">
            <div className="panel-cuerpo">
              <span className="rotulo">Disponibilidad</span>
              <p
                className={`disponibilidad-cifra${libres === 0 ? ' disponibilidad-cifra--agotado' : ''}`}
                style={{ marginTop: '0.5rem' }}
              >
                {libres} de {activas}
              </p>
              <p className="sm suave">unidades libres hoy, {formatearFecha(hoyISO())}</p>

              {puedeSolicitar ? (
                <Link
                  to={`/catalogo/${equipo.id}/solicitar`}
                  className="boton boton--bloque"
                  style={{ marginTop: '1.25rem' }}
                >
                  Solicitar préstamo
                </Link>
              ) : (
                <button
                  type="button"
                  className="boton boton--bloque"
                  disabled
                  style={{ marginTop: '1.25rem' }}
                >
                  Solicitar préstamo
                </button>
              )}
              <Link
                to="/reservas"
                className="boton boton--contorno boton--bloque"
                style={{ marginTop: '0.6rem' }}
              >
                {libres === 0 && deuda === 0 ? 'Reservar' : 'Ver calendario de ocupación'}
              </Link>

              <hr className="separador" />
              <p className="sm medio">
                Recojo en <strong>{ALMACEN.nombre}</strong> · {ALMACEN.horarioRecojo}.
              </p>
            </div>
          </div>

          {deuda > 0 && (
            <div className="aviso aviso--error">
              <strong>Con deuda pendiente: {formatearSoles(deuda)}</strong> · no puedes solicitar
              hasta regularizar en el almacén. <Link to="/mi-deuda">Ver mi deuda</Link>
            </div>
          )}
          {deuda === 0 && libres === 0 && (
            <div className="aviso aviso--atencion">
              <strong>Sin unidades libres: 0 de {activas}</strong>
              {proximaLiberacion
                ? ` · la próxima se libera el ${formatearFecha(proximaLiberacion)}.`
                : ' por ahora.'}{' '}
              Puedes reservarlo para una fecha futura.
            </div>
          )}
          {abierta && (
            <div className="aviso aviso--info">
              Ya tienes una solicitud {etiquetaSolicitud(abierta.estado).toLowerCase()} de este
              equipo del {formatearFecha(abierta.fechaInicio)} al {formatearFecha(abierta.fechaFin)}
              . <Link to="/mis-solicitudes">Ver mis solicitudes</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
