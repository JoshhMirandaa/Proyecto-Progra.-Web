import { useState } from 'react'
import { LIMITES_DEVOLUCION } from '../../domain/devoluciones.js'
import { formatearFecha } from '../../domain/solicitudes.js'
import { leerImagenCuadrada } from '../../utils/imagen.js'
import { Campo, atributosControl } from '../ui/Campo.jsx'
import { Modal } from '../ui/Modal.jsx'

/**
 * Vista 5.2 — Registrar daños o faltantes. Es el paso siguiente cuando el retorno no es
 * «sin novedades». Comparte el formulario de la vista 5.1, así que recibe sus funciones.
 */
export function ModalDanos({ formulario, solicitud, efecto, enviando, alGuardar, alCerrar }) {
  const { valores, errorDe, ponerValor, tocar } = formulario
  const [errorFoto, setErrorFoto] = useState(null)
  const L = LIMITES_DEVOLUCION.descripcionDano
  const conDanos = valores.estadoRetorno === 'con_danos'
  const libres = efecto?.libresHoy ?? 0

  const alternarFaltante = (nombre, marcado) =>
    ponerValor(
      'faltantes',
      marcado ? [...valores.faltantes, nombre] : valores.faltantes.filter((f) => f !== nombre),
    )

  const elegirFoto = async (archivo) => {
    setErrorFoto(null)
    if (!archivo) return
    try {
      ponerValor('fotoDano', await leerImagenCuadrada(archivo))
    } catch (e) {
      setErrorFoto(e.message)
    }
  }

  return (
    <Modal
      titulo="Registrar daños o faltantes"
      subtitulo={`${solicitud.codigoPrestamo} · ${solicitud.equipoNombre} · ${solicitud.codigoUnidad}`}
      alCerrar={alCerrar}
      ancho="680px"
    >
      <form noValidate onSubmit={alGuardar} style={{ marginTop: '1rem' }}>
        <Campo
          id="descripcion-dano"
          rotulo={conDanos ? 'Descripción del daño' : 'Descripción'}
          opcional={!conDanos}
          error={errorDe('descripcionDano')}
          ayuda={`${valores.descripcionDano.trim().length}/${L.max}`}
        >
          <textarea
            {...atributosControl('descripcion-dano', {
              error: errorDe('descripcionDano'),
              ayuda: true,
            })}
            rows={3}
            maxLength={L.max + 20}
            value={valores.descripcionDano}
            placeholder="Ej.: Superficie activa con rayadura profunda en la esquina inferior derecha."
            onChange={(e) => ponerValor('descripcionDano', e.target.value)}
            onBlur={() => tocar('descripcionDano')}
          />
        </Campo>

        <div className="rejilla-danos">
          <fieldset className="grupo-casillas">
            <legend className="rotulo campo-rotulo">Accesorios faltantes</legend>
            {valores.accesorios.length === 0 ? (
              <p className="sm suave">El préstamo no incluía accesorios.</p>
            ) : (
              valores.accesorios.map((a) => (
                <label key={a.nombre} className="opcion">
                  <input
                    type="checkbox"
                    checked={valores.faltantes.includes(a.nombre)}
                    onChange={(e) => alternarFaltante(a.nombre, e.target.checked)}
                  />
                  <span>{a.nombre}</span>
                </label>
              ))
            )}
            {errorDe('faltantes') && (
              <span className="campo-error" role="alert">
                {errorDe('faltantes')}
              </span>
            )}
          </fieldset>

          <div className="campo">
            <span className="rotulo campo-rotulo">
              Fotografía del daño <span className="campo-opcional">opcional</span>
            </span>
            {valores.fotoDano ? (
              <div className="foto-dano">
                <img src={valores.fotoDano} alt="Fotografía del daño" />
                <button
                  type="button"
                  className="boton boton--texto texto-peligro"
                  onClick={() => ponerValor('fotoDano', null)}
                >
                  Quitar
                </button>
              </div>
            ) : (
              <label className="soltar soltar--sola">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="oculto-visual"
                  onChange={(e) => elegirFoto(e.target.files?.[0])}
                />
                <span>Elegir fotografía</span>
              </label>
            )}
            {errorFoto && (
              <span className="campo-error" role="alert">
                {errorFoto}
              </span>
            )}
          </div>
        </div>

        <label className="opcion opcion--larga">
          <input
            type="checkbox"
            checked={valores.derivarMantenimiento}
            onChange={(e) => ponerValor('derivarMantenimiento', e.target.checked)}
          />
          <span>Derivar la unidad a mantenimiento</span>
        </label>

        <div className="aviso aviso--atencion" style={{ marginTop: '0.75rem' }}>
          <strong>Efecto sobre el inventario.</strong>{' '}
          {valores.derivarMantenimiento ? (
            <>
              La unidad {solicitud.codigoUnidad} pasará a «En mantenimiento» y el equipo seguirá con{' '}
              {libres} {libres === 1 ? 'unidad libre' : 'unidades libres'} (en vez de {libres + 1}).
            </>
          ) : (
            <>
              La unidad {solicitud.codigoUnidad} vuelve a «Disponible» y el equipo pasa a{' '}
              {libres + 1} {libres + 1 === 1 ? 'unidad libre' : 'unidades libres'}.
            </>
          )}
          {valores.derivarMantenimiento && efecto?.comprometidas.length > 0 && (
            <>
              {' '}
              Hay {efecto.comprometidas.length}{' '}
              {efecto.comprometidas.length === 1
                ? 'préstamo o reserva de esta unidad'
                : 'préstamos o reservas de esta unidad'}{' '}
              desde el {formatearFecha(efecto.comprometidas[0].fechaInicio)} que deberá reasignarse.
            </>
          )}
        </div>

        <div className="modal-acciones">
          <button
            type="button"
            className="boton boton--neutro"
            onClick={alCerrar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar y cerrar devolución'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
