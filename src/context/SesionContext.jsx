/**
 * Sesión y rol.
 *
 * La autenticación es de la HU-1 (Cuenta y acceso). Aquí solo se expone el usuario
 * en sesión y su rol, con el mismo contrato que esa historia publicará. Cuando la
 * HU-1 esté lista, este archivo se reemplaza por su Context y el resto de las historias
 * no cambia, porque consumen únicamente `usuario`, `rol`, `esEncargado` y `esEstudiante`.
 *
 * La deuda pendiente es de la HU-5. Mientras no esté, viaja en el usuario simulado.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const SesionContext = createContext(null)

const ENCARGADO = {
  id: 'US-101',
  nombres: 'Elena',
  apellidos: 'Rivas',
  correo: 'erivas@ulima.edu.pe',
  rol: 'encargado',
  almacenAsignado: 'Almacén H-102',
}

const ESTUDIANTE = {
  id: 'US-201',
  nombres: 'Renzo',
  apellidos: 'Mendoza',
  correo: 'rmendoza@ulima.edu.pe',
  rol: 'estudiante',
  carrera: 'Ingeniería Electrónica',
  ciclo: 6,
  deudaPendiente: 0,
}

const ESTUDIANTE_CON_DEUDA = {
  id: 'US-206',
  nombres: 'Lucía',
  apellidos: 'Paredes',
  correo: 'lparedes@ulima.edu.pe',
  rol: 'estudiante',
  carrera: 'Ingeniería de Sistemas',
  ciclo: 8,
  deudaPendiente: 45,
}

const VISITANTE = { id: null, rol: 'visitante' }

/** Perfiles de la demo. La HU-1 los reemplaza por el inicio de sesión real. */
export const PERFILES_DEMO = [
  { valor: 'encargado', etiqueta: 'Encargado', usuario: ENCARGADO },
  { valor: 'estudiante', etiqueta: 'Estudiante', usuario: ESTUDIANTE },
  { valor: 'estudiante-deuda', etiqueta: 'Estudiante con deuda', usuario: ESTUDIANTE_CON_DEUDA },
  { valor: 'visitante', etiqueta: 'Visitante', usuario: VISITANTE },
]

const CLAVE_PERFIL = 'demo.perfil'

function perfilGuardado() {
  try {
    const valor = sessionStorage.getItem(CLAVE_PERFIL)
    return PERFILES_DEMO.some((p) => p.valor === valor) ? valor : 'encargado'
  } catch {
    return 'encargado'
  }
}

export function SesionProvider({ children }) {
  // El perfil de la demo se recuerda mientras la pestaña siga abierta.
  const [perfil, setPerfil] = useState(perfilGuardado)
  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE_PERFIL, perfil)
    } catch {
      // sin sessionStorage la demo igual funciona; solo no recuerda el perfil
    }
  }, [perfil])
  const usuario = PERFILES_DEMO.find((p) => p.valor === perfil)?.usuario ?? ENCARGADO

  const valor = useMemo(() => {
    const nombreCorto = usuario.nombres ? `${usuario.nombres} ${usuario.apellidos}` : 'Visitante'
    return {
      usuario,
      rol: usuario.rol,
      esEncargado: usuario.rol === 'encargado',
      esEstudiante: usuario.rol === 'estudiante',
      perfilDemo: perfil,
      nombreCorto,
      iniciales: usuario.nombres
        ? `${usuario.nombres[0]}${usuario.apellidos[0]}`.toUpperCase()
        : '··',
      almacen: usuario.almacenAsignado ?? 'Almacén H-102',
      // Solo para la demo de la primera entrega: permite ver la app sin sesión y
      // comprobar la protección de rutas sin depender del login de la HU-1.
      cambiarRolDemo: (valor) =>
        setPerfil(PERFILES_DEMO.some((p) => p.valor === valor) ? valor : 'visitante'),
    }
  }, [usuario, perfil])

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}

export function useSesion() {
  const contexto = useContext(SesionContext)
  if (!contexto) throw new Error('useSesion debe usarse dentro de SesionProvider.')
  return contexto
}
