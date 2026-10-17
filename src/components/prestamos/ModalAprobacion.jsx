import { useEffect, useMemo, useState } from 'react'
import { formatearSoles } from '../../domain/catalogos.js'
import { validarAprobacion } from '../../domain/prestamos.js'
import { duracionDias, formatearFecha, formatearFechaCorta } from '../../domain/solicitudes.js'
import { useFormulario } from '../../hooks/useFormulario.js'
import { usePrestamos } from '../../context/PrestamosContext.jsx'
import { clases } from '../ui/Campo.jsx'
import { Modal } from '../ui/Modal.jsx'
import { Cargando } from '../ui/Piezas.jsx'
import { ResumenSolicitud } from './ResumenSolicitud.jsx'

/**
 * Vista 4.2 — Aprobar una solicitud asignando una unidad libre en todo el rango.
 * Si no queda ninguna, ofrece proponer el próximo rango libre (se rechaza con ese texto).
 */
export function ModalAprobacion({ solicitudId, alCerrar, alProponer }) {
  const { obtenerOpcionesAprobacion, aprobarSolicitud } = usePrestamos()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerOpcionesAprobacion(solicitudId)
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [solicitudId, obtenerOpcionesAprobacion])

  return (
    <Modal
      titulo="Aprobar solicitud"
      subtitulo={`Solicitud ${solicitudId}`}
      alCerrar={alCerrar}
      ancho="640px"
    >
      {error ? (
        <>
          <div className="aviso aviso--error" style={{ marginTop: '1rem' }}>
            {error}
          </div>
          <div className="modal-acciones">
            <button type="button" className="boton boton--neutro" onClick={alCerrar}>
              Cerrar
            </button>
          </div>
        </>
      ) : !datos ? (
        <Cargando filas={4} etiqueta="Buscando unidades libres…" />
      ) : (
        <FormularioAprobacion
          datos={datos}
          alCerrar={alCerrar}
          alProponer={alProponer}
          alAprobar={(valores) => aprobarSolicitud(solicitudId, valores)}
        />
      )}
    </Modal>
  )
}

function FormularioAprobacion({ datos, alCerrar, alProponer, alAprobar }) {
  const { solicitud: s, unidadesLibres, proximoRango, requiereAutorizacion } = datos
  const validar = useMemo(
    () => (valores) => validarAprobacion(valores, { requiereAutorizacion }),
    [requiereAutorizacion],
  )
  const { valores, errorDe, ponerValor, enviar, enviando } = useFormulario({
    inicial: { unidadId: unidadesLibres[0]?.id ?? '', autorizacionVerificada: false },
    validar,
  })
  const dias = duracionDias(s.fechaInicio, s.fechaFin)

  return (
    <form
      noValidate
      onSubmit={enviar(async (v) => {
        const r = await alAprobar(v)
        if (r.ok) alCerrar()
      })}
      style={{ marginTop: '1rem' }}
    >
      <ResumenSolicitud solicitud={s} />

      {s.deudaEstudiante > 0 && (
        <div className="aviso aviso--atencion" style={{ marginTop: '1rem' }}>
          {s.estudianteNombre} tiene {formatearSoles(s.deudaEstudiante)} en penalidades pendientes.
          Puedes aprobar, pero conviene recordárselo al entregar.
        </div>
      )}

      {unidadesLibres.length === 0 ? (
        <div className="aviso aviso--error" style={{ marginTop: '1rem' }}>
          <p>
            No queda ninguna unidad libre del {formatearFechaCorta(s.fechaInicio)} al{' '}
            {formatearFecha(s.fechaFin)}.
          </p>
          {proximoRango ? (
            <p style={{ marginTop: '0.5rem' }}>
              El próximo rango libre de {dias} {dias === 1 ? 'día' : 'días'} es del{' '}
              <strong>
                {formatearFechaCorta(proximoRango.inicio)} al {formatearFecha(proximoRango.fin)}
              </strong>
              .
            </p>
          ) : (
            <p style={{ marginTop: '0.5rem' }}>
              No hay un rango libre parecido en los próximos días.
            </p>
          )}
        </div>
      ) : (
        <fieldset className="unidades-aprobacion">
          <legend className="rotulo campo-rotulo">Unidad que se asignará</legend>
          <p className="campo-ayuda" style={{ marginTop: 0 }}>
            Solo aparecen las unidades libres en todo el rango ({unidadesLibres.length}{' '}
            {unidadesLibres.length === 1 ? 'libre' : 'libres'}).
          </p>
          <div className="lista-opciones-unidad" role="radiogroup">
            {unidadesLibres.map((u) => (
              <label
                key={u.id}
                className={clases(
                  'opcion-unidad',
                  valores.unidadId === u.id && 'opcion-unidad--activa',
                )}
              >
                <input
                  type="radio"
                  name="unidadId"
                  value={u.id}
                  checked={valores.unidadId === u.id}
                  onChange={() => ponerValor('unidadId', u.id)}
                />
                <span className="codigo">{u.codigoInventario}</span>
                <span className="suave sm">{u.ubicacion}</span>
              </label>
            ))}
          </div>
          {errorDe('unidadId') && (
            <span className="campo-error" role="alert">
              {errorDe('unidadId')}
            </span>
          )}
        </fieldset>
      )}

      {requiereAutorizacion && unidadesLibres.length > 0 && (
        <div className="campo" style={{ marginTop: '1rem' }}>
          <label className="opcion opcion--larga" style={{ marginTop: 0 }}>
            <input
              type="checkbox"
              checked={valores.autorizacionVerificada}
              onChange={(e) => ponerValor('autorizacionVerificada', e.target.checked)}
              aria-invalid={errorDe('autorizacionVerificada') ? true : undefined}
            />
            <span>
              Verifiqué la autorización de {s.cursoDocente || 'el docente del curso'} para este
              equipo.
            </span>
          </label>
          {errorDe('autorizacionVerificada') && (
            <span className="campo-error" role="alert">
              {errorDe('autorizacionVerificada')}
            </span>
          )}
        </div>
      )}

      <div className="modal-acciones">
        <button
          type="button"
          className="boton boton--neutro"
          onClick={alCerrar}
          disabled={enviando}
        >
          Cancelar
        </button>
        {unidadesLibres.length === 0 ? (
          proximoRango && (
            <button type="button" className="boton" onClick={() => alProponer(s, proximoRango)}>
              Proponer del {formatearFechaCorta(proximoRango.inicio)} al{' '}
              {formatearFechaCorta(proximoRango.fin)}
            </button>
          )
        ) : (
          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Aprobando…' : 'Aprobar y asignar unidad'}
          </button>
        )}
      </div>
    </form>
  )
}
