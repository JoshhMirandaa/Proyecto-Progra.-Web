import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { TarjetaEquipo, TarjetasCargando } from '../components/catalogo/TarjetaEquipo.jsx'
import { useCatalogo } from '../context/CatalogoContext.jsx'
import { ALMACEN } from '../domain/catalogos.js'

const PASOS = [
  {
    titulo: 'Solicita con anticipación',
    texto: 'El encargado responde en un máximo de 24 horas hábiles.',
  },
  {
    titulo: 'Recoge con tu carné',
    texto: 'Verifica los accesorios en la entrega y firma la constancia.',
  },
  {
    titulo: 'Devuelve a tiempo',
    texto: 'Cada día de retraso genera penalidad y bloquea nuevos préstamos.',
  },
]

/** Vista 1.1 — Página de inicio pública. Los equipos destacados salen del catálogo (HU-3). */
export function Inicio() {
  const { listarCatalogo } = useCatalogo()
  const navegar = useNavigate()
  const { hash } = useLocation()
  const [destacados, setDestacados] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    let vigente = true
    listarCatalogo({ porPagina: 4 })
      .then((r) => vigente && setDestacados(r.equipos))
      .catch(() => vigente && setDestacados([]))
    return () => {
      vigente = false
    }
  }, [listarCatalogo])

  // Los enlaces «Reglas del préstamo» y «Ayuda» de la barra apuntan a secciones de esta página.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  const buscar = (e) => {
    e.preventDefault()
    const texto = busqueda.trim()
    navegar(texto ? `/catalogo?q=${encodeURIComponent(texto)}` : '/catalogo')
  }

  return (
    <div className="inicio">
      <section className="inicio-portada">
        <div>
          <h1>Reserva el equipo del laboratorio antes de tu práctica</h1>
          <p className="prosa">
            Busca por equipo o categoría, revisa cuántas unidades hay libres y solicita el préstamo
            con tus fechas. Recojo en el {ALMACEN.nombre}.
          </p>
          <form className="inicio-busqueda" role="search" onSubmit={buscar}>
            <label className="oculto-visual" htmlFor="busqueda-inicio">
              Buscar un equipo
            </label>
            <input
              id="busqueda-inicio"
              className="entrada"
              type="search"
              placeholder="Busca un equipo: «osciloscopio» o «robótica»"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button type="submit" className="boton">
              Buscar
            </button>
          </form>
        </div>
        <div className="inicio-foto miniatura--vacia" role="presentation" />
      </section>

      <section aria-labelledby="titulo-destacados">
        <div className="cabecera-vista">
          <h2 id="titulo-destacados">Equipos destacados</h2>
          <Link to="/catalogo">Ver todo el catálogo →</Link>
        </div>
        {destacados === null ? (
          <TarjetasCargando cantidad={4} />
        ) : (
          <div className="rejilla-catalogo">
            {destacados.map((equipo) => (
              <TarjetaEquipo key={equipo.id} equipo={equipo} />
            ))}
          </div>
        )}
      </section>

      <section id="reglas" className="inicio-pasos" aria-label="Reglas del préstamo">
        {PASOS.map((paso, i) => (
          <article key={paso.titulo} className="panel panel-cuerpo">
            <span className="inicio-paso-numero">{i + 1}</span>
            <h3>{paso.titulo}</h3>
            <p className="sm medio">{paso.texto}</p>
          </article>
        ))}
      </section>

      <section id="ayuda" className="recuadro inicio-ayuda">
        <strong>¿Necesitas ayuda?</strong> Escribe a almacen.equipos@ulima.edu.pe o llama al anexo
        3120, {ALMACEN.horarioRecojo}.
      </section>
    </div>
  )
}
