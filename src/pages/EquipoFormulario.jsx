import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ListaAccesorios } from '../components/inventario/ListaAccesorios.jsx'
import { PanelFotografias } from '../components/inventario/PanelFotografias.jsx'
import { Campo, atributosControl } from '../components/ui/Campo.jsx'
import { Cargando } from '../components/ui/Piezas.jsx'
import { useInventario } from '../context/InventarioContext.jsx'
import { CATEGORIAS, LIMITES } from '../domain/catalogos.js'
import { contarErrores, validarEquipo } from '../domain/validaciones.js'
import { useFormulario } from '../hooks/useFormulario.js'

const CONDICIONES_POR_DEFECTO = {
  duracionMaximaDias: 7,
  requiereAutorizacion: false,
  admiteRenovacion: true,
  penalidadPorDia: 0,
}

const VACIO = {
  nombre: '',
  categoria: '',
  marca: '',
  modelo: '',
  descripcion: '',
  accesorios: [],
  fotografias: [],
  condicionesPrestamo: CONDICIONES_POR_DEFECTO,
}

const ROTULOS = {
  nombre: 'Nombre del equipo',
  categoria: 'Categoría',
  marca: 'Marca',
  modelo: 'Modelo',
  descripcion: 'Descripción',
  accesorios: 'Accesorios incluidos',
  fotografias: 'Fotografías',
}

/** Vista 2.2 — Nuevo / editar equipo. */
export function EquipoFormulario() {
  const { equipoId } = useParams()
  const esEdicion = Boolean(equipoId)
  const navegar = useNavigate()
  const { obtenerEquipo, listarClavesEquipos, crearEquipo, actualizarEquipo } = useInventario()

  const [inicial, setInicial] = useState(esEdicion ? null : VACIO)
  const [claves, setClaves] = useState([])
  const [errorCarga, setErrorCarga] = useState(null)
  const [guardandoBorrador, setGuardandoBorrador] = useState(false)

  useEffect(() => {
    let vigente = true
    listarClavesEquipos().then((c) => vigente && setClaves(c))
    if (esEdicion) {
      obtenerEquipo(equipoId)
        .then(({ equipo }) => {
          if (!vigente) return
          setInicial({
            nombre: equipo.nombre,
            categoria: equipo.categoria,
            marca: equipo.marca,
            modelo: equipo.modelo,
            descripcion: equipo.descripcion ?? '',
            accesorios: equipo.accesorios ?? [],
            fotografias: equipo.fotografias ?? [],
            condicionesPrestamo: equipo.condicionesPrestamo,
            esBorrador: equipo.esBorrador,
          })
        })
        .catch((e) => vigente && setErrorCarga(e.message))
    }
    return () => {
      vigente = false
    }
  }, [equipoId, esEdicion, obtenerEquipo, listarClavesEquipos])

  if (errorCarga) {
    return (
      <div className="panel panel-cuerpo">
        <div className="aviso aviso--error">{errorCarga}</div>
        <p style={{ marginTop: '1rem' }}>
          <Link to="/inventario">Volver al inventario</Link>
        </p>
      </div>
    )
  }

  if (!inicial) {
    return (
      <div className="panel">
        <Cargando filas={6} etiqueta="Cargando el equipo…" />
      </div>
    )
  }

  return (
    <Formulario
      key={equipoId ?? 'nuevo'}
      inicial={inicial}
      claves={claves}
      equipoId={equipoId}
      esEdicion={esEdicion}
      navegar={navegar}
      crearEquipo={crearEquipo}
      actualizarEquipo={actualizarEquipo}
      guardandoBorrador={guardandoBorrador}
      setGuardandoBorrador={setGuardandoBorrador}
    />
  )
}

function Formulario({
  inicial,
  claves,
  equipoId,
  esEdicion,
  navegar,
  crearEquipo,
  actualizarEquipo,
  guardandoBorrador,
  setGuardandoBorrador,
}) {
  const validar = useMemo(
    () => (valores) => validarEquipo(valores, { equiposExistentes: claves, idActual: equipoId ?? null }),
    [claves, equipoId],
  )

  const { valores, errores, errorDe, ponerValor, tocar, enviar, enviando, intentoEnvio, valido } =
    useFormulario({ inicial, validar })

  const totalErrores = contarErrores(errores)
  const mostrarResumen = intentoEnvio && !valido

  async function guardar(datos, { borrador = false } = {}) {
    const opciones = { esBorrador: borrador }
    const resultado = esEdicion
      ? await actualizarEquipo(equipoId, datos, borrador ? opciones : { esBorrador: false })
      : await crearEquipo(datos, opciones)

    if (!resultado.ok) return
    const id = esEdicion ? equipoId : resultado.datos.id
    navegar(`/inventario/${id}${esEdicion ? '' : '?pestana=condiciones'}`)
  }

  async function guardarBorrador() {
    // un borrador puede estar incompleto, pero necesita al menos un nombre
    if (!valores.nombre.trim()) {
      tocar('nombre')
      document.getElementById('nombre')?.focus()
      return
    }
    setGuardandoBorrador(true)
    await guardar(valores, { borrador: true })
    setGuardandoBorrador(false)
  }

  const restantes = LIMITES.descripcion.max - (valores.descripcion?.length ?? 0)

  return (
    <form onSubmit={enviar((datos) => guardar(datos))} noValidate>
      <nav className="migas" aria-label="Ruta">
        <Link to="/inventario">Inventario</Link>
        <span aria-hidden="true">/</span>
        <span>{esEdicion ? valores.nombre || 'Editar equipo' : 'Nuevo equipo'}</span>
      </nav>

      <div className="cabecera-vista">
        <h1>{esEdicion ? 'Editar equipo' : 'Nuevo equipo'}</h1>
      </div>

      <div className="rejilla-formulario">
        <section className="panel">
          <div className="panel-cuerpo">
            <div className="bloque">
              <div className="bloque-rotulo">
                <span className="rotulo">Identificación</span>
              </div>

              <div className="campo-fila">
                <Campo id="nombre" rotulo={ROTULOS.nombre} error={errorDe('nombre')}>
                  <input
                    {...atributosControl('nombre', { error: errorDe('nombre') })}
                    value={valores.nombre}
                    onChange={(e) => ponerValor('nombre', e.target.value)}
                    onBlur={() => tocar('nombre')}
                    maxLength={LIMITES.nombre.max}
                  />
                </Campo>

                <Campo id="categoria" rotulo={ROTULOS.categoria} error={errorDe('categoria')}>
                  <select
                    {...atributosControl('categoria', { error: errorDe('categoria') })}
                    value={valores.categoria}
                    onChange={(e) => ponerValor('categoria', e.target.value)}
                    onBlur={() => tocar('categoria')}
                  >
                    <option value="">Elige una categoría</option>
                    {CATEGORIAS.map((c) => (
                      <option key={c.valor} value={c.valor}>
                        {c.etiqueta}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>

              <div className="campo-fila">
                <Campo id="marca" rotulo={ROTULOS.marca} error={errorDe('marca')}>
                  <input
                    {...atributosControl('marca', { error: errorDe('marca') })}
                    value={valores.marca}
                    onChange={(e) => ponerValor('marca', e.target.value)}
                    onBlur={() => tocar('marca')}
                    maxLength={LIMITES.marca.max}
                  />
                </Campo>

                <Campo id="modelo" rotulo={ROTULOS.modelo} error={errorDe('modelo')}>
                  <input
                    {...atributosControl('modelo', { error: errorDe('modelo'), mono: true })}
                    value={valores.modelo}
                    onChange={(e) => ponerValor('modelo', e.target.value)}
                    onBlur={() => tocar('modelo')}
                    maxLength={LIMITES.modelo.max}
                  />
                </Campo>
              </div>
            </div>

            <div className="bloque">
              <div className="bloque-rotulo">
                <span className="rotulo">Descripción</span>
              </div>
              <Campo
                id="descripcion"
                rotulo="Descripción del equipo"
                opcional
                error={errorDe('descripcion')}
                ayuda={`Máximo ${LIMITES.descripcion.max} caracteres. Se muestra en la ficha pública del catálogo. Quedan ${restantes}.`}
              >
                <textarea
                  {...atributosControl('descripcion', {
                    error: errorDe('descripcion'),
                    ayuda: true,
                  })}
                  value={valores.descripcion}
                  onChange={(e) => ponerValor('descripcion', e.target.value)}
                  onBlur={() => tocar('descripcion')}
                />
              </Campo>
            </div>

            <ListaAccesorios
              accesorios={valores.accesorios}
              alCambiar={(a) => ponerValor('accesorios', a)}
              error={errorDe('accesorios')}
            />
          </div>
        </section>

        <div>
          <PanelFotografias
            fotografias={valores.fotografias}
            alCambiar={(f) => ponerValor('fotografias', f)}
          />

          {mostrarResumen && (
            <section className="panel" style={{ marginTop: '1.5rem' }}>
              <div className="panel-cuerpo">
                <div className="bloque-rotulo">
                  <span className="rotulo">Estado del formulario · con errores</span>
                </div>
                <div className="aviso aviso--error">
                  No se pudo guardar. Revisa {totalErrores}{' '}
                  {totalErrores === 1 ? 'campo marcado' : 'campos marcados'}.
                </div>
                <ul style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
                  {Object.entries(errores).map(([campo, mensaje]) => (
                    <li key={campo} className="sm">
                      <button
                        type="button"
                        className="accion"
                        onClick={() => document.getElementById(campo)?.focus()}
                      >
                        {ROTULOS[campo] ?? campo}
                      </button>
                      <span className="campo-error">{mensaje}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <div className="fila-fin" style={{ marginTop: '1.5rem' }}>
            <Link to={esEdicion ? `/inventario/${equipoId}` : '/inventario'} className="boton boton--texto">
              Cancelar
            </Link>
            <button
              type="button"
              className="boton boton--contorno"
              onClick={guardarBorrador}
              disabled={enviando || guardandoBorrador}
            >
              {guardandoBorrador ? 'Guardando…' : 'Guardar borrador'}
            </button>
            <button type="submit" className="boton" disabled={enviando || guardandoBorrador}>
              {enviando ? 'Guardando…' : 'Guardar equipo'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
