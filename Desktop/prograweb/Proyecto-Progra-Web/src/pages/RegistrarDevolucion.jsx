import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ModalDanos } from '../components/devoluciones/ModalDanos.jsx'
import { ModalRenovacion } from '../components/devoluciones/ModalRenovacion.jsx'
import { Campo, atributosControl, clases } from '../components/ui/Campo.jsx'
import { Cargando, EstadoVacio } from '../components/ui/Piezas.jsx'
import { useDevoluciones } from '../context/DevolucionesContext.jsx'
import { useSesion } from '../context/SesionContext.jsx'
import { formatearSoles } from '../domain/catalogos.js'
import {
  ESTADOS_RETORNO,
  calcularPenalidad,
  diasRetraso,
  validarDevolucion,
} from '../domain/devoluciones.js'
import { formatearFecha, hoyISO } from '../domain/solicitudes.js'
import { useFormulario } from '../hooks/useFormulario.js'

/** Color de la opción, con los mismos tonos del inventario. */
const TONO = { sin_novedades: 'disponible', con_danos: 'mantenimiento', faltantes: 'baja' }

/** Vista 5.1 — Registrar devolución (con los pasos 5.2 y 5.3 en modales). */
export function RegistrarDevolucion() {
  const [parametros, setParametros] = useSearchParams()
  const codigo = (parametros.get('codigo') ?? '').toUpperCase()
  const [texto, setTexto] = useState(codigo)
  const [renovando, setRenovando] = useState(parametros.get('accion') === 'renovar' ? codigo : null)

  const buscar = (e) => {
    e.preventDefault()
    const limpio = texto.trim().toUpperCase()
    setParametros(limpio ? { codigo: limpio } : {})
  }

  return (
    <div>
      <div className="cabecera-vista">
        <div>
          <h1>Registrar devolución</h1>
          <p className="sub">
            Busca el préstamo por su código o elígelo de la lista de préstamos por devolver.
          </p>
        </div>
      </div>

      <form className="buscar-prestamo" role="search" onSubmit={buscar}>
        <label className="rotulo campo-rotulo" htmlFor="codigo-prestamo">
          Buscar préstamo
        </label>
        <div className="fila">
          <input
            id="codigo-prestamo"
            className="entrada entrada--mono"
            placeholder="PRE-2026-0318"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="submit" className="boton">
            Buscar
          </button>
          {codigo && (
            <button
              type="button"
              className="boton boton--texto"
              onClick={() => {
                setTexto('')
                setParametros({})
              }}
            >
              Ver todos
            </button>
          )}
        </div>
      </form>

      {codigo ? (
        <PanelDevolucion
          key={codigo}
          codigo={codigo}
          alRenovar={() => setRenovando(codigo)}
          alTerminar={() => {
            setTexto('')
            setParametros({})
          }}
        />
      ) : (
        <ListaPorDevolver
          alElegir={(c) => {
            setTexto(c)
            setParametros({ codigo: c })
          }}
          alRenovar={setRenovando}
        />
      )}

      {renovando && (
        <ModalRenovacion
          codigo={renovando}
          alCerrar={() => {
            setRenovando(null)
            if (parametros.get('accion')) setParametros(codigo ? { codigo } : {})
          }}
        />
      )}
    </div>
  )
}

function ListaPorDevolver({ alElegir, alRenovar }) {
  const { listarPorDevolver, version } = useDevoluciones()
  const [lista, setLista] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    listarPorDevolver()
      .then((l) => vigente && setLista(l))
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [listarPorDevolver, version])

  return (
    <section className="panel" aria-label="Préstamos por devolver">
      <h2 className="grupo-titulo">Préstamos por devolver{lista && ` · ${lista.length}`}</h2>
      {error ? (
        <div style={{ padding: '1.5rem' }}>
          <div className="aviso aviso--error">{error}</div>
        </div>
      ) : !lista ? (
        <Cargando filas={5} etiqueta="Cargando préstamos…" />
      ) : lista.length === 0 ? (
        <EstadoVacio
          marca="✓"
          titulo="No hay préstamos por devolver"
          descripcion="Todos los equipos entregados ya regresaron al almacén."
        />
      ) : (
        <div className="tabla-marco">
          <table className="tabla tabla-vigentes">
            <thead>
              <tr>
                <th>Préstamo</th>
                <th>Estudiante</th>
                <th>Equipo y unidad</th>
                <th>Devolución pactada</th>
                <th>Vigencia</th>
                <th>
                  <span className="oculto-visual">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="codigo">{p.codigoPrestamo}</td>
                  <td>
                    <Link to={`/estudiantes/${p.estudianteId}`} className="tabla-nombre">
                      {p.estudianteNombre}
                    </Link>
                  </td>
                  <td>
                    <span className="tabla-nombre">{p.equipoNombre}</span>
                    <p className="sm suave codigo">{p.codigoUnidad}</p>
                  </td>
                  <td className="codigo sin-corte">{formatearFecha(p.fechaFin)}</td>
                  <td>
                    <span className="vigencia" data-tipo={p.vigencia.tipo}>
                      {p.vigencia.texto}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-bandeja">
                      <button
                        type="button"
                        className="boton boton--sm"
                        onClick={() => alElegir(p.codigoPrestamo)}
                      >
                        Registrar devolución
                      </button>
                      <button
                        type="button"
                        className="boton boton--sm boton--neutro"
                        onClick={() => alRenovar(p.codigoPrestamo)}
                      >
                        Renovar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function PanelDevolucion({ codigo, alRenovar, alTerminar }) {
  const { obtenerParaDevolucion } = useDevoluciones()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerParaDevolucion(codigo)
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(e))
    return () => {
      vigente = false
    }
  }, [codigo, obtenerParaDevolucion])

  if (error)
    return (
      <section className="panel">
        <EstadoVacio
          marca="!"
          titulo={error.estado === 404 ? 'No encontramos ese préstamo' : 'No se puede devolver'}
          descripcion={error.message}
        >
          <button type="button" className="boton boton--contorno" onClick={alTerminar}>
            Ver préstamos por devolver
          </button>
        </EstadoVacio>
      </section>
    )
  if (!datos)
    return (
      <section className="panel">
        <Cargando filas={6} etiqueta="Buscando el préstamo…" />
      </section>
    )
  return <FormularioDevolucion datos={datos} alRenovar={alRenovar} alTerminar={alTerminar} />
}

function FormularioDevolucion({ datos, alRenovar, alTerminar }) {
  const { solicitud: s, accesoriosEntregados, efecto } = datos
  const { registrarDevolucion } = useDevoluciones()
  const { encargadoActivo } = useSesion()
  const [paso2, setPaso2] = useState(false)
  const [resultado, setResultado] = useState(null)

  const fechaEntrega = s.fechaEntregaReal ? hoyISO(new Date(s.fechaEntregaReal)) : s.fechaInicio
  const inicial = useMemo(
    () => ({
      fechaRetorno: hoyISO(),
      estadoRetorno: 'sin_novedades',
      accesorios: accesoriosEntregados.map((nombre) => ({ nombre, devuelto: true })),
      faltantes: [],
      descripcionDano: '',
      fotoDano: null,
      derivarMantenimiento: true,
      observaciones: '',
    }),
    [accesoriosEntregados],
  )
  const validar = useMemo(() => (v) => validarDevolucion(v, { fechaEntrega }), [fechaEntrega])
  const formulario = useFormulario({ inicial, validar })
  const { valores, errores, errorDe, ponerValor, ponerValores, tocar, enviar, enviando } =
    formulario

  const dias = valores.fechaRetorno ? diasRetraso(s.fechaFin, valores.fechaRetorno) : 0
  const penalidad = calcularPenalidad(dias, s.penalidadPorDia)
  const conNovedad = valores.estadoRetorno !== 'sin_novedades'

  const marcarAccesorio = (i, devuelto) => {
    const accesorios = valores.accesorios.map((a, j) => (j === i ? { ...a, devuelto } : a))
    const faltantes = accesorios.filter((a) => !a.devuelto).map((a) => a.nombre)
    ponerValores({
      accesorios,
      faltantes,
      // si falta algo, el retorno ya no es «sin novedades»
      ...(faltantes.length && valores.estadoRetorno === 'sin_novedades'
        ? { estadoRetorno: 'faltantes' }
        : {}),
    })
  }

  const guardar = enviar(async (v) => {
    const r = await registrarDevolucion(s.codigoPrestamo, v)
    if (r.ok) {
      setPaso2(false)
      setResultado(r.datos)
    }
  })

  // Paso 5.1: si hay novedad, antes de guardar se abre el paso 5.2.
  const continuar = (e) => {
    e.preventDefault()
    tocar('fechaRetorno')
    tocar('estadoRetorno')
    if (errores.fechaRetorno || errores.estadoRetorno) return
    if (conNovedad) setPaso2(true)
    else guardar()
  }

  if (resultado)
    return (
      <section className="panel panel-cuerpo resultado-devolucion">
        <div
          className={clases('aviso', resultado.diasRetraso > 0 ? 'aviso--atencion' : 'aviso--info')}
        >
          <strong>Devolución registrada · {resultado.codigoPrestamo}.</strong>{' '}
          {resultado.diasRetraso > 0
            ? `${resultado.diasRetraso} ${resultado.diasRetraso === 1 ? 'día' : 'días'} de retraso. Penalidad registrada: ${formatearSoles(resultado.penalidad)}. Deuda total del estudiante: ${formatearSoles(resultado.deuda)}.`
            : 'Devolución a tiempo, sin penalidad.'}{' '}
          La unidad {resultado.codigoUnidad} quedó{' '}
          {resultado.estadoUnidad === 'mantenimiento' ? '«En mantenimiento»' : '«Disponible»'}.
        </div>
        <div className="fila-fin" style={{ marginTop: '1rem' }}>
          <Link to={`/estudiantes/${s.estudianteId}`} className="boton boton--neutro">
            Ver historial del estudiante
          </Link>
          <button type="button" className="boton" onClick={alTerminar}>
            Registrar otra devolución
          </button>
        </div>
      </section>
    )

  return (
    <>
      <form className="panel panel-cuerpo formulario-devolucion" noValidate onSubmit={continuar}>
        <div className="cabecera-devolucion">
          <div>
            <p className="rotulo">Préstamo</p>
            <p className="codigo constancia-codigo">{s.codigoPrestamo}</p>
          </div>
          <button type="button" className="boton boton--neutro boton--sm" onClick={alRenovar}>
            Renovar préstamo
          </button>
        </div>

        <dl className="datos-devolucion">
          <div>
            <dt>Estudiante</dt>
            <dd>
              <Link to={`/estudiantes/${s.estudianteId}`}>{s.estudianteNombre}</Link>
            </dd>
          </div>
          <div>
            <dt>Equipo y unidad</dt>
            <dd>
              {s.equipoNombre} · <span className="codigo">{s.codigoUnidad}</span>
            </dd>
          </div>
          <div>
            <dt>Devolución pactada</dt>
            <dd className="codigo">{formatearFecha(s.fechaFin)}</dd>
          </div>
          <div>
            <dt>Retorno real</dt>
            <dd className="codigo">{formatearFecha(valores.fechaRetorno)}</dd>
          </div>
        </dl>

        <div className="rejilla-devolucion">
          <fieldset className="grupo-casillas">
            <legend className="rotulo campo-rotulo">Verificación de accesorios</legend>
            {valores.accesorios.length === 0 ? (
              <p className="sm suave">El préstamo no incluía accesorios.</p>
            ) : (
              valores.accesorios.map((a, i) => (
                <label key={a.nombre} className="opcion">
                  <input
                    type="checkbox"
                    checked={a.devuelto}
                    onChange={(e) => marcarAccesorio(i, e.target.checked)}
                  />
                  <span>{a.nombre}</span>
                  {!a.devuelto && <span className="marca-deuda">faltante</span>}
                </label>
              ))
            )}
          </fieldset>

          <div>
            <fieldset className="grupo-casillas">
              <legend className="rotulo campo-rotulo">Estado de retorno</legend>
              <div className="segmentos">
                {ESTADOS_RETORNO.map((e) => (
                  <label
                    key={e.valor}
                    className={clases(
                      'segmento',
                      valores.estadoRetorno === e.valor && 'segmento--activo',
                    )}
                    data-estado={TONO[e.valor]}
                  >
                    <input
                      type="radio"
                      name="estadoRetorno"
                      value={e.valor}
                      checked={valores.estadoRetorno === e.valor}
                      onChange={() => ponerValor('estadoRetorno', e.valor)}
                    />
                    <span>{e.etiqueta}</span>
                  </label>
                ))}
              </div>
              {errorDe('estadoRetorno') && (
                <span className="campo-error" role="alert">
                  {errorDe('estadoRetorno')}
                </span>
              )}
            </fieldset>

            <div style={{ marginTop: '1rem' }}>
              <Campo id="fecha-retorno" rotulo="Fecha de retorno" error={errorDe('fechaRetorno')}>
                <input
                  type="date"
                  {...atributosControl('fecha-retorno', {
                    error: errorDe('fechaRetorno'),
                    mono: true,
                  })}
                  value={valores.fechaRetorno}
                  min={fechaEntrega}
                  max={hoyISO()}
                  onChange={(e) => ponerValor('fechaRetorno', e.target.value)}
                  onBlur={() => tocar('fechaRetorno')}
                />
              </Campo>
            </div>
          </div>
        </div>

        <Campo id="observaciones-devolucion" rotulo="Observaciones" opcional>
          <textarea
            {...atributosControl('observaciones-devolucion')}
            rows={2}
            maxLength={300}
            value={valores.observaciones}
            onChange={(e) => ponerValor('observaciones', e.target.value)}
          />
        </Campo>

        <div
          className={clases('aviso', dias > 0 ? 'aviso--atencion' : 'aviso--info')}
          style={{ marginTop: '1rem' }}
          aria-live="polite"
        >
          {dias > 0 ? (
            <>
              <strong>
                {dias} {dias === 1 ? 'día' : 'días'} de retraso.
              </strong>{' '}
              Penalidad calculada: {formatearSoles(penalidad)} ({formatearSoles(s.penalidadPorDia)}{' '}
              por día). El estudiante no podrá solicitar equipos hasta regularizar.
            </>
          ) : (
            <>
              <strong>Devolución a tiempo · 0 días de retraso.</strong> Sin penalidad.{' '}
              {conNovedad
                ? 'En el paso siguiente registrarás los daños o faltantes.'
                : `La unidad ${s.codigoUnidad} vuelve al estado «Disponible».`}
            </>
          )}
        </div>

        <div className="fila-fin" style={{ marginTop: '1.25rem' }}>
          <button type="button" className="boton boton--neutro" onClick={alTerminar}>
            Cancelar
          </button>
          <button type="submit" className="boton" disabled={enviando || !encargadoActivo}>
            {enviando
              ? 'Registrando…'
              : conNovedad
                ? 'Continuar: daños o faltantes'
                : 'Registrar devolución'}
          </button>
        </div>
      </form>

      {paso2 && (
        <ModalDanos
          formulario={formulario}
          solicitud={s}
          efecto={efecto}
          enviando={enviando}
          alGuardar={guardar}
          alCerrar={() => setPaso2(false)}
        />
      )}
    </>
  )
}
