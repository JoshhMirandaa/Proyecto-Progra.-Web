import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Campo, atributosControl } from '../components/ui/Campo.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import { formatearSoles } from '../domain/catalogos.js'
import { CARRERAS, CICLOS, validarCambioContrasena, validarPerfil } from '../domain/cuentas.js'
import { useFormulario } from '../hooks/useFormulario.js'

function datosDe(usuario) {
  return {
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    carrera: usuario.carrera ?? '',
    ciclo: usuario.ciclo ? String(usuario.ciclo) : '',
    anexo: usuario.anexo ?? '',
    celular: usuario.celular ?? '',
  }
}

function DatosPersonales({ usuario, alGuardar }) {
  const esEstudiante = usuario.rol === 'estudiante'
  const [delServidor, setDelServidor] = useState({})
  const { valores, errorDe, ponerValor, tocar, enviar, enviando, reiniciar } = useFormulario({
    inicial: datosDe(usuario),
    validar: (v) => validarPerfil(v, usuario.rol),
  })
  const error = (campo) => errorDe(campo) || delServidor[campo] || null

  const guardar = async (datos) => {
    const r = await alGuardar(datos)
    setDelServidor(r.ok ? {} : (r.errores ?? {}))
  }

  const entrada = (id, rotulo, { opcional, ...props } = {}) => (
    <Campo id={id} rotulo={rotulo} error={error(id)} opcional={opcional}>
      <input
        value={valores[id]}
        onChange={(e) => ponerValor(id, e.target.value)}
        onBlur={() => tocar(id)}
        {...props}
        {...atributosControl(id, { error: error(id) })}
      />
    </Campo>
  )

  return (
    <section className="panel">
      <form className="panel-cuerpo" onSubmit={enviar(guardar)} noValidate>
        <h2 className="panel-titulo">Datos personales</h2>
        <div className="campo-fila">
          {entrada('nombres', 'Nombres')}
          {entrada('apellidos', 'Apellidos')}
        </div>
        {esEstudiante ? (
          <div className="campo-fila" style={{ marginTop: '1rem' }}>
            <Campo id="carrera" rotulo="Carrera" error={error('carrera')}>
              <select
                value={valores.carrera}
                onChange={(e) => ponerValor('carrera', e.target.value)}
                {...atributosControl('carrera', { error: error('carrera') })}
              >
                {CARRERAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Campo>
            <Campo id="codigo" rotulo="Código de alumno" ayuda="No editable.">
              <input
                value={usuario.codigo}
                disabled
                {...atributosControl('codigo', { mono: true, ayuda: true })}
              />
            </Campo>
            <Campo id="ciclo" rotulo="Ciclo" error={error('ciclo')}>
              <select
                value={valores.ciclo}
                onChange={(e) => ponerValor('ciclo', e.target.value)}
                {...atributosControl('ciclo', { error: error('ciclo') })}
              >
                {CICLOS.map((c) => (
                  <option key={c} value={c}>
                    {c}.º
                  </option>
                ))}
              </select>
            </Campo>
          </div>
        ) : (
          <div className="campo-fila" style={{ marginTop: '1rem' }}>
            <Campo id="almacen" rotulo="Almacén asignado" ayuda="Lo cambia el jefe de laboratorio.">
              <input value={usuario.almacenAsignado} disabled {...atributosControl('almacen')} />
            </Campo>
            {entrada('anexo', 'Anexo', { inputMode: 'numeric', maxLength: 4 })}
          </div>
        )}
        <div className="campo-fila" style={{ marginTop: '1rem' }}>
          <Campo id="correo" rotulo="Correo institucional" ayuda="No editable.">
            <input
              value={usuario.correo}
              disabled
              {...atributosControl('correo', { mono: true, ayuda: true })}
            />
          </Campo>
          {entrada('celular', 'Celular', {
            inputMode: 'tel',
            placeholder: '987 654 321',
            opcional: true,
          })}
        </div>
        <div className="fila-fin acciones-acceso">
          <button
            type="button"
            className="boton boton--neutro"
            onClick={() => {
              reiniciar(datosDe(usuario))
              setDelServidor({})
            }}
            disabled={enviando}
          >
            Descartar
          </button>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </section>
  )
}

function CambiarContrasena({ alCambiar }) {
  const [delServidor, setDelServidor] = useState({})
  const { valores, errorDe, ponerValor, tocar, enviar, enviando, reiniciar } = useFormulario({
    inicial: { actual: '', nueva: '', confirmar: '' },
    validar: validarCambioContrasena,
  })
  const error = (campo) => errorDe(campo) || delServidor[campo] || null

  const cambiar = async (datos) => {
    const r = await alCambiar(datos)
    if (r.ok) {
      reiniciar({ actual: '', nueva: '', confirmar: '' })
      setDelServidor({})
    } else setDelServidor(r.errores ?? {})
  }

  const clave = (id, rotulo, ayuda) => (
    <Campo id={id} rotulo={rotulo} error={error(id)} ayuda={ayuda}>
      <input
        type="password"
        autoComplete={id === 'actual' ? 'current-password' : 'new-password'}
        value={valores[id]}
        onChange={(e) => {
          ponerValor(id, e.target.value)
          if (delServidor[id]) setDelServidor({})
        }}
        onBlur={() => tocar(id)}
        {...atributosControl(id, { error: error(id), ayuda })}
      />
    </Campo>
  )

  return (
    <section className="panel">
      <form className="panel-cuerpo" onSubmit={enviar(cambiar)} noValidate>
        <h2 className="panel-titulo">Cambiar contraseña</h2>
        {clave('actual', 'Contraseña actual')}
        <div className="campo-fila" style={{ marginTop: '1rem' }}>
          {clave('nueva', 'Nueva', 'Mínimo 8 caracteres, una mayúscula y un número.')}
          {clave('confirmar', 'Confirmar')}
        </div>
        <button
          type="submit"
          className="boton boton--contorno boton--bloque"
          disabled={enviando}
          style={{ marginTop: '1.25rem' }}
        >
          {enviando ? 'Actualizando…' : 'Actualizar contraseña'}
        </button>
      </form>
    </section>
  )
}

/** Vista 1.6 — Mi cuenta: datos personales, cambio de contraseña y resumen de préstamos. */
export function MiCuenta() {
  const { usuario, esEstudiante, actualizarPerfil, cambiarContrasena, obtenerResumenPrestamos } =
    useSesion()
  const [resumen, setResumen] = useState(null)
  const deuda = Number(usuario.deudaPendiente) || 0

  useEffect(() => {
    if (!esEstudiante) return undefined
    let vigente = true
    obtenerResumenPrestamos().then((r) => vigente && setResumen(r))
    return () => {
      vigente = false
    }
  }, [esEstudiante, obtenerResumenPrestamos])

  return (
    <div>
      <nav className="migas" aria-label="Ruta">
        <Link to="/">Inicio</Link>
        <span aria-hidden="true">/</span>
        <span>Mi cuenta</span>
      </nav>
      <h1 style={{ marginBottom: '1.25rem' }}>Mi cuenta</h1>

      {esEstudiante && deuda > 0 && (
        <div className="aviso aviso--atencion" style={{ marginBottom: '1.25rem' }}>
          Tienes una penalidad pendiente de <strong>{formatearSoles(deuda)}</strong>. Regularízala
          en Tesorería para volver a solicitar equipos.
        </div>
      )}
      {usuario.estado === 'pendiente_aprobacion' && (
        <div className="aviso aviso--atencion" style={{ marginBottom: '1.25rem' }}>
          Tu alta de encargado está <strong>pendiente de aprobación</strong>. Hasta entonces no
          podrás aprobar solicitudes ni registrar entregas.
        </div>
      )}

      <div className="rejilla-cuenta">
        <DatosPersonales
          key={usuario.actualizadoEn ?? usuario.id}
          usuario={usuario}
          alGuardar={actualizarPerfil}
        />
        <div className="columna-cuenta">
          <CambiarContrasena alCambiar={cambiarContrasena} />
          {esEstudiante && (
            <section className="panel">
              <div className="panel-cuerpo">
                <h2 className="panel-titulo">Resumen de préstamos</h2>
                <dl className="resumen-cuenta">
                  <div>
                    <dt>préstamos</dt>
                    <dd>{resumen ? resumen.prestamos : '…'}</dd>
                  </div>
                  <div>
                    <dt>retrasos</dt>
                    <dd>{resumen ? resumen.retrasos : '…'}</dd>
                  </div>
                  <div data-alerta={deuda > 0 || undefined}>
                    <dt>deuda</dt>
                    <dd>{formatearSoles(deuda)}</dd>
                  </div>
                </dl>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
