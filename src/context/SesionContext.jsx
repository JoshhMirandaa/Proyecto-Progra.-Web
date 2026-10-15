/**
 * Sesión y rol.
 *
 * La autenticación es de la HU-1 (Cuenta y acceso). Aquí solo se expone el usuario
 * en sesión y su rol, con el mismo contrato que esa historia publicará. Cuando la
 * HU-1 esté lista, este archivo se reemplaza por su Context y el resto de la HU-2
 * no cambia, porque consume únicamente `usuario`, `rol` y `esEncargado`.
 */
import { createContext, useContext, useMemo, useState } from 'react'

const SesionContext = createContext(null)

const ENCARGADO = {
  id: 'US-101',
  nombres: 'Elena',
  apellidos: 'Rivas',
  correo: 'erivas@ulima.edu.pe',
  rol: 'encargado',
  almacenAsignado: 'Almacén H-102',
}

const VISITANTE = { id: null, rol: 'visitante' }

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(ENCARGADO)

  const valor = useMemo(() => {
    const nombreCorto = usuario.nombres ? `${usuario.nombres} ${usuario.apellidos}` : 'Visitante'
    return {
      usuario,
      rol: usuario.rol,
      esEncargado: usuario.rol === 'encargado',
      nombreCorto,
      iniciales: usuario.nombres
        ? `${usuario.nombres[0]}${usuario.apellidos[0]}`.toUpperCase()
        : '··',
      almacen: usuario.almacenAsignado ?? 'Almacén H-102',
      // Solo para la demo de la primera entrega: permite ver la app sin sesión y
      // comprobar la protección de rutas sin depender del login de la HU-1.
      cambiarRolDemo: (rol) => setUsuario(rol === 'encargado' ? ENCARGADO : VISITANTE),
    }
  }, [usuario])

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}

export function useSesion() {
  const contexto = useContext(SesionContext)
  if (!contexto) throw new Error('useSesion debe usarse dentro de SesionProvider.')
  return contexto
}
