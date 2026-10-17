import { useSesion } from '../../context/SesionContext.jsx'
import { MarcoEncargado } from './MarcoEncargado.jsx'
import { MarcoEstudiante } from './MarcoEstudiante.jsx'
import { MarcoPublico } from './MarcoPublico.jsx'

/** El marco depende de quién entra: panel del encargado, barra del estudiante o pública. */
export function MarcoSegunRol({ children }) {
  const { esEncargado, esEstudiante } = useSesion()
  if (esEncargado) return <MarcoEncargado>{children}</MarcoEncargado>
  if (esEstudiante) return <MarcoEstudiante>{children}</MarcoEstudiante>
  return <MarcoPublico>{children}</MarcoPublico>
}
