import { useMemo } from 'react'
import { LIMITES, UBICACIONES } from '../../domain/catalogos.js'
import { validarUnidad } from '../../domain/validaciones.js'
import { useFormulario } from '../../hooks/useFormulario.js'
import { Campo, atributosControl } from '../ui/Campo.jsx'
import { Modal } from '../ui/Modal.jsx'

/** Alta y edición de una unidad (modal de la vista 2.3). */
export function ModalUnidad({ unidad, codigosOcupados, alGuardar, alCerrar }) {
  const esEdicion = Boolean(unidad)

  const ocupados = useMemo(
    () => codigosOcupados.filter((c) => c !== unidad?.codigoInventario),
    [codigosOcupados, unidad],
  )

  const validar = useMemo(
    () => (valores) => validarUnidad(valores, { codigosOcupados: ocupados }),
    [ocupados],
  )

  const { valores, errorDe, ponerValor, tocar, enviar, enviando } = useFormulario({
    inicial: {
      codigoInventario: unidad?.codigoInventario ?? '',
      ubicacion: unidad?.ubicacion ?? UBICACIONES[0],
      observaciones: unidad?.observaciones ?? '',
    },
    validar,
  })

  return (
    <Modal
      titulo={esEdicion ? 'Editar unidad' : 'Nueva unidad'}
      subtitulo={esEdicion ? undefined : 'La unidad se registra como disponible.'}
      alCerrar={alCerrar}
    >
      <form
        onSubmit={enviar(async (datos) => {
          const resultado = await alGuardar(datos)
          if (resultado?.ok) alCerrar()
        })}
        noValidate
        style={{ marginTop: '1.25rem' }}
      >
        <div className="campo-fila">
          <Campo
            id="codigoInventario"
            rotulo="Código de inventario"
            error={errorDe('codigoInventario')}
            ayuda="Formato INV-XXX-0000, único en el almacén."
          >
            <input
              {...atributosControl('codigoInventario', {
                error: errorDe('codigoInventario'),
                ayuda: true,
                mono: true,
              })}
              value={valores.codigoInventario}
              placeholder="INV-OSC-0047"
              onChange={(e) => ponerValor('codigoInventario', e.target.value.toUpperCase())}
              onBlur={() => tocar('codigoInventario')}
              maxLength={13}
            />
          </Campo>

          <Campo id="ubicacion" rotulo="Ubicación" error={errorDe('ubicacion')}>
            <select
              {...atributosControl('ubicacion', { error: errorDe('ubicacion') })}
              value={valores.ubicacion}
              onChange={(e) => ponerValor('ubicacion', e.target.value)}
              onBlur={() => tocar('ubicacion')}
            >
              {UBICACIONES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo
          id="observaciones"
          rotulo="Observaciones"
          opcional
          error={errorDe('observaciones')}
          ayuda={`Estado físico, faltantes o detalles de la unidad. Máximo ${LIMITES.observaciones.max} caracteres.`}
        >
          <textarea
            {...atributosControl('observaciones', { error: errorDe('observaciones'), ayuda: true })}
            value={valores.observaciones}
            onChange={(e) => ponerValor('observaciones', e.target.value)}
            onBlur={() => tocar('observaciones')}
            style={{ minHeight: '5rem' }}
          />
        </Campo>

        <div className="modal-acciones">
          <button type="button" className="boton boton--neutro" onClick={alCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar unidad'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
