import { LIMITES, frasePreviaCondiciones } from '../../domain/catalogos.js'
import { validarCondiciones } from '../../domain/validaciones.js'
import { useFormulario } from '../../hooks/useFormulario.js'
import { Campo, atributosControl } from '../ui/Campo.jsx'

/** Vista 2.5 — Condiciones del préstamo del equipo, con vista previa para el estudiante. */
export function PanelCondiciones({ equipo, alGuardar }) {
  const { valores, errorDe, ponerValor, tocar, enviar, enviando, reiniciar } = useFormulario({
    inicial: equipo.condicionesPrestamo,
    validar: validarCondiciones,
  })

  return (
    <section className="panel">
      <form className="panel-cuerpo" onSubmit={enviar(alGuardar)} noValidate>
        <div className="bloque-rotulo">
          <h2 className="panel-titulo">Condiciones del préstamo</h2>
          <p className="sm suave">Se aplican a todas las unidades de este equipo.</p>
        </div>

        <div className="rejilla-formulario">
          <div>
            <Campo id="duracionMaximaDias" rotulo="Duración máxima" error={errorDe('duracionMaximaDias')}>
              <div className="campo-con-unidad">
                <input
                  {...atributosControl('duracionMaximaDias', { error: errorDe('duracionMaximaDias') })}
                  type="number"
                  inputMode="numeric"
                  min={LIMITES.duracionMaximaDias.min}
                  max={LIMITES.duracionMaximaDias.max}
                  value={valores.duracionMaximaDias}
                  onChange={(e) => ponerValor('duracionMaximaDias', e.target.value)}
                  onBlur={() => tocar('duracionMaximaDias')}
                />
                <span className="medio sm">días calendario</span>
              </div>
            </Campo>

            <div className="campo" style={{ display: 'grid', gap: '0.75rem' }}>
              <label className="interruptor">
                <input
                  type="checkbox"
                  checked={valores.requiereAutorizacion}
                  onChange={(e) => ponerValor('requiereAutorizacion', e.target.checked)}
                />
                <span className="interruptor-pista" aria-hidden="true" />
                <span className="interruptor-texto">Requiere autorización del docente</span>
              </label>

              <label className="interruptor">
                <input
                  type="checkbox"
                  checked={valores.admiteRenovacion}
                  onChange={(e) => ponerValor('admiteRenovacion', e.target.checked)}
                />
                <span className="interruptor-pista" aria-hidden="true" />
                <span className="interruptor-texto">Admite renovación</span>
              </label>
            </div>

            <Campo
              id="penalidadPorDia"
              rotulo="Penalidad por día"
              error={errorDe('penalidadPorDia')}
              ayuda="Usa 0 si el retraso no genera penalidad."
            >
              <div className="campo-con-unidad">
                <span className="codigo medio">S/</span>
                <input
                  {...atributosControl('penalidadPorDia', {
                    error: errorDe('penalidadPorDia'),
                    ayuda: true,
                    mono: true,
                  })}
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min={LIMITES.penalidadPorDia.min}
                  max={LIMITES.penalidadPorDia.max}
                  value={valores.penalidadPorDia}
                  onChange={(e) => ponerValor('penalidadPorDia', e.target.value)}
                  onBlur={() => tocar('penalidadPorDia')}
                />
              </div>
            </Campo>
          </div>

          <div>
            <span className="rotulo campo-rotulo">Vista previa para el estudiante</span>
            <div className="recuadro">
              <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Condiciones de este equipo</p>
              <p className="sm medio">{frasePreviaCondiciones(valores)}</p>
            </div>
          </div>
        </div>

        <div className="fila-fin" style={{ marginTop: '1.5rem' }}>
          <button
            type="button"
            className="boton boton--neutro"
            onClick={() => reiniciar(equipo.condicionesPrestamo)}
            disabled={enviando}
          >
            Descartar
          </button>
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar condiciones'}
          </button>
        </div>
      </form>
    </section>
  )
}
