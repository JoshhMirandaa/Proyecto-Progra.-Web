export const clases = (...valores) => valores.filter(Boolean).join(' ')

/**
 * Envoltura de un campo de formulario: rótulo, control, ayuda y error.
 * El error se muestra junto al campo, como pide el requerimiento no funcional.
 */
export function Campo({ id, rotulo, opcional = false, error, ayuda, children }) {
  return (
    <div className="campo">
      <label className="rotulo campo-rotulo" htmlFor={id}>
        {rotulo}
        {opcional && <span className="campo-opcional">opcional</span>}
      </label>
      {children}
      {error ? (
        <span className="campo-error" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : ayuda ? (
        <p className="campo-ayuda" id={`${id}-ayuda`}>
          {ayuda}
        </p>
      ) : null}
    </div>
  )
}

/** Atributos comunes de accesibilidad para el control de un campo. */
export function atributosControl(id, { error, ayuda, mono = false } = {}) {
  return {
    id,
    className: clases('entrada', mono && 'entrada--mono', error && 'entrada--error'),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined,
  }
}
