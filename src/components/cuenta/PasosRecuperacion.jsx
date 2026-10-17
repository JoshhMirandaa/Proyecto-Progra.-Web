/** Indicador de los tres pasos de la recuperación de contraseña (mockup 1.5). */
export function PasosRecuperacion({ paso }) {
  return (
    <ol className="pasos-recuperacion" aria-label={`Paso ${paso} de 3`}>
      {[1, 2, 3].map((n) => (
        <li
          key={n}
          aria-current={n === paso ? 'step' : undefined}
          data-hecho={n < paso || undefined}
        >
          {n}
        </li>
      ))}
    </ol>
  )
}
