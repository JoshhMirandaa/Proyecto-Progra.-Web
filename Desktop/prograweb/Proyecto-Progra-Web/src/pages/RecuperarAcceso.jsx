import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PasosRecuperacion } from '../components/cuenta/PasosRecuperacion.jsx'
import { Campo, atributosControl } from '../components/ui/Campo.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import { MINUTOS_ENLACE_RECUPERACION, validarCorreoInstitucional } from '../domain/cuentas.js'

const ESPERA_REENVIO = 45

/** Vista 1.5 — Recuperar contraseña, pasos 1 (pedir enlace) y 2 (confirmación). */
export function RecuperarAcceso() {
  const { solicitarRecuperacion } = useSesion()
  const [correo, setCorreo] = useState('')
  const [tocado, setTocado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(null)
  const [segundos, setSegundos] = useState(0)

  useEffect(() => {
    if (segundos <= 0) return undefined
    const id = setTimeout(() => setSegundos((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [segundos])

  const error = tocado ? validarCorreoInstitucional(correo) : null

  const enviar = async (e) => {
    e?.preventDefault()
    setTocado(true)
    if (validarCorreoInstitucional(correo)) return
    setEnviando(true)
    const r = await solicitarRecuperacion(correo)
    setEnviando(false)
    if (r.ok) {
      setEnviado({ correo: correo.trim().toLowerCase(), enlacePrueba: r.enlacePrueba })
      setSegundos(ESPERA_REENVIO)
    }
  }

  const reloj = `00:${String(segundos).padStart(2, '0')}`

  return (
    <div className="tarjeta-acceso panel">
      <div className="panel-cuerpo">
        <PasosRecuperacion paso={enviado ? 2 : 1} />

        {enviado ? (
          <div className="exito-acceso">
            <div className="marca-exito marca-exito--sobre" aria-hidden="true">
              ✉
            </div>
            <h1>Revisa tu correo</h1>
            <p>
              Si <span className="codigo">{enviado.correo}</span> está registrado, te enviamos un
              enlace para crear una contraseña nueva.{' '}
              {segundos > 0 ? (
                <>Podrás reenviarlo en {reloj}.</>
              ) : (
                <button
                  type="button"
                  className="boton boton--texto"
                  onClick={enviar}
                  disabled={enviando}
                >
                  Reenviar enlace
                </button>
              )}
            </p>
            {enviado.enlacePrueba && (
              <div className="aviso aviso--info">
                En la primera entrega no se envían correos.{' '}
                <Link to={enviado.enlacePrueba}>Abrir el enlace de prueba</Link>
              </div>
            )}
            <Link to="/login">Volver al inicio de sesión</Link>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate>
            <h1>Recupera tu acceso</h1>
            <p className="sub-acceso">
              Te enviaremos un enlace para crear una contraseña nueva. El enlace expira en{' '}
              {MINUTOS_ENLACE_RECUPERACION} minutos.
            </p>
            <Campo id="correo" rotulo="Correo institucional" error={error}>
              <input
                type="email"
                autoComplete="email"
                placeholder="nombre@aloe.ulima.edu.pe"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                onBlur={() => setTocado(true)}
                {...atributosControl('correo', { error })}
              />
            </Campo>
            <button
              type="submit"
              className="boton boton--bloque"
              disabled={enviando}
              style={{ marginTop: '1.25rem' }}
            >
              {enviando ? 'Enviando…' : 'Enviar enlace'}
            </button>
            <p className="pie-acceso">
              <Link to="/login">Volver al inicio de sesión</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
