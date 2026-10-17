import { useNavigate } from 'react-router-dom'
import { PERFILES_DEMO, useSesion } from '../../context/SesionContext.jsx'

const INICIO = { encargado: '/inventario', estudiante: '/catalogo', visitante: '/catalogo' }

/**
 * Solo para la demo de la primera entrega: cambia el usuario simulado sin depender del
 * inicio de sesión de la HU-1. Cuando la HU-1 esté lista, este selector se retira.
 */
export function SelectorPerfilDemo() {
  const { perfilDemo, cambiarRolDemo } = useSesion()
  const navegar = useNavigate()

  const cambiar = (valor) => {
    cambiarRolDemo(valor)
    const rol = PERFILES_DEMO.find((p) => p.valor === valor)?.usuario.rol ?? 'visitante'
    navegar(INICIO[rol])
  }

  return (
    <label
      className="selector-demo"
      title="Solo para la demo: la HU-1 reemplaza esto por el inicio de sesión"
    >
      <span>Ver como</span>
      <select value={perfilDemo} onChange={(e) => cambiar(e.target.value)}>
        {PERFILES_DEMO.map((p) => (
          <option key={p.valor} value={p.valor}>
            {p.etiqueta}
          </option>
        ))}
      </select>
    </label>
  )
}
