import { Link, useNavigate, useParams } from 'react-router-dom'
import { Campo, atributosControl } from '../components/ui/Campo.jsx'
import { Cargando, EstadoVacio, Miniatura } from '../components/ui/Piezas.jsx'
import { useCatalogo } from '../context/CatalogoContext.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import { ALMACEN, formatearSoles } from '../domain/catalogos.js'
import {
  CURSOS,
  LIMITES_SOLICITUD,
  duracionDias,
  formatearFecha,
  hoyISO,
  sumarDias,
  validarSolicitud,
} from '../domain/solicitudes.js'
import { useDetalleEquipo } from '../hooks/useDetalleEquipo.js'
import { useDisponibilidad } from '../hooks/useDisponibilidad.js'
import { useFormulario } from '../hooks/useFormulario.js'

/** Frase de lo que el estudiante acepta, con la fecha de devolución que eligió. */
function condicionesQueAcepta(condiciones, fechaFin) {
  const partes = [
    fechaFin
      ? `Devolución el ${formatearFecha(fechaFin)} antes de las 19:00 en el ${ALMACEN.nombre}`
      : `Devolución antes de las 19:00 en el ${ALMACEN.nombre}`,
    'verificación de accesorios en la entrega y el retorno',
    condiciones.penalidadPorDia > 0
      ? `penalidad de ${formatearSoles(condiciones.penalidadPorDia)} por día de retraso`
      : 'sin penalidad por retraso',
    condiciones.admiteRenovacion ? 'admite una renovación' : 'sin renovación',
  ]
  if (condiciones.requiereAutorizacion)
    partes.push('requiere la autorización del docente del curso')
  return `${partes.join(' · ')}.`
}

function Formulario({ equipo }) {
  const navegar = useNavigate()
  const { crearSolicitud } = useCatalogo()
  const maximo = equipo.condicionesPrestamo.duracionMaximaDias
  const manana = sumarDias(hoyISO(), 1)

  const formulario = useFormulario({
    inicial: {
      fechaInicio: manana,
      fechaFin: sumarDias(manana, Math.min(3, maximo)),
      curso: '',
      motivo: '',
      aceptaCondiciones: false,
    },
    validar: (v) => validarSolicitud(v, { duracionMaxima: maximo }),
  })
  const { valores, errores, errorDe, ponerValor, tocar, enviar, enviando } = formulario

  const fechasValidas = !errores.fechaInicio && !errores.fechaFin
  const disponibilidad = useDisponibilidad(
    equipo.id,
    fechasValidas ? valores.fechaInicio : '',
    fechasValidas ? valores.fechaFin : '',
  )
  const sinUnidades = fechasValidas && disponibilidad.libres === 0
  const dias = duracionDias(valores.fechaInicio, valores.fechaFin)
  const largoMotivo = valores.motivo.trim().length

  const cambiar = (campo) => (e) => {
    const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    ponerValor(campo, valor)
    tocar(campo)
  }

  const guardar = async (datos) => {
    if (sinUnidades) return
    const r = await crearSolicitud({ ...datos, equipoId: equipo.id })
    if (r.ok) navegar('/mis-solicitudes')
  }

  return (
    <form onSubmit={enviar(guardar)} noValidate className="rejilla-solicitud">
      <section className="panel">
        <div className="panel-cuerpo">
          <div className="bloque">
            <p className="rotulo bloque-rotulo">Fechas del préstamo</p>
            <div className="campo-fila campo-fila--fechas">
              <Campo id="fechaInicio" rotulo="Fecha de inicio" error={errorDe('fechaInicio')}>
                <input
                  type="date"
                  min={hoyISO()}
                  value={valores.fechaInicio}
                  onChange={cambiar('fechaInicio')}
                  {...atributosControl('fechaInicio', {
                    error: errorDe('fechaInicio'),
                    mono: true,
                  })}
                />
              </Campo>
              <Campo id="fechaFin" rotulo="Fecha de devolución" error={errorDe('fechaFin')}>
                <input
                  type="date"
                  min={valores.fechaInicio || hoyISO()}
                  value={valores.fechaFin}
                  onChange={cambiar('fechaFin')}
                  {...atributosControl('fechaFin', { error: errorDe('fechaFin'), mono: true })}
                />
              </Campo>
              <div className="campo">
                <span className="rotulo campo-rotulo">Duración</span>
                <p
                  className={`duracion-caja${dias !== null && (dias < 1 || dias > maximo) ? ' duracion-caja--error' : ''}`}
                  aria-live="polite"
                >
                  {dias !== null && dias >= 0
                    ? `${dias} de ${maximo} ${maximo === 1 ? 'día' : 'días'}`
                    : '—'}
                </p>
              </div>
            </div>
            <p className="campo-ayuda">
              La duración máxima de este equipo es de {maximo} {maximo === 1 ? 'día' : 'días'}{' '}
              calendario.
              {fechasValidas && disponibilidad.libres > 0 && (
                <span className="disponible-texto">
                  {' '}
                  {disponibilidad.libres === 1
                    ? 'Queda 1 unidad libre en esas fechas.'
                    : `Quedan ${disponibilidad.libres} unidades libres en esas fechas.`}
                </span>
              )}
            </p>
            {sinUnidades && (
              <div className="aviso aviso--atencion" role="alert" style={{ marginTop: '0.75rem' }}>
                {disponibilidad.mensaje}
                {disponibilidad.proximoRango && (
                  <>
                    {' '}
                    <button
                      type="button"
                      className="boton boton--texto"
                      onClick={() => {
                        ponerValor('fechaInicio', disponibilidad.proximoRango.inicio)
                        ponerValor('fechaFin', disponibilidad.proximoRango.fin)
                      }}
                    >
                      Usar ese rango
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bloque">
            <p className="rotulo bloque-rotulo">Justificación</p>
            <Campo id="curso" rotulo="Curso asociado" error={errorDe('curso')}>
              <select
                value={valores.curso}
                onChange={cambiar('curso')}
                onBlur={() => tocar('curso')}
                {...atributosControl('curso', { error: errorDe('curso') })}
              >
                <option value="">Elige el curso</option>
                {CURSOS.map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.codigo} {c.nombre} · {c.docente}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo
              id="motivo"
              rotulo="Motivo de la solicitud"
              error={errorDe('motivo')}
              ayuda={`Mínimo ${LIMITES_SOLICITUD.motivo.min} caracteres. El encargado lo verá al evaluar tu solicitud.`}
            >
              <textarea
                value={valores.motivo}
                onChange={(e) => ponerValor('motivo', e.target.value)}
                onBlur={() => tocar('motivo')}
                maxLength={LIMITES_SOLICITUD.motivo.max}
                placeholder="Para qué práctica o trabajo lo necesitas, y dónde lo usarás."
                {...atributosControl('motivo', { error: errorDe('motivo') })}
              />
            </Campo>
            <p className="contador-texto">
              {largoMotivo} / {LIMITES_SOLICITUD.motivo.max}
            </p>
          </div>

          <div className="fila-fin">
            <Link to={`/catalogo/${equipo.id}`} className="boton boton--texto">
              Cancelar
            </Link>
            <button type="submit" className="boton" disabled={enviando || sinUnidades}>
              {enviando ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </div>
      </section>

      <aside className="panel">
        <div className="panel-cuerpo">
          <div className="resumen-equipo">
            <Miniatura fotografia={equipo.fotografias?.[0]} nombre={equipo.nombre} />
            <div>
              <p className="tarjeta-nombre">{equipo.nombre}</p>
              <p className="sm suave">
                {equipo.marca} · {equipo.unidadesDisponibles} de {equipo.unidadesActivas} unidades
                libres
              </p>
            </div>
          </div>

          <p className="rotulo" style={{ marginTop: '1.25rem' }}>
            Condiciones que aceptas
          </p>
          <p className="sm medio" style={{ marginTop: '0.4rem' }}>
            {condicionesQueAcepta(
              equipo.condicionesPrestamo,
              fechasValidas ? valores.fechaFin : '',
            )}
          </p>

          <label className="opcion" style={{ marginTop: '1rem' }}>
            <input
              type="checkbox"
              checked={valores.aceptaCondiciones}
              onChange={cambiar('aceptaCondiciones')}
              aria-invalid={errorDe('aceptaCondiciones') ? true : undefined}
              aria-describedby={
                errorDe('aceptaCondiciones') ? 'aceptaCondiciones-error' : undefined
              }
            />
            <span>Acepto las condiciones del préstamo.</span>
          </label>
          {errorDe('aceptaCondiciones') && (
            <span className="campo-error" id="aceptaCondiciones-error" role="alert">
              {errorDe('aceptaCondiciones')}
            </span>
          )}
        </div>
      </aside>
    </form>
  )
}

/** Vista 3.3 — Formulario de solicitud de préstamo. */
export function SolicitudFormulario() {
  const { equipoId } = useParams()
  const { esEstudiante, usuario } = useSesion()
  const { equipo, cargando, error } = useDetalleEquipo(equipoId)
  const deuda = Number(usuario.deudaPendiente) || 0

  let contenido
  if (!esEstudiante) {
    contenido = (
      <section className="panel">
        <EstadoVacio
          marca="!"
          titulo="Solo los estudiantes pueden solicitar préstamos"
          descripcion="Inicia sesión con tu cuenta de estudiante para continuar."
        >
          <Link to={`/catalogo/${equipoId}`} className="boton boton--contorno">
            Volver al equipo
          </Link>
        </EstadoVacio>
      </section>
    )
  } else if (error) {
    contenido = (
      <section className="panel">
        <EstadoVacio marca="□" titulo="Este equipo no está en el catálogo" descripcion={error}>
          <Link to="/catalogo" className="boton boton--contorno">
            Volver al catálogo
          </Link>
        </EstadoVacio>
      </section>
    )
  } else if (cargando) {
    contenido = (
      <div className="panel">
        <Cargando filas={6} etiqueta="Preparando el formulario…" />
      </div>
    )
  } else if (deuda > 0) {
    contenido = (
      <section className="panel">
        <EstadoVacio
          marca="!"
          titulo={`Tienes una deuda pendiente de ${formatearSoles(deuda)}`}
          descripcion="No puedes solicitar préstamos hasta regularizarla en el almacén."
        >
          <Link to="/mi-deuda" className="boton boton--contorno">
            Ver mi deuda
          </Link>
        </EstadoVacio>
      </section>
    )
  } else {
    contenido = <Formulario equipo={equipo} />
  }

  return (
    <div>
      <nav className="migas" aria-label="Ruta">
        <Link to="/catalogo">Catálogo</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/catalogo/${equipoId}`}>{equipo?.nombre ?? 'Equipo'}</Link>
        <span aria-hidden="true">/</span>
        <span>Solicitar préstamo</span>
      </nav>
      <h1 style={{ marginBottom: '1.25rem' }}>Solicitar préstamo</h1>
      {contenido}
    </div>
  )
}
