import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ResumenSolicitud } from '../components/prestamos/ResumenSolicitud.jsx'
import { Campo, atributosControl } from '../components/ui/Campo.jsx'
import { Cargando, EstadoVacio } from '../components/ui/Piezas.jsx'
import { usePrestamos } from '../context/PrestamosContext.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import { formatearSoles } from '../domain/catalogos.js'
import {
  HORA_DEVOLUCION,
  LIMITES_PRESTAMO,
  ahoraLocal,
  validarEntrega,
} from '../domain/prestamos.js'
import { formatearFecha } from '../domain/solicitudes.js'
import { useFormulario } from '../hooks/useFormulario.js'

const fechaHora = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Vista 4.4 — Registrar la entrega de una solicitud aprobada. */
export function RegistrarEntrega() {
  const { solicitudId } = useParams()
  const { obtenerParaEntrega } = usePrestamos()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerParaEntrega(solicitudId)
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(e))
    return () => {
      vigente = false
    }
  }, [solicitudId, obtenerParaEntrega])

  return (
    <div>
      <nav className="migas" aria-label="Ruta">
        <Link to="/solicitudes?estado=aprobada">Solicitudes aprobadas</Link>
        <span aria-hidden="true">/</span>
        <span>Registrar entrega</span>
      </nav>

      {error ? (
        <section className="panel">
          <EstadoVacio
            marca="!"
            titulo={
              error.estado === 404
                ? 'No encontramos la solicitud'
                : 'Esta solicitud no se puede entregar'
            }
            descripcion={error.message}
          >
            <Link to="/solicitudes" className="boton boton--contorno">
              Volver a la bandeja
            </Link>
          </EstadoVacio>
        </section>
      ) : !datos ? (
        <section className="panel">
          <Cargando filas={6} etiqueta="Cargando la solicitud…" />
        </section>
      ) : (
        <FormularioEntrega datos={datos} />
      )}
    </div>
  )
}

function FormularioEntrega({ datos }) {
  const { solicitud: s, accesorios, penalidadPorDia, codigoPropuesto } = datos
  const { registrarEntrega } = usePrestamos()
  const { usuario, encargadoActivo } = useSesion()
  const navegar = useNavigate()

  const inicial = useMemo(
    () => ({
      fechaEntrega: ahoraLocal(),
      observaciones: '',
      accesorios: accesorios.map((nombre) => ({ nombre, entregado: true, nota: '' })),
    }),
    [accesorios],
  )
  const validar = useMemo(() => (v) => validarEntrega(v, { fechaFin: s.fechaFin }), [s.fechaFin])
  const { valores, errorDe, ponerValor, tocar, enviar, enviando } = useFormulario({
    inicial,
    validar,
  })

  const cambiarAccesorio = (i, cambios) =>
    ponerValor(
      'accesorios',
      valores.accesorios.map((a, j) => (j === i ? { ...a, ...cambios } : a)),
    )
  const faltantes = valores.accesorios.filter((a) => !a.entregado)
  const L = LIMITES_PRESTAMO.observacionesEntrega
  const fechaVista = valores.fechaEntrega ? new Date(valores.fechaEntrega) : null

  return (
    <div className="rejilla-entrega">
      <form
        className="panel panel-cuerpo"
        noValidate
        onSubmit={enviar(async (v) => {
          const r = await registrarEntrega(s.id, v)
          if (r.ok) navegar(`/constancias/${r.datos.codigoPrestamo}`, { replace: true })
        })}
      >
        <h1 className="titulo-entrega">Registrar entrega</h1>
        <p className="sub" style={{ marginBottom: '1.25rem' }}>
          Solicitud {s.id} · unidad <span className="codigo">{s.codigoUnidad}</span>
          {s.ubicacionUnidad && <> · {s.ubicacionUnidad}</>}
        </p>

        <ResumenSolicitud solicitud={s} />

        {s.deudaEstudiante > 0 && (
          <div className="aviso aviso--atencion" style={{ marginTop: '1rem' }}>
            {s.estudianteNombre} tiene {formatearSoles(s.deudaEstudiante)} en penalidades
            pendientes: recuérdaselo al entregar.
          </div>
        )}

        <div className="campo-fila" style={{ marginTop: '1.5rem' }}>
          <Campo
            id="fecha-entrega"
            rotulo="Fecha y hora de entrega"
            error={errorDe('fechaEntrega')}
            ayuda="Por defecto, ahora. Corrígela si entregaste antes y lo registras después."
          >
            <input
              type="datetime-local"
              {...atributosControl('fecha-entrega', {
                error: errorDe('fechaEntrega'),
                ayuda: true,
                mono: true,
              })}
              value={valores.fechaEntrega}
              max={ahoraLocal()}
              onChange={(e) => ponerValor('fechaEntrega', e.target.value)}
              onBlur={() => tocar('fechaEntrega')}
            />
          </Campo>
          <div className="campo">
            <span className="rotulo campo-rotulo">Devolución pactada</span>
            <p className="codigo dato-fijo">
              {formatearFecha(s.fechaFin)} · {HORA_DEVOLUCION}
            </p>
          </div>
        </div>

        <fieldset className="accesorios-entrega">
          <legend className="rotulo campo-rotulo">Accesorios entregados</legend>
          {valores.accesorios.length === 0 ? (
            <p className="sm suave">Este equipo no tiene accesorios registrados.</p>
          ) : (
            <ul>
              {valores.accesorios.map((a, i) => (
                <li key={a.nombre}>
                  <label className="opcion">
                    <input
                      type="checkbox"
                      checked={a.entregado}
                      onChange={(e) => cambiarAccesorio(i, { entregado: e.target.checked })}
                    />
                    <span>{a.nombre}</span>
                  </label>
                  <input
                    className="entrada entrada--sm"
                    aria-label={`Nota sobre ${a.nombre}`}
                    placeholder={a.entregado ? 'Nota (opcional)' : 'Por qué no se entrega'}
                    maxLength={LIMITES_PRESTAMO.notaAccesorio.max}
                    value={a.nota}
                    onChange={(e) => cambiarAccesorio(i, { nota: e.target.value })}
                  />
                </li>
              ))}
            </ul>
          )}
          {errorDe('accesorios') && (
            <span className="campo-error" role="alert">
              {errorDe('accesorios')}
            </span>
          )}
        </fieldset>

        <Campo
          id="observaciones-entrega"
          rotulo="Estado del equipo al entregar"
          error={errorDe('observaciones')}
          ayuda={`${valores.observaciones.trim().length}/${L.max} · Queda en la constancia y se compara al devolver (HU-5).`}
        >
          <textarea
            {...atributosControl('observaciones-entrega', {
              error: errorDe('observaciones'),
              ayuda: true,
            })}
            rows={3}
            value={valores.observaciones}
            maxLength={L.max + 20}
            placeholder="Ej.: Funciona correctamente, pantalla sin rayones, carcasa con desgaste leve."
            onChange={(e) => ponerValor('observaciones', e.target.value)}
            onBlur={() => tocar('observaciones')}
          />
        </Campo>

        <div className="fila-fin" style={{ marginTop: '1.5rem' }}>
          <Link to="/solicitudes?estado=aprobada" className="boton boton--neutro">
            Cancelar
          </Link>
          <button type="submit" className="boton" disabled={enviando || !encargadoActivo}>
            {enviando ? 'Registrando…' : 'Registrar entrega y emitir constancia'}
          </button>
        </div>
      </form>

      <aside
        className="panel panel-cuerpo vista-previa-constancia"
        aria-label="Vista previa de la constancia"
      >
        <p className="rotulo">Vista previa de la constancia</p>
        <p className="codigo constancia-codigo">{codigoPropuesto}</p>
        <dl className="detalle-solicitud">
          <dt>Estudiante</dt>
          <dd>{s.estudianteNombre}</dd>
          <dt>Equipo</dt>
          <dd>
            {s.equipoNombre} · <span className="codigo">{s.codigoUnidad}</span>
          </dd>
          <dt>Entrega</dt>
          <dd className="codigo">
            {fechaVista && !Number.isNaN(fechaVista.getTime()) ? fechaHora.format(fechaVista) : '—'}
          </dd>
          <dt>Devolución</dt>
          <dd className="codigo">
            {formatearFecha(s.fechaFin)} · {HORA_DEVOLUCION}
          </dd>
          <dt>Accesorios</dt>
          <dd>
            {valores.accesorios.filter((a) => a.entregado).length} de {valores.accesorios.length}
            {faltantes.length > 0 && (
              <span className="texto-peligro">
                {' '}
                · falta: {faltantes.map((a) => a.nombre).join(', ')}
              </span>
            )}
          </dd>
          <dt>Entregado por</dt>
          <dd>{usuario.nombres ? `${usuario.nombres} ${usuario.apellidos}` : '—'}</dd>
        </dl>
        {penalidadPorDia > 0 && (
          <p className="sm suave" style={{ marginTop: '1rem' }}>
            Penalidad por retraso: {formatearSoles(penalidadPorDia)} por día.
          </p>
        )}
      </aside>
    </div>
  )
}
