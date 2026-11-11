import { useRef, useState } from 'react'
import { LIMITES } from '../../domain/catalogos.js'
import { leerImagenCuadrada } from '../../utils/imagen.js'
import { clases } from '../ui/Campo.jsx'

/** Fotografías del equipo. La primera es la que se muestra en el catálogo. */
export function PanelFotografias({ fotografias, alCambiar }) {
  const entrada = useRef(null)
  const [encima, setEncima] = useState(false)
  const [error, setError] = useState(null)
  const lleno = fotografias.length >= LIMITES.fotografias.max

  async function agregar(archivos) {
    setError(null)
    const espacio = LIMITES.fotografias.max - fotografias.length
    const porLeer = Array.from(archivos).slice(0, espacio)
    if (porLeer.length === 0) return

    try {
      const nuevas = await Promise.all(
        porLeer.map(async (archivo) => ({
          url: await leerImagenCuadrada(archivo),
          alt: archivo.name.replace(/\.[^.]+$/, ''),
        })),
      )
      alCambiar([...fotografias, ...nuevas])
    } catch (e) {
      setError(e.message)
    }
  }

  function quitar(indice) {
    alCambiar(fotografias.filter((_, i) => i !== indice))
  }

  return (
    <section className="panel">
      <div className="panel-cuerpo">
        <div className="bloque-rotulo">
          <span className="rotulo">Fotografías</span>
        </div>

        <div className="fotos">
          {fotografias.map((foto, i) => (
            <div className="foto" key={`${foto.url.slice(0, 32)}-${i}`}>
              <img src={foto.url} alt={foto.alt || `Fotografía ${i + 1} del equipo`} />
              {i === 0 && <span className="foto-principal">principal</span>}
              <button
                type="button"
                className="foto-quitar"
                onClick={() => quitar(i)}
                aria-label={`Quitar la fotografía ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}

          {!lleno && (
            <button
              type="button"
              className={clases(
                'soltar',
                fotografias.length === 0 && 'soltar--sola',
                encima && 'soltar--encima',
              )}
              onClick={() => entrada.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setEncima(true)
              }}
              onDragLeave={() => setEncima(false)}
              onDrop={(e) => {
                e.preventDefault()
                setEncima(false)
                agregar(e.dataTransfer.files)
              }}
            >
              <span>Arrastra las fotografías</span>
              <span className="sm">JPG o PNG · encuadre cuadrado</span>
            </button>
          )}
        </div>

        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="oculto-visual"
          onChange={(e) => {
            agregar(e.target.files)
            e.target.value = ''
          }}
        />

        {error ? (
          <p className="campo-error" style={{ marginTop: '0.75rem' }} role="alert">
            {error}
          </p>
        ) : (
          <p className="campo-ayuda" style={{ marginTop: '0.75rem' }}>
            {lleno
              ? `Llegaste al máximo de ${LIMITES.fotografias.max} fotografías.`
              : 'La primera fotografía es la que ve el estudiante en el catálogo.'}
          </p>
        )}
      </div>
    </section>
  )
}
