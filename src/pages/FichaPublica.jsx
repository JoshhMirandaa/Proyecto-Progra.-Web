import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Cargando, EstadoVacio, ImagenConRespaldo } from '../components/ui/Piezas.jsx'
import { useInventario } from '../context/InventarioContext.jsx'
import {
  ALMACEN,
  etiquetaCategoria,
  etiquetaEstado,
  frasePreviaCondiciones,
} from '../domain/catalogos.js'

const hoy = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Vista 2.6 — Ficha pública del equipo. Es lo que ve el estudiante o el visitante;
 *  la HU-3 la enlaza desde el catálogo. */
export function FichaPublica() {
  const { equipoId } = useParams()
  const { obtenerFichaPublica, version } = useInventario()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [activa, setActiva] = useState(0)

  useEffect(() => {
    let vigente = true
    setError(null)
    obtenerFichaPublica(equipoId)
      .then((r) => vigente && setDatos(r))
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [equipoId, obtenerFichaPublica, version])

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

  if (!datos) {
    return (
      <div className="panel">
        <Cargando filas={6} etiqueta="Cargando la ficha del equipo…" />
      </div>
    )
  }

  const { equipo, unidades } = datos
  const fotos = equipo.fotografias ?? []
  const principal = fotos[activa] ?? fotos[0]
  const libres = equipo.unidadesDisponibles
  const activas = equipo.unidadesActivas

  return (
    <div>
      <nav className="migas" aria-label="Ruta">
        <Link to="/catalogo">Catálogo</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/catalogo?cat=${equipo.categoria}`}>{etiquetaCategoria(equipo.categoria)}</Link>
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
              <Link to={`/catalogo?cat=${equipo.categoria}`}>{etiquetaCategoria(equipo.categoria)}</Link>
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
          </div>
        </section>

        <aside className="panel">
          <div className="panel-cuerpo">
            <span className="rotulo">Disponibilidad actual</span>
            <p
              className={`disponibilidad-cifra${libres === 0 ? ' disponibilidad-cifra--agotado' : ''}`}
              style={{ marginTop: '0.5rem' }}
            >
              {libres} de {activas}
            </p>
            <p className="sm suave">unidades libres hoy, {hoy.format(new Date())}</p>

            <ul className="lista-unidades">
              {unidades.map((unidad) => (
                <li key={unidad.codigoInventario}>
                  <span className="codigo">{unidad.codigoInventario}</span>
                  <span className="estado" data-estado={unidad.estado}>
                    {etiquetaEstado(unidad.estado)}
                  </span>
                </li>
              ))}
            </ul>

            <button type="button" className="boton boton--bloque" disabled={libres === 0}>
              {libres === 0 ? 'Sin unidades libres hoy' : 'Solicitar préstamo'}
            </button>
            <p className="sm suave" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
              {libres === 0
                ? 'Puedes reservarlo para una fecha futura.'
                : 'Necesitas iniciar sesión para solicitar.'}
            </p>

            <hr className="separador" />
            <p className="sm medio">
              Recojo en <strong>{ALMACEN.nombre}</strong>, {ALMACEN.horarioRecojo}.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
