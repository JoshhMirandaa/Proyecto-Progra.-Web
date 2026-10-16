import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Confirmacion } from '../components/ui/Modal.jsx'
import { Campo, atributosControl } from '../components/ui/Campo.jsx'
import { Cargando, EstadoVacio } from '../components/ui/Piezas.jsx'
import { useReservas } from '../context/ReservaContext.jsx'
import { useSesion } from '../context/SesionContext.jsx'

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const FORMATO_MES = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' })
const FORMATO_FECHA = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function fechaLocal(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

function sumarDiasISO(valor, cantidad) {
  const fecha = new Date(`${valor}T12:00:00`)
  fecha.setDate(fecha.getDate() + cantidad)
  return fechaLocal(fecha)
}

function fechaBonita(valor) {
  return FORMATO_FECHA.format(new Date(`${valor}T12:00:00`))
}

function diasEntre(inicio, fin) {
  return Math.round(
    (Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86400000,
  ) + 1
}

function fechaDentroDeReserva(fecha, reserva) {
  return fecha >= reserva.fechaInicio && fecha <= reserva.fechaFin
}

function estadoOcupacion(unidades, reservas, fecha) {
  let libres = 0
  let reservadas = 0
  let prestadas = 0

  for (const unidad of unidades) {
    if (unidad.estado === 'prestada') {
      prestadas += 1
    } else if (unidad.estado === 'disponible') {
      const reservada = reservas.some(
        (reserva) =>
          reserva.unidadId === unidad.id &&
          ['confirmada', 'convertida'].includes(reserva.estado) &&
          fechaDentroDeReserva(fecha, reserva),
      )
      if (reservada) reservadas += 1
      else libres += 1
    }
  }
  return { libres, reservadas, prestadas }
}

function construirDias(mes) {
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1)
  const lunesAntes = (primero.getDay() + 6) % 7
  const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1 - lunesAntes)
  return Array.from({ length: 42 }, (_, indice) => {
    const dia = new Date(inicio)
    dia.setDate(inicio.getDate() + indice)
    return { fecha: fechaLocal(dia), dia }
  })
}

function NavegacionReservas() {
  return (
    <nav className="pestanas reservas-pestanas" aria-label="Secciones de reservas">
      <NavLink to="/reservas" end>
        Calendario
      </NavLink>
      <NavLink to="/mis-reservas">Mis reservas</NavLink>
      <NavLink to="/lista-espera">Lista de espera</NavLink>
    </nav>
  )
}

export function Reservas() {
  const { equipos, reservasOcupacion, cargando, error, crearReserva } = useReservas()
  const { usuario } = useSesion()
  const [equipoId, setEquipoId] = useState('')
  const [mes, setMes] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [fechaInicio, setFechaInicio] = useState(() => sumarDiasISO(fechaLocal(), 1))
  const [fechaFin, setFechaFin] = useState(() => sumarDiasISO(fechaLocal(), 1))
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState({})
  const [errorOperacion, setErrorOperacion] = useState('')
  const [guardando, setGuardando] = useState(false)

  const equipoIdActual = equipos.some((item) => item.id === equipoId)
    ? equipoId
    : (equipos[0]?.id ?? '')
  const equipo = equipos.find((item) => item.id === equipoIdActual)
  const unidades = equipo?.unidades ?? []
  const ocupacionesDelEquipo = useMemo(
    () => reservasOcupacion.filter((reserva) => reserva.equipoId === equipoIdActual),
    [equipoIdActual, reservasOcupacion],
  )
  const dias = useMemo(() => construirDias(mes), [mes])
  const manana = sumarDiasISO(fechaLocal(), 1)

  function cambiarMes(delta) {
    setMes((actual) => new Date(actual.getFullYear(), actual.getMonth() + delta, 1))
  }

  async function enviarReserva(evento) {
    evento.preventDefault()
    const nuevosErrores = {}
    if (!equipoIdActual) nuevosErrores.equipo = 'Selecciona un equipo.'
    if (!fechaInicio) nuevosErrores.fechaInicio = 'Indica el inicio del rango.'
    else if (fechaInicio < manana)
      nuevosErrores.fechaInicio = 'La fecha de inicio debe ser futura.'
    if (!fechaFin) nuevosErrores.fechaFin = 'Indica el fin del rango.'
    else if (fechaInicio && fechaFin < fechaInicio)
      nuevosErrores.fechaFin = 'Debe ser igual o posterior a la fecha de inicio.'
    if (
      equipo &&
      fechaInicio &&
      fechaFin >= fechaInicio &&
      diasEntre(fechaInicio, fechaFin) > equipo.condicionesPrestamo.duracionMaximaDias
    )
      nuevosErrores.fechaFin = `El máximo para este equipo es de ${equipo.condicionesPrestamo.duracionMaximaDias} días.`
    if (motivo.trim().length < 10 || motivo.trim().length > 300)
      nuevosErrores.motivo = 'Escribe entre 10 y 300 caracteres.'

    setErrores(nuevosErrores)
    setErrorOperacion('')
    if (Object.keys(nuevosErrores).length) return

    setGuardando(true)
    const resultado = await crearReserva({
      equipoId: equipoIdActual,
      fechaInicio,
      fechaFin,
      motivo,
    })
    setGuardando(false)
    if (!resultado.ok) {
      setErrorOperacion(resultado.error)
      return
    }
    setMotivo('')
    setErrores({})
    const inicio = new Date(`${fechaInicio}T12:00:00`)
    setMes(new Date(inicio.getFullYear(), inicio.getMonth(), 1))
  }

  return (
    <div className="vista-reservas">
      <div className="cabecera-vista">
        <div>
          <h1>Reserva anticipada</h1>
          <p className="sub">Consulta la ocupación y reserva un equipo para fechas futuras.</p>
        </div>
      </div>
      <NavegacionReservas />
      {error && <div className="aviso aviso--error reservas-error">{error}</div>}

      <div className="reservas-columnas">
        <section className="panel reservas-calendario" aria-label="Calendario de ocupación">
          <div className="reservas-seccion-cabecera">
            <div>
              <h2>Ocupación por equipo</h2>
              <p className="suave sm">El préstamo vigente sin fechas registradas se muestra como ocupado.</p>
            </div>
            <div className="reservas-mes">
              <button
                type="button"
                className="boton boton--neutro boton--sm"
                onClick={() => cambiarMes(-1)}
                aria-label="Mes anterior"
              >
                ‹
              </button>
              <strong>{FORMATO_MES.format(mes)}</strong>
              <button
                type="button"
                className="boton boton--neutro boton--sm"
                onClick={() => cambiarMes(1)}
                aria-label="Mes siguiente"
              >
                ›
              </button>
            </div>
          </div>

          <div className="reservas-filtro-equipo">
            <Campo
              id="equipo-calendario"
              rotulo="Equipo"
              error={errores.equipo}
              ayuda="Solo se muestran equipos publicados en el catálogo."
            >
              <select
                {...atributosControl('equipo-calendario', {
                  error: errores.equipo,
                  ayuda: 'Solo se muestran equipos publicados en el catálogo.',
                })}
                value={equipoIdActual}
                onChange={(evento) => setEquipoId(evento.target.value)}
                disabled={cargando || equipos.length === 0}
              >
                {equipos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          {cargando ? (
            <Cargando filas={5} etiqueta="Cargando el calendario de ocupación…" />
          ) : equipos.length === 0 ? (
            <EstadoVacio
              marca="□"
              titulo="No hay equipos para reservar"
              descripcion="Cuando haya equipos publicados en el catálogo, aparecerán aquí."
            />
          ) : (
            <>
              <div className="calendario-reservas">
                {DIAS_SEMANA.map((dia) => (
                  <div className="calendario-dia-semana" key={dia}>
                    {dia}
                  </div>
                ))}
                {dias.map(({ fecha, dia }) => {
                  const ocupacion = estadoOcupacion(unidades, ocupacionesDelEquipo, fecha)
                  const dentroMes = dia.getMonth() === mes.getMonth()
                  return (
                    <div
                      className={[
                        'calendario-celda',
                        !dentroMes && 'calendario-celda--fuera',
                        fecha < fechaLocal() && 'calendario-celda--pasada',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      key={fecha}
                      aria-label={`${fecha}: ${ocupacion.libres} libres, ${ocupacion.reservadas} reservadas, ${ocupacion.prestadas} prestadas`}
                    >
                      <span className="calendario-numero">{dia.getDate()}</span>
                      <span className="calendario-estados">
                        {ocupacion.libres > 0 && (
                          <span className="ocupacion ocupacion--libre">{ocupacion.libres} libres</span>
                        )}
                        {ocupacion.reservadas > 0 && (
                          <span className="ocupacion ocupacion--reservada">
                            {ocupacion.reservadas} reserv.
                          </span>
                        )}
                        {ocupacion.prestadas > 0 && (
                          <span className="ocupacion ocupacion--prestada">
                            {ocupacion.prestadas} prest.
                          </span>
                        )}
                        {ocupacion.libres + ocupacion.reservadas + ocupacion.prestadas === 0 && (
                          <span className="ocupacion ocupacion--sin-unidades">Sin unidades</span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="reservas-leyenda" aria-label="Estados de ocupación">
                <span><i className="leyenda-punto leyenda-punto--libre" /> Libre</span>
                <span><i className="leyenda-punto leyenda-punto--reservada" /> Reservado</span>
                <span><i className="leyenda-punto leyenda-punto--prestada" /> Prestado</span>
              </div>
            </>
          )}
        </section>

        <section className="panel panel-cuerpo reservas-formulario">
          <h2>Solicitar reserva</h2>
          <p className="prosa sm reservas-intro">
            La reserva ocupa una unidad disponible para el rango indicado. Si todas están comprometidas,
            ingresarás a la lista de espera.
          </p>
          {errorOperacion && <div className="aviso aviso--error">{errorOperacion}</div>}
          <form onSubmit={enviarReserva} noValidate>
            <Campo id="equipo-reserva" rotulo="Equipo" error={errores.equipo}>
              <select
                {...atributosControl('equipo-reserva', { error: errores.equipo })}
                value={equipoIdActual}
                onChange={(evento) => setEquipoId(evento.target.value)}
                disabled={cargando || equipos.length === 0}
                required
              >
                {equipos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <div className="campo-fila reservas-fechas">
              <Campo id="fecha-inicio" rotulo="Desde" error={errores.fechaInicio}>
                <input
                  {...atributosControl('fecha-inicio', { error: errores.fechaInicio })}
                  type="date"
                  min={manana}
                  value={fechaInicio}
                  onChange={(evento) => setFechaInicio(evento.target.value)}
                  required
                />
              </Campo>
              <Campo id="fecha-fin" rotulo="Hasta" error={errores.fechaFin}>
                <input
                  {...atributosControl('fecha-fin', { error: errores.fechaFin })}
                  type="date"
                  min={fechaInicio || manana}
                  value={fechaFin}
                  onChange={(evento) => setFechaFin(evento.target.value)}
                  required
                />
              </Campo>
            </div>
            <Campo
              id="motivo-reserva"
              rotulo="Motivo"
              error={errores.motivo}
              ayuda="Se incluirá en la solicitud de préstamo que se genere al acercarse la fecha."
            >
              <textarea
                {...atributosControl('motivo-reserva', {
                  error: errores.motivo,
                  ayuda: 'Se incluirá en la solicitud de préstamo que se genere al acercarse la fecha.',
                })}
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value)}
                maxLength={300}
                required
              />
            </Campo>
            {equipo && (
              <p className="reservas-limite">
                Duración máxima para este equipo: {equipo.condicionesPrestamo.duracionMaximaDias}{' '}
                {equipo.condicionesPrestamo.duracionMaximaDias === 1 ? 'día' : 'días'}.
              </p>
            )}
            <button
              type="submit"
              className="boton boton--bloque"
              disabled={guardando || cargando || !equipos.length || !usuario.id}
            >
              {guardando ? 'Guardando reserva…' : 'Solicitar reserva'}
            </button>
            {!usuario.id && (
              <p className="campo-error" role="alert">Inicia sesión para reservar un equipo.</p>
            )}
          </form>
        </section>
      </div>
    </div>
  )
}

const ESTADOS = {
  confirmada: 'Confirmada',
  en_espera: 'En lista de espera',
  convertida: 'Convertida en solicitud',
  cancelada: 'Cancelada',
}

export function EstadoReserva({ estado }) {
  return (
    <span className={`reserva-estado reserva-estado--${estado}`}>
      {ESTADOS[estado] ?? estado}
    </span>
  )
}

export function MisReservas() {
  const { reservas, equipos, cargando, error, cancelarReserva } = useReservas()
  const [filtro, setFiltro] = useState('todas')
  const [porCancelar, setPorCancelar] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const nombres = new Map(equipos.map((equipo) => [equipo.id, equipo.nombre]))
  const filtradas = reservas.filter((reserva) => filtro === 'todas' || reserva.estado === filtro)

  async function confirmarCancelacion() {
    setCancelando(true)
    const resultado = await cancelarReserva(porCancelar.id)
    setCancelando(false)
    if (resultado.ok) setPorCancelar(null)
  }

  return (
    <div className="vista-reservas">
      <div className="cabecera-vista">
        <div>
          <h1>Mis reservas</h1>
          <p className="sub">Consulta el estado de tus reservas y cancela las que aún no se han convertido.</p>
        </div>
      </div>
      <NavegacionReservas />
      {error && <div className="aviso aviso--error reservas-error">{error}</div>}
      <section className="panel reservas-lista-panel">
        <div className="reservas-lista-cabecera">
          <h2>Reservas registradas</h2>
          <label className="reservas-filtro-estado">
            <span className="rotulo">Estado</span>
            <select
              className="entrada"
              value={filtro}
              onChange={(evento) => setFiltro(evento.target.value)}
              aria-label="Filtrar reservas por estado"
            >
              <option value="todas">Todos los estados</option>
              <option value="confirmada">Confirmadas</option>
              <option value="en_espera">En lista de espera</option>
              <option value="convertida">Convertidas en solicitud</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </label>
        </div>
        {cargando ? (
          <Cargando filas={3} etiqueta="Cargando tus reservas…" />
        ) : filtradas.length === 0 ? (
          <EstadoVacio
            marca="□"
            titulo={filtro === 'todas' ? 'Todavía no tienes reservas' : 'No hay reservas con este estado'}
            descripcion="Las reservas que solicites aparecerán aquí."
          />
        ) : (
          <ul className="reservas-lista">
            {filtradas.map((reserva) => (
              <li className="reserva-tarjeta" key={reserva.id}>
                <div className="reserva-tarjeta-cabecera">
                  <div>
                    <p className="reserva-equipo">
                      {nombres.get(reserva.equipoId) ?? `Equipo ${reserva.equipoId}`}
                    </p>
                    <span className="codigo">{reserva.id}</span>
                  </div>
                  <EstadoReserva estado={reserva.estado} />
                </div>
                <p className="reserva-fechas">
                  {fechaBonita(reserva.fechaInicio)} – {fechaBonita(reserva.fechaFin)}
                </p>
                <p className="reserva-motivo">{reserva.motivo}</p>
                {reserva.solicitudId && (
                  <p className="reserva-solicitud">
                    Solicitud generada: <span className="codigo">{reserva.solicitudId}</span>
                  </p>
                )}
                {['confirmada', 'en_espera'].includes(reserva.estado) && (
                  <button
                    type="button"
                    className="boton boton--texto accion--peligro"
                    onClick={() => setPorCancelar(reserva)}
                  >
                    Cancelar reserva
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {porCancelar && (
        <Confirmacion
          titulo="Cancelar reserva"
          mensaje={`¿Quieres cancelar la reserva ${porCancelar.id}?`}
          detalle="Esta acción no se puede deshacer. Si hay alguien en espera para esas fechas, se le asignará la unidad liberada."
          textoConfirmar="Cancelar reserva"
          trabajando={cancelando}
          alConfirmar={confirmarCancelacion}
          alCerrar={() => setPorCancelar(null)}
        />
      )}
    </div>
  )
}

export function ListaEspera() {
  const { listaEspera, equipos, cargando, error } = useReservas()
  const nombres = new Map(equipos.map((equipo) => [equipo.id, equipo.nombre]))

  return (
    <div className="vista-reservas">
      <div className="cabecera-vista">
        <div>
          <h1>Lista de espera</h1>
          <p className="sub">Tus solicitudes se ordenan por fecha de ingreso entre rangos que se cruzan.</p>
        </div>
      </div>
      <NavegacionReservas />
      {error && <div className="aviso aviso--error reservas-error">{error}</div>}
      <section className="panel reservas-lista-panel" aria-label="Reservas en lista de espera">
        {cargando ? (
          <Cargando filas={3} etiqueta="Cargando la lista de espera…" />
        ) : listaEspera.length === 0 ? (
          <EstadoVacio
            marca="□"
            titulo="No estás en una lista de espera"
            descripcion="Si todas las unidades están comprometidas, puedes solicitar una reserva y entrarás aquí automáticamente."
          />
        ) : (
          <ol className="espera-lista">
            {listaEspera.map((reserva) => (
              <li className="reserva-tarjeta espera-tarjeta" key={reserva.id}>
                <span className="espera-posicion" aria-label={`Puesto ${reserva.posicion}`}>
                  {reserva.posicion}
                </span>
                <div className="espera-contenido">
                  <div className="reserva-tarjeta-cabecera">
                    <div>
                      <p className="reserva-equipo">
                        {nombres.get(reserva.equipoId) ?? `Equipo ${reserva.equipoId}`}
                      </p>
                      <span className="codigo">{reserva.id}</span>
                    </div>
                    <EstadoReserva estado={reserva.estado} />
                  </div>
                  <p className="reserva-fechas">
                    {fechaBonita(reserva.fechaInicio)} – {fechaBonita(reserva.fechaFin)}
                  </p>
                  <p className="reserva-motivo">{reserva.motivo}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
