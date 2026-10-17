import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Campo, atributosControl } from '../components/ui/Campo.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import {
  ALMACENES,
  DOMINIO_PERSONAL,
  INICIO_POR_ROL,
  validarRegistroEncargado,
} from '../domain/cuentas.js'
import { useFormulario } from '../hooks/useFormulario.js'

/** Vista 1.4 — Registro de encargado de almacén. */
export function RegistroEncargado() {
  const { conSesion, rol, registrarEncargado } = useSesion()
  const navegar = useNavigate()
  const [duplicado, setDuplicado] = useState(null)
  const [creada, setCreada] = useState(null)

  const { valores, errores, errorDe, ponerValor, tocar, enviar, enviando, intentoEnvio } =
    useFormulario({
      inicial: {
        nombres: '',
        apellidos: '',
        correo: '',
        contrasena: '',
        confirmarContrasena: '',
        almacenAsignado: ALMACENES[0],
        anexo: '',
      },
      validar: validarRegistroEncargado,
    })

  if (conSesion) return <Navigate to={INICIO_POR_ROL[rol]} replace />

  const registrar = async (datos) => {
    setDuplicado(null)
    const r = await registrarEncargado(datos)
    if (r.ok) setCreada(r.usuario)
    else if (r.tipo === 'duplicado') setDuplicado(datos.correo.trim().toLowerCase())
  }

  if (creada) {
    return (
      <div className="tarjeta-acceso panel">
        <div className="panel-cuerpo exito-acceso">
          <div className="marca-exito" aria-hidden="true">
            ✓
          </div>
          <h1>Alta registrada</h1>
          <p>
            La cuenta de <strong>{creada.nombres}</strong> queda{' '}
            <strong>pendiente de aprobación</strong> por el jefe de laboratorio. Ya puede iniciar
            sesión, pero no aprobar solicitudes ni registrar entregas hasta entonces.
          </p>
          <Link to="/login" className="boton">
            Ir a iniciar sesión
          </Link>
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
          <Link to="/login">Inicia sesión</Link>.
        </div>
      )}
      <form className="panel panel-cuerpo" onSubmit={enviar(registrar)} noValidate>
        <h1>Registro de encargado de almacén</h1>
        <p className="sub-acceso">
          El alta queda pendiente hasta que el jefe de laboratorio la apruebe. Solo se admiten
          correos {DOMINIO_PERSONAL} del personal.
        </p>

        <div className="bloque">
          <p className="rotulo bloque-rotulo">Datos personales</p>
          <div className="campo-fila">
            {campo('nombres', 'Nombres', { placeholder: 'Elena Sofía' })}
            {campo('apellidos', 'Apellidos', { placeholder: 'Rivas Talledo' })}
          </div>
        </div>

        <div className="bloque">
          <p className="rotulo bloque-rotulo">Acceso</p>
          {campo(
            'correo',
            'Correo institucional',
            { type: 'email', placeholder: `erivas${DOMINIO_PERSONAL}`, autoComplete: 'email' },
            `Debe terminar en ${DOMINIO_PERSONAL}`,
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

        <div className="bloque">
          <p className="rotulo bloque-rotulo">Asignación</p>
          <div className="campo-fila">
            <Campo
              id="almacenAsignado"
              rotulo="Almacén asignado"
              error={errorDe('almacenAsignado')}
            >
              <select
                value={valores.almacenAsignado}
                onChange={(e) => ponerValor('almacenAsignado', e.target.value)}
                {...atributosControl('almacenAsignado', { error: errorDe('almacenAsignado') })}
              >
                {ALMACENES.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Campo>
            {campo('anexo', 'Anexo telefónico', {
              inputMode: 'numeric',
              placeholder: '3120',
              maxLength: 4,
            })}
          </div>
        </div>

        <div className="aviso aviso--atencion">
          La cuenta se crea en estado «Pendiente de aprobación». Hasta entonces no podrá aprobar
          solicitudes ni registrar entregas.
        </div>

        {intentoEnvio && cantidad > 0 && (
          <div className="aviso aviso--error">
            Revisa {cantidad} {cantidad === 1 ? 'campo' : 'campos'} antes de continuar.
          </div>
        )}

        <div className="fila-fin acciones-acceso">
          <button type="button" className="boton boton--texto" onClick={() => navegar('/')}>
            Cancelar
          </button>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Registrando…' : 'Registrar encargado'}
          </button>
        </div>
      </form>
    </div>
  )
}
