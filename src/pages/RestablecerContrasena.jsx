import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PasosRecuperacion } from '../components/cuenta/PasosRecuperacion.jsx'
import { Campo, atributosControl } from '../components/ui/Campo.jsx'
import { Cargando, EstadoVacio } from '../components/ui/Piezas.jsx'
import { useNotificacion } from '../context/NotificacionContext.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import { fortalezaContrasena, validarRestablecer } from '../domain/cuentas.js'
import { useFormulario } from '../hooks/useFormulario.js'

/** Vista 1.5, paso 3 — Nueva contraseña, desde el enlace del correo. */
export function RestablecerContrasena() {
  const [parametros] = useSearchParams()
  const token = parametros.get('token') ?? ''
  const { revisarEnlaceRecuperacion, restablecerContrasena } = useSesion()
  const notificacion = useNotificacion()
  const navegar = useNavigate()
  const [enlace, setEnlace] = useState({ token: null, correo: null, error: null })

  useEffect(() => {
    let vigente = true
    revisarEnlaceRecuperacion(token).then(
      (r) =>
        vigente &&
        setEnlace({ token, correo: r.ok ? r.correo : null, error: r.ok ? null : r.error }),
    )
    return () => {
      vigente = false
    }
  }, [token, revisarEnlaceRecuperacion])

  const { valores, errorDe, ponerValor, tocar, enviar, enviando } = useFormulario({
    inicial: { nueva: '', confirmar: '' },
    validar: validarRestablecer,
  })

  const guardar = async (datos) => {
    const r = await restablecerContrasena(token, datos)
    if (r.ok) {
      notificacion.exito('Tu contraseña se actualizó. Ya puedes iniciar sesión.')
      navegar('/login', { replace: true })
    } else notificacion.error(r.error)
  }

  if (enlace.token !== token) {
    return (
      <div className="tarjeta-acceso panel">
        <Cargando filas={4} etiqueta="Revisando el enlace…" />
      </div>
    )
  }

  if (enlace.error) {
    return (
      <div className="tarjeta-acceso panel">
        <EstadoVacio marca="!" titulo="Este enlace ya no sirve" descripcion={enlace.error}>
          <Link to="/recuperar" className="boton boton--contorno">
            Pedir un enlace nuevo
          </Link>
        </EstadoVacio>
      </div>
    )
  }

  const fuerza = fortalezaContrasena(valores.nueva)

  return (
    <div className="tarjeta-acceso panel">
      <form className="panel-cuerpo" onSubmit={enviar(guardar)} noValidate>
        <PasosRecuperacion paso={3} />
        <h1>Crea una contraseña nueva</h1>
        <p className="sub-acceso">
          Para <span className="codigo">{enlace.correo}</span>. Mínimo 8 caracteres, una mayúscula y
          un número.
        </p>
        <Campo id="nueva" rotulo="Nueva contraseña" error={errorDe('nueva')}>
          <input
            type="password"
            autoComplete="new-password"
            value={valores.nueva}
            onChange={(e) => ponerValor('nueva', e.target.value)}
            onBlur={() => tocar('nueva')}
            {...atributosControl('nueva', { error: errorDe('nueva') })}
          />
        </Campo>
        {fuerza.nivel && (
          <div className="fortaleza" data-puntaje={fuerza.puntaje} aria-live="polite">
            <span className="fortaleza-barra" />
            <span className="fortaleza-texto">{fuerza.nivel}</span>
          </div>
        )}
        <Campo id="confirmar" rotulo="Confirmar contraseña" error={errorDe('confirmar')}>
          <input
            type="password"
            autoComplete="new-password"
            value={valores.confirmar}
            onChange={(e) => ponerValor('confirmar', e.target.value)}
            onBlur={() => tocar('confirmar')}
            {...atributosControl('confirmar', { error: errorDe('confirmar') })}
          />
        </Campo>
        <button
          type="submit"
          className="boton boton--bloque"
          disabled={enviando}
          style={{ marginTop: '1.25rem' }}
        >
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  )
}
