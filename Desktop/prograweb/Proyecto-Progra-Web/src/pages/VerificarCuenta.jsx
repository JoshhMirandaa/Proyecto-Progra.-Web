import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Cargando, EstadoVacio } from '../components/ui/Piezas.jsx'
import { useSesion } from '../context/SesionContext.jsx'

/** Enlace de verificación que llega por correo después del registro (vista 1.3). */
export function VerificarCuenta() {
  const [parametros] = useSearchParams()
  const token = parametros.get('token') ?? ''
  const { verificarCuenta } = useSesion()
  const [resultado, setResultado] = useState({ token: null })

  useEffect(() => {
    let vigente = true
    verificarCuenta(token).then((r) => vigente && setResultado({ token, ...r }))
    return () => {
      vigente = false
    }
  }, [token, verificarCuenta])

  if (resultado.token !== token)
    return (
      <div className="tarjeta-acceso panel">
        <Cargando filas={3} etiqueta="Activando tu cuenta…" />
      </div>
    )

  return (
    <div className="tarjeta-acceso panel">
      {resultado.ok ? (
        <EstadoVacio
          marca="✓"
          titulo="Tu cuenta está activa"
          descripcion={`Ya puedes iniciar sesión con ${resultado.usuario.correo}.`}
        >
          <Link to="/login" className="boton">
            Iniciar sesión
          </Link>
        </EstadoVacio>
      ) : (
        <EstadoVacio marca="!" titulo="No pudimos activar la cuenta" descripcion={resultado.error}>
          <Link to="/registro" className="boton boton--contorno">
            Volver al registro
          </Link>
        </EstadoVacio>
      )}
    </div>
  )
}
