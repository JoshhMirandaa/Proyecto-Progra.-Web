import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Campo, atributosControl } from '../components/ui/Campo.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import {
  CARRERAS,
  CICLOS,
  DOMINIO_ESTUDIANTE,
  INICIO_POR_ROL,
  validarRegistroEstudiante,
} from '../domain/cuentas.js'
import { useFormulario } from '../hooks/useFormulario.js'

/** Vista 1.3 — Registro de estudiante. */
export function RegistroEstudiante() {
  const { conSesion, rol, registrarEstudiante } = useSesion()
  const navegar = useNavigate()
  const [duplicado, setDuplicado] = useState(null)
  const [creada, setCreada] = useState(null)

  const { valores, errores, errorDe, ponerValor, tocar, enviar, enviando, intentoEnvio } =
    useFormulario({
      inicial: {
        nombres: '',
        apellidos: '',
        carrera: '',
        ciclo: '',
        correo: '',
        contrasena: '',
        confirmarContrasena: '',
        aceptaReglamento: false,
      },
      validar: validarRegistroEstudiante,
    })

  if (conSesion) return <Navigate to={INICIO_POR_ROL[rol]} replace />

  const crear = async (datos) => {
    setDuplicado(null)
    const r = await registrarEstudiante(datos)
    if (r.ok) setCreada(r)
    else if (r.tipo === 'duplicado') setDuplicado(datos.correo.trim().toLowerCase())
    else setDuplicado(null)
  }

  if (creada) {
    return (
      <div className="tarjeta-acceso panel">
        <div className="panel-cuerpo exito-acceso">
          <div className="marca-exito" aria-hidden="true">
            ✓
          </div>
          <h1>Cuenta creada</h1>
          <p>
            Enviamos un enlace de verificación a{' '}
            <span className="codigo">{creada.usuario.correo}</span>. Válido por 24 horas.
          </p>
          <div className="aviso aviso--info">
            En la primera entrega no se envían correos: abre el enlace de prueba para activar la
            cuenta. <Link to={creada.enlacePrueba}>Activar mi cuenta</Link>
          </div>
        </div>
      </div>
    )
  }

  const cantidad = Object.keys(errores).length
  const campo = (id, rotulo, props = {}, ayuda) => (
    <Campo id={id} rotulo={rotulo} error={errorDe(id)} ayuda={ayuda}>
      <input
        value={valores[id]}
        onChange={(e) => ponerValor(id, e.target.value)}
        onBlur={() => tocar(id)}
        {...props}
        {...atributosControl(id, { error: errorDe(id), ayuda })}
      />
    </Campo>
  )

  return (
    <div className="tarjeta-acceso tarjeta-acceso--ancha">
      {duplicado && (
        <div className="aviso aviso--error" role="alert">
          Ya existe una cuenta con el correo <span className="codigo">{duplicado}</span>.{' '}
          <Link to="/login">Inicia sesión</Link> o{' '}
          <Link to="/recuperar">recupera tu contraseña</Link>.
        </div>
      )}
      <form className="panel panel-cuerpo" onSubmit={enviar(crear)} noValidate>
        <h1>Crea tu cuenta de estudiante</h1>
        <p className="sub-acceso">
          Solo se admiten correos {DOMINIO_ESTUDIANTE}. La cuenta se activa con el enlace de
          verificación.{' '}
          <Link to="/registro-encargado">¿Eres personal del almacén? Regístrate aquí.</Link>
        </p>

        <div className="bloque">
          <p className="rotulo bloque-rotulo">Datos personales</p>
          <div className="campo-fila">
            {campo('nombres', 'Nombres', {
              placeholder: 'Renzo Andrés',
              autoComplete: 'given-name',
            })}
            {campo('apellidos', 'Apellidos', {
              placeholder: 'Mendoza Cárdenas',
              autoComplete: 'family-name',
            })}
          </div>
          <div className="campo-fila" style={{ marginTop: '1rem' }}>
            <Campo id="carrera" rotulo="Carrera" error={errorDe('carrera')}>
              <select
                value={valores.carrera}
                onChange={(e) => ponerValor('carrera', e.target.value)}
                onBlur={() => tocar('carrera')}
                {...atributosControl('carrera', { error: errorDe('carrera') })}
              >
                <option value="">Elige tu carrera</option>
                {CARRERAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Campo>
            <Campo id="ciclo" rotulo="Ciclo" error={errorDe('ciclo')}>
              <select
                value={valores.ciclo}
                onChange={(e) => ponerValor('ciclo', e.target.value)}
                onBlur={() => tocar('ciclo')}
                {...atributosControl('ciclo', { error: errorDe('ciclo') })}
              >
                <option value="">Elige</option>
                {CICLOS.map((c) => (
                  <option key={c} value={c}>
                    {c}.º
                  </option>
                ))}
              </select>
            </Campo>
          </div>
        </div>

        <div className="bloque">
          <p className="rotulo bloque-rotulo">Acceso</p>
          {campo(
            'correo',
            'Correo institucional',
            { type: 'email', placeholder: `nombre${DOMINIO_ESTUDIANTE}`, autoComplete: 'email' },
            `Debe terminar en ${DOMINIO_ESTUDIANTE}`,
          )}
          <div className="campo-fila" style={{ marginTop: '1rem' }}>
            {campo(
              'contrasena',
              'Contraseña',
              { type: 'password', autoComplete: 'new-password' },
              'Mínimo 8 caracteres, una mayúscula y un número.',
            )}
            {campo('confirmarContrasena', 'Confirmar contraseña', {
              type: 'password',
              autoComplete: 'new-password',
            })}
          </div>
        </div>

        <label className="opcion opcion--larga">
          <input
            type="checkbox"
            checked={valores.aceptaReglamento}
            onChange={(e) => {
              ponerValor('aceptaReglamento', e.target.checked)
              tocar('aceptaReglamento')
            }}
            aria-invalid={errorDe('aceptaReglamento') ? true : undefined}
          />
          <span>
            Acepto el reglamento de préstamo de equipos y me responsabilizo por el cuidado y la
            devolución de las unidades asignadas.
          </span>
        </label>
        {errorDe('aceptaReglamento') && (
          <span className="campo-error" role="alert">
            {errorDe('aceptaReglamento')}
          </span>
        )}

        {intentoEnvio && cantidad > 0 && (
          <div className="aviso aviso--error" style={{ marginTop: '1rem' }}>
            Revisa {cantidad} {cantidad === 1 ? 'campo' : 'campos'} antes de continuar.
          </div>
        )}

        <div className="fila-fin acciones-acceso">
          <button type="button" className="boton boton--texto" onClick={() => navegar('/')}>
            Cancelar
          </button>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear cuenta'}
          </button>
        </div>
      </form>
    </div>
  )
}
