import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Campo, atributosControl } from '../components/ui/Campo.jsx'
import { useNotificacion } from '../context/NotificacionContext.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import { destinoTrasIngresar, validarInicioSesion } from '../domain/cuentas.js'
import { useFormulario } from '../hooks/useFormulario.js'

/** Vista 1.2 — Inicio de sesión. */
export function IniciarSesion() {
  const { conSesion, rol, iniciarSesion } = useSesion()
  const notificacion = useNotificacion()
  const navegar = useNavigate()
  const { state } = useLocation()
  const [fallo, setFallo] = useState(null)

  const { valores, errorDe, ponerValor, tocar, enviar, enviando } = useFormulario({
    inicial: { correo: '', contrasena: '', recordarme: false },
    validar: validarInicioSesion,
  })

  if (conSesion) return <Navigate to={destinoTrasIngresar(state?.desde, rol)} replace />

  const ingresar = async (datos) => {
    setFallo(null)
    const r = await iniciarSesion(datos)
    if (!r.ok) {
      setFallo(r)
      return
    }
    if (r.aviso) notificacion.aviso(r.aviso)
    else notificacion.exito(`Hola, ${r.usuario.nombres.split(' ')[0]}.`)
    navegar(destinoTrasIngresar(state?.desde, r.usuario.rol), { replace: true })
  }

  const credenciales = fallo?.tipo === 'credenciales'

  return (
    <div className="tarjeta-acceso panel">
      <form className="panel-cuerpo" onSubmit={enviar(ingresar)} noValidate>
        <h1>Inicia sesión</h1>
        <p className="sub-acceso">
          Usa tu correo institucional para solicitar y seguir tus préstamos.
        </p>

        {fallo && (
          <div className="aviso aviso--error" role="alert">
            {fallo.error}
          </div>
        )}

        <fieldset disabled={enviando} className="campos-acceso">
          <Campo id="correo" rotulo="Correo institucional" error={errorDe('correo')}>
            <input
              type="email"
              autoComplete="username"
              placeholder="tucorreo@aloe.ulima.edu.pe"
              value={valores.correo}
              onChange={(e) => ponerValor('correo', e.target.value)}
              onBlur={() => tocar('correo')}
              {...atributosControl('correo', { error: errorDe('correo') || (credenciales && ' ') })}
            />
          </Campo>
          <Campo
            id="contrasena"
            rotulo="Contraseña"
            error={
              errorDe('contrasena') ||
              (credenciales ? 'Verifica tus datos e inténtalo otra vez.' : null)
            }
          >
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={valores.contrasena}
              onChange={(e) => ponerValor('contrasena', e.target.value)}
              onBlur={() => tocar('contrasena')}
              {...atributosControl('contrasena', { error: errorDe('contrasena') || credenciales })}
            />
          </Campo>

          <div className="fila-acceso">
            <label className="opcion">
              <input
                type="checkbox"
                checked={valores.recordarme}
                onChange={(e) => ponerValor('recordarme', e.target.checked)}
              />
              <span>Recordarme</span>
            </label>
            <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
          </div>
        </fieldset>

        <button type="submit" className="boton boton--bloque" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        {enviando && (
          <p className="campo-ayuda centrado">
            Campos y enlaces deshabilitados mientras se valida.
          </p>
        )}

        <p className="pie-acceso">
          ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>

        <details className="cuentas-prueba">
          <summary>Cuentas de prueba (primera entrega)</summary>
          <p>
            Contraseña de todas: <code>Clave2026</code>
          </p>
          <ul>
            <li>
              <code>rmendoza@aloe.ulima.edu.pe</code> estudiante
            </li>
            <li>
              <code>lparedes@aloe.ulima.edu.pe</code> estudiante con deuda
            </li>
            <li>
              <code>erivas@ulima.edu.pe</code> encargada
            </li>
            <li>
              <code>atorres@aloe.ulima.edu.pe</code> cuenta bloqueada
            </li>
          </ul>
        </details>
      </form>
    </div>
  )
}
