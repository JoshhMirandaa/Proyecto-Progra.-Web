import { useMemo } from 'react'
import { LIMITES, etiquetaEstado, transicionesDe } from '../../domain/catalogos.js'
import { validarCambioEstado } from '../../domain/validaciones.js'
import { useFormulario } from '../../hooks/useFormulario.js'
import { Campo, atributosControl, clases } from '../ui/Campo.jsx'
import { Modal } from '../ui/Modal.jsx'

/** Vista 2.4 — Cambio de estado de una unidad, con motivo obligatorio. */
export function ModalCambioEstado({ unidad, equipo, alGuardar, alCerrar }) {
  const destinos = transicionesDe(unidad.estado)

  const validar = useMemo(
    () => (valores) =>
      validarCambioEstado({
        estadoActual: unidad.estado,
        estadoNuevo: valores.estadoNuevo,
        motivo: valores.motivo,
      }),
    [unidad.estado],
  )

  const { valores, errorDe, ponerValor, tocar, enviar, enviando } = useFormulario({
    inicial: { estadoNuevo: destinos[0] ?? '', motivo: '' },
    validar,
  })

  const comprometida = unidad.estado === 'prestada' && unidad.prestamoVigente

  return (
    <Modal
      titulo="Cambiar estado de la unidad"
      alCerrar={alCerrar}
      ancho="620px"
    >
      <p className="modal-sub codigo">
        {unidad.codigoInventario} · {equipo.nombre}
      </p>

      {destinos.length === 0 ? (
        <>
          <div className="aviso aviso--atencion" style={{ marginTop: '1.25rem' }}>
            Una unidad dada de baja no admite más cambios de estado. Si vuelve a servicio, regístrala
            como una unidad nueva con su propio código.
          </div>
          <div className="modal-acciones">
            <button type="button" className="boton boton--neutro" onClick={alCerrar}>
              Cerrar
            </button>
          </div>
        </>
      ) : (
        <form
          onSubmit={enviar(async (datos) => {
            const resultado = await alGuardar(datos)
            if (resultado?.ok) alCerrar()
          })}
          noValidate
          style={{ marginTop: '1.25rem' }}
        >
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="rotulo campo-rotulo">Nuevo estado</legend>
            <div className="segmentos">
              {destinos.map((destino) => (
                <label
                  key={destino}
                  className={clases('segmento', valores.estadoNuevo === destino && 'segmento--activo')}
                  data-estado={destino}
                >
                  <input
                    type="radio"
                    name="estadoNuevo"
                    value={destino}
                    checked={valores.estadoNuevo === destino}
                    onChange={(e) => ponerValor('estadoNuevo', e.target.value)}
                  />
                  <span>{etiquetaEstado(destino)}</span>
                </label>
              ))}
            </div>
            {errorDe('estadoNuevo') && (
              <span className="campo-error" role="alert">
                {errorDe('estadoNuevo')}
              </span>
            )}
          </fieldset>

          <div style={{ marginTop: '1rem' }}>
            <Campo
              id="motivo"
              rotulo="Motivo del cambio"
              error={errorDe('motivo')}
              ayuda={`Queda registrado en el historial de la unidad. Entre ${LIMITES.motivo.min} y ${LIMITES.motivo.max} caracteres.`}
            >
              <input
                {...atributosControl('motivo', { error: errorDe('motivo'), ayuda: true })}
                value={valores.motivo}
                placeholder="Lente con hongos; enviada al servicio técnico autorizado."
                onChange={(e) => ponerValor('motivo', e.target.value)}
                onBlur={() => tocar('motivo')}
                maxLength={LIMITES.motivo.max}
              />
            </Campo>
          </div>

          {comprometida && (
            <div className="aviso aviso--atencion" style={{ marginTop: '1rem' }}>
              La unidad está comprometida en el préstamo{' '}
              <span className="codigo">{unidad.prestamoVigente}</span>. Al cambiar su estado, el
              préstamo deja de figurar como vigente en el inventario.
            </div>
          )}

          <div className="modal-acciones">
            <button type="button" className="boton boton--neutro" onClick={alCerrar} disabled={enviando}>
              Cancelar
            </button>
            <button type="submit" className="boton" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar estado'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
